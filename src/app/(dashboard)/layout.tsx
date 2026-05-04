import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { getCurrentStaff } from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff()
  if (!staff) redirect('/login')
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar staff={staff} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar staff={staff} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
