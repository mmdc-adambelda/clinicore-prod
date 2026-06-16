import { getCurrentPatient } from '@/lib/db'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PatientAppointmentsView from '@/components/patient/PatientAppointmentsView'

export default async function PatientAppointmentsPage() {
  const profile = await getCurrentPatient()
  if (!profile) redirect('/login')

  const supabase = createClient()
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id, scheduled_at, procedure_type, chief_complaint, status, notes,
      staff:staff_profiles(id, full_name, specialty)
    `)
    .eq('patient_id', profile.patient_id)
    .order('scheduled_at', { ascending: false })
    .limit(30)

  return <PatientAppointmentsView appointments={(appointments || []) as any} />
}
