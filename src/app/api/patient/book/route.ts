import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface BookBody {
  patientId:     string
  clinicId:      string
  dentistId:     string
  scheduledAt:   string   // ISO timestamp
  chiefComplaint?: string | null
  procedureType?:  string | null
}

// POST /api/patient/book
// Creates an appointment on behalf of an authenticated patient.
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify caller is a patient and the patientId/clinicId match their profile
    const { data: patientProfile } = await supabase
      .from('patient_profiles')
      .select('patient_id, clinic_id')
      .eq('id', user.id)
      .single()

    if (!patientProfile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json() as BookBody
    const { patientId, clinicId, dentistId, scheduledAt, chiefComplaint, procedureType } = body

    if (!patientId || !clinicId || !dentistId || !scheduledAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Ensure the patient can only book for themselves and their clinic
    if (patientId !== patientProfile.patient_id || clinicId !== patientProfile.clinic_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ensure the dentist belongs to the clinic
    const { data: dentist } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('id', dentistId)
      .eq('clinic_id', clinicId)
      .eq('role', 'dentist')
      .eq('is_active', true)
      .single()

    if (!dentist) {
      return NextResponse.json({ error: 'Dentist not found' }, { status: 404 })
    }

    // Check the slot isn't already taken
    const slotStart = new Date(scheduledAt)
    const slotEnd   = new Date(slotStart.getTime() + 60 * 60 * 1000) // +1 hour

    const { count } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('staff_id', dentistId)
      .gte('scheduled_at', slotStart.toISOString())
      .lt('scheduled_at', slotEnd.toISOString())
      .not('status', 'in', '(cancelled,no_show)')

    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'This time slot is already booked. Please choose another.' }, { status: 409 })
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        clinic_id:       clinicId,
        patient_id:      patientId,
        staff_id:        dentistId,
        scheduled_at:    scheduledAt,
        duration_minutes: 60,
        procedure_type:  procedureType  || null,
        chief_complaint: chiefComplaint || null,
        source:          'online',
        status:          'scheduled',
        created_by:      user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Booking failed'
    console.error('[/api/patient/book]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
