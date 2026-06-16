'use client'
import { useState, useCallback } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottomNav'
import type { StaffProfile } from '@/types'

interface Props {
  staff: StaffProfile
  children: React.ReactNode
}

export default function ClientLayout({ staff, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const toggleSidebar = useCallback(() => setSidebarOpen(v => !v), [])

  return (
    <div className="flex h-svh overflow-hidden bg-slate-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <Sidebar staff={staff} open={sidebarOpen} onClose={closeSidebar} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar staff={staff} onMenuClick={toggleSidebar} />
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <div className="p-4 lg:p-6 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
