import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import DentalIndexView from '@/components/dental/DentalIndexView'
export const metadata: Metadata = { title: 'Dental Charts' }

export default async function DentalIndexPage() {
  const supabase = createClient()
  const { data: patients } = await supabase
    .from('patients')
    .select(`
      id, full_name, date_of_birth, sex, contact_number, allergies, created_at,
      dental_charts(tooth_number, status)
    `)
    .eq('patient_type', 'dental')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  return <DentalIndexView patients={patients ?? []} />
}
