import { Metadata } from 'next'
import DashboardView from '@/components/dashboard/DashboardView'
import { getDashboardStats } from '@/lib/db'
export const metadata: Metadata = { title: 'Dashboard' }
export default async function DashboardPage() {
  const stats = await getDashboardStats()
  return <DashboardView stats={stats} />
}
