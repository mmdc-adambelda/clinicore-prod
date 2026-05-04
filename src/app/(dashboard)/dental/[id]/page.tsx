import { Metadata } from 'next'
import DentalChartView from '@/components/dental/DentalChartView'
import { getPatient, getDentalChart, getPatientVisitHistory } from '@/lib/db'
import { notFound } from 'next/navigation'
export const metadata: Metadata = { title: 'Dental Chart' }
export default async function DentalPage({ params }: { params: { id: string } }) {
  const { data: patient } = await getPatient(params.id)
  if (!patient) notFound()
  const { data: chart } = await getDentalChart(params.id)
  const { data: history } = await getPatientVisitHistory(params.id)
  return <DentalChartView patient={patient} chart={chart} history={history} />
}
