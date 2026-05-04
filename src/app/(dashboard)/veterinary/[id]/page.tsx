import { Metadata } from 'next'
import { getPatient } from '@/lib/db'
import VetPatientView from '@/components/veterinary/VetPatientView'
import { notFound } from 'next/navigation'
export const metadata: Metadata = { title: 'Veterinary Record' }

export default async function VetPatientPage({ params }: { params: { id: string } }) {
  const { data: patient } = await getPatient(params.id)
  if (!patient) notFound()
  return <VetPatientView patient={patient} />
}
