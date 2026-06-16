import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/patient/slots?dentistId=xxx&date=YYYY-MM-DD
// Returns booked time slots (HH:MM) for a dentist on a given date.
// Accessible only to authenticated patient users.
export async function GET(req: NextRequest) {
  try {
    const supabase  = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify caller is a patient
    const { data: patientProfile } = await supabase
      .from('patient_profiles')
      .select('clinic_id')
      .eq('id', user.id)
      .single()
    if (!patientProfile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const dentistId = searchParams.get('dentistId')
    const date      = searchParams.get('date')        // YYYY-MM-DD

    if (!dentistId || !date) {
      return NextResponse.json({ error: 'dentistId and date are required' }, { status: 400 })
    }

    const dayStart = `${date}T00:00:00+08:00`
    const dayEnd   = `${date}T23:59:59+08:00`

    const { data: appointments } = await supabase
      .from('appointments')
      .select('scheduled_at')
      .eq('staff_id', dentistId)
      .eq('clinic_id', patientProfile.clinic_id)
      .gte('scheduled_at', dayStart)
      .lte('scheduled_at', dayEnd)
      .not('status', 'in', '(cancelled,no_show)')

    const slots = (appointments || []).map(a => {
      const d = new Date(a.scheduled_at)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })

    return NextResponse.json({ slots })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch slots'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
