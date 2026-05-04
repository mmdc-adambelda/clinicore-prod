import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ClinicalIndexView from '@/components/clinical/ClinicalIndexView'
export const metadata: Metadata = { title: 'Clinical Workflow' }

export default async function ClinicalIndexPage() {
  const supabase = createClient()

  // Get all active (incomplete) visits with patient + appointment info
  const { data: visits } = await supabase
    .from('clinical_visits')
    .select(`
      id, workflow_step, chief_complaint, created_at, is_completed,
      patient:patients(id, full_name, patient_type, contact_number, allergies),
      staff:staff_profiles(full_name),
      appointment:appointments(scheduled_at, procedure_type, status)
    `)
    .eq('is_completed', false)
    .order('created_at', { ascending: false })
    .limit(50)

  // Get today's appointments — wide UTC window to cover PHT (UTC+8)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const windowStart = new Date(todayStart.getTime() - 14 * 60 * 60 * 1000).toISOString()
  const windowEnd   = new Date(todayStart.getTime() + 38 * 60 * 60 * 1000).toISOString()
  const { data: checkedIn } = await supabase
    .from('appointments')
    .select(`
      id, scheduled_at, procedure_type, status, chief_complaint,
      patient:patients(id, full_name, patient_type, contact_number, allergies),
      staff:staff_profiles(id, full_name)
    `)
    .in('status', ['in_chair', 'confirmed', 'scheduled'])
    .gte('scheduled_at', windowStart)
    .lte('scheduled_at', windowEnd)
    .order('scheduled_at', { ascending: true })

  return <ClinicalIndexView visits={visits ?? []} appointments={checkedIn ?? []} />
}
