import { Metadata } from 'next'
import ClinicalWorkflowView from '@/components/clinical/ClinicalWorkflowView'
import { getClinicalVisit, getPatientVisitHistory } from '@/lib/db'
import { notFound } from 'next/navigation'
export const metadata: Metadata = { title: 'Clinical Workflow' }
export default async function ClinicalPage({ params }: { params: { id: string } }) {
  const { data: visit } = await getClinicalVisit(params.id)
  if (!visit) notFound()
  const { data: history } = await getPatientVisitHistory(visit.patient_id)
  return <ClinicalWorkflowView visit={visit} history={history} />
}
