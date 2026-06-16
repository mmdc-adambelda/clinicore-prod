import { getCurrentPatient, getCurrentStaff } from '@/lib/db'
import { redirect } from 'next/navigation'
import PatientShell from '@/components/patient/PatientShell'

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentPatient()
  if (!profile) {
    // Could be a staff user who navigated here by mistake
    const staff = await getCurrentStaff()
    if (staff) redirect('/dashboard')
    else redirect('/login')
  }
  return <PatientShell patient={profile!.patient}>{children}</PatientShell>
}
