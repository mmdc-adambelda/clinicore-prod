'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Calendar, Clock, User, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import type { Patient } from '@/types'

const TABS = [
  { href: '/patient/book',         icon: Calendar, label: 'Book' },
  { href: '/patient/appointments', icon: Clock,    label: 'My Visits' },
  { href: '/patient/profile',      icon: User,     label: 'Profile' },
]

interface Props {
  patient: Patient
  children: React.ReactNode
}

export default function PatientShell({ patient, children }: Props) {
  const pathname = usePathname()
  const router   = useRouter()

  const initials = patient.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
  }

  return (
    <div className="min-h-svh bg-slate-50 flex flex-col">
      {/* Top header */}
      <header
        className="sticky top-0 z-30 bg-white border-b border-slate-200"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 leading-tight">{patient.full_name}</p>
              <p className="text-[10px] text-blue-600 font-medium">Patient Portal</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Page content — padded above the bottom nav */}
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
        {children}
      </main>

      {/* Bottom tab nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-30"
        style={{ height: 'calc(64px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
