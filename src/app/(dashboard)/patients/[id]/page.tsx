import { Metadata } from 'next'
import PatientDetailView from '@/components/patients/PatientDetailView'
import { getPatient } from '@/lib/db'
import { notFound } from 'next/navigation'
export const metadata: Metadata = { title: 'Patient Record' }
export default async function PatientPage({ params }: { params: { id: string } }) {
  const { data: patient } = await getPatient(params.id)
  if (!patient) notFound()
  return <PatientDetailView patient={patient} />
}
