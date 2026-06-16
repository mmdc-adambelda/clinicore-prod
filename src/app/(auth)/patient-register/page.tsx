import { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import PatientRegisterForm from '@/components/patient/PatientRegisterForm'

export const metadata: Metadata = { title: 'Patient Sign Up' }
export const dynamic = 'force-dynamic'

export default async function PatientRegisterPage() {
  const admin = createAdminClient()
  const { data: clinics } = await admin
    .from('clinics')
    .select('id, name, branch_name')
    .order('name')

  return <PatientRegisterForm clinics={clinics || []} />
}
