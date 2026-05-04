import { Metadata } from 'next'
import VeterinaryView from '@/components/veterinary/VeterinaryView'
import { getPatients } from '@/lib/db'
export const metadata: Metadata = { title: 'Veterinary' }
export default async function VeterinaryPage() {
  const { data: patients } = await getPatients({ type: 'veterinary' })
  return <VeterinaryView patients={patients} />
}
