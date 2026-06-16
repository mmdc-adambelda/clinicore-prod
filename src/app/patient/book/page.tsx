import { getCurrentPatient } from '@/lib/db'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PatientBookingView from '@/components/patient/PatientBookingView'

export default async function PatientBookPage() {
  const profile = await getCurrentPatient()
  if (!profile) redirect('/login')

  const supabase = createClient()

  const [dentistsRes, appointmentsRes] = await Promise.all([
    supabase
      .from('staff_profiles')
      .select('id, full_name, specialty')
      .eq('clinic_id', profile.clinic_id)
      .eq('role', 'dentist')
      .eq('is_active', true)
      .order('full_name'),

    supabase
      .from('appointments')
      .select(`
        id, scheduled_at, procedure_type, chief_complaint, status,
        staff:staff_profiles(id, full_name, specialty)
      `)
      .eq('patient_id', profile.patient_id)
      .gte('scheduled_at', new Date().toISOString())
      .not('status', 'in', '(cancelled,no_show,completed)')
      .order('scheduled_at', { ascending: true })
      .limit(10),
  ])

  return (
    <PatientBookingView
      patientId={profile.patient_id}
      clinicId={profile.clinic_id}
      dentists={(dentistsRes.data || []) as any}
      upcomingAppointments={(appointmentsRes.data || []) as any}
    />
  )
}
