import { Metadata } from 'next'
import ReportsView from '@/components/reports/ReportsView'
import { getDashboardStats } from '@/lib/db'
export const metadata: Metadata = { title: 'Reports & KPIs' }
export default async function ReportsPage() {
  const stats = await getDashboardStats()
  return <ReportsView stats={stats} />
}
