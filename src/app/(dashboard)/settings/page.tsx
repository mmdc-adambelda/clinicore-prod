import { Metadata } from 'next'
import SettingsView from '@/components/settings/SettingsView'
import { getCurrentStaff, getAuditLogs } from '@/lib/db'
export const metadata: Metadata = { title: 'Settings' }
export default async function SettingsPage() {
  const staff = await getCurrentStaff()
  const logs = await getAuditLogs(30)
  return <SettingsView staff={staff} auditLogs={logs} />
}
