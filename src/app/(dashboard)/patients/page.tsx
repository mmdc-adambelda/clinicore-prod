import { Metadata } from 'next'
import PatientsView from '@/components/patients/PatientsView'
import { getPatients } from '@/lib/db'
export const metadata: Metadata = { title: 'Patients' }
export default async function PatientsPage({ searchParams }: { searchParams: { search?: string; treatment?: string; type?: string; page?: string } }) {
  const { data: patients, count } = await getPatients({
    search: searchParams.search,
    treatment: searchParams.treatment,
    page: Number(searchParams.page) || 1,
  })
  return <PatientsView patients={patients} total={count} initialSearch={searchParams.search ?? ''} initialTreatment={searchParams.treatment ?? ''} />
}
