import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RegisterBody {
  fullName:     string
  email:        string
  password:     string
  phone?:       string
  dateOfBirth?: string
  sex?:         'male' | 'female' | 'other'
  clinicId:     string
}

// POST /api/patient/register
// Self-service patient sign-up: creates an auth user, a patients row, and the
// patient_profiles link, using the service role to bypass RLS (a brand-new
// user has no staff_profiles association, so auth_clinic_id() would be NULL).
export async function POST(req: NextRequest) {
  let createdUserId: string | null = null

  try {
    const body = await req.json() as RegisterBody
    const { fullName, email, password, phone, dateOfBirth, sex, clinicId } = body

    if (!fullName?.trim() || !email?.trim() || !password || !clinicId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify the clinic exists
    const { data: clinic } = await admin
      .from('clinics')
      .select('id')
      .eq('id', clinicId)
      .single()
    if (!clinic) {
      return NextResponse.json({ error: 'Selected clinic was not found' }, { status: 400 })
    }

    // 1. Create the auth user, pre-confirmed (no email verification step)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (authError || !authData.user) {
      const message = authError?.message?.includes('already been registered')
        ? 'An account with this email already exists. Try signing in instead.'
        : (authError?.message || 'Registration failed')
      return NextResponse.json({ error: message }, { status: 400 })
    }
    createdUserId = authData.user.id

    // 2. Split full name into first/last for the patients table
    const parts = fullName.trim().split(/\s+/)
    const firstName = parts[0]
    const lastName  = parts.slice(1).join(' ') || parts[0]

    // 3. Create the patient record
    const { data: patient, error: patientError } = await admin
      .from('patients')
      .insert({
        clinic_id:      clinicId,
        first_name:     firstName,
        last_name:      lastName,
        date_of_birth:  dateOfBirth || null,
        sex:            sex || null,
        contact_number: phone || null,
        email,
        source:         'online',
      })
      .select()
      .single()

    if (patientError || !patient) {
      await admin.auth.admin.deleteUser(createdUserId)
      return NextResponse.json({ error: 'Failed to create patient record' }, { status: 500 })
    }

    // 4. Link auth user ↔ patient ↔ clinic
    const { error: profileError } = await admin
      .from('patient_profiles')
      .insert({ id: createdUserId, patient_id: patient.id, clinic_id: clinicId })

    if (profileError) {
      await admin.from('patients').delete().eq('id', patient.id)
      await admin.auth.admin.deleteUser(createdUserId)
      return NextResponse.json({ error: 'Failed to create patient profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err: unknown) {
    if (createdUserId) {
      const admin = createAdminClient()
      await admin.auth.admin.deleteUser(createdUserId).catch(() => {})
    }
    const message = err instanceof Error ? err.message : 'Registration failed'
    console.error('[/api/patient/register]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
