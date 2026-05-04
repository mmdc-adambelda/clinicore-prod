import { Metadata } from 'next'
import BillingView from '@/components/billing/BillingView'
import { getInvoices } from '@/lib/db'
export const metadata: Metadata = { title: 'Billing' }
export default async function BillingPage() {
  const { data: invoices } = await getInvoices()
  return <BillingView invoices={invoices} />
}
