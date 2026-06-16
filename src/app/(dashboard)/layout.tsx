import ClientLayout from '@/components/layout/ClientLayout'
import { getCurrentStaff, getCurrentPatient } from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff()
  if (!staff) {
    const patient = await getCurrentPatient()
    if (patient) redirect('/patient/book')
    else redirect('/login')
  }
  return <ClientLayout staff={staff!}>{children}</ClientLayout>
}
