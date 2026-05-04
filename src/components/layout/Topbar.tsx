'use client'
import { Bell, Plus, Search, X, CheckCircle, AlertTriangle, Calendar } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import type { StaffProfile } from '@/types'
import { cn } from '@/lib/utils'

const TITLE_MAP: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/appointments': 'Appointments',
  '/patients':     'Patients',
  '/billing':      'Billing',
  '/inventory':    'Inventory',
  '/reports':      'Reports & KPIs',
  '/settings':     'Settings',
  '/veterinary':   'Veterinary',
}

function getTitle(pathname: string) {
  for (const [key, val] of Object.entries(TITLE_MAP)) {
    if (pathname.startsWith(key)) return val
  }
  if (pathname.startsWith('/clinical')) return 'Clinical Workflow'
  if (pathname.startsWith('/dental')) return 'Dental Chart'
  return 'CliniCore EMR'
}

const NOTIFICATIONS = [
  { id: 1, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', title: '3 patients missed follow-up', time: '10 min ago', unread: true },
  { id: 2, icon: Calendar,      color: 'text-blue-500',  bg: 'bg-blue-50',  title: 'New appointment booked — Maria Santos 2:00 PM', time: '25 min ago', unread: true },
  { id: 3, icon: AlertTriangle, color: 'text-red-500',   bg: 'bg-red-50',   title: 'Inventory alert: Composite Resin out of stock', time: '1 hr ago', unread: true },
  { id: 4, icon: CheckCircle,   color: 'text-emerald-500', bg: 'bg-emerald-50', title: 'Invoice OR-2025-01042 marked as paid', time: '2 hrs ago', unread: false },
]

export default function Topbar({ staff: _staff }: { staff: StaffProfile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [clinicMode, setClinicMode] = useState<'dental' | 'vet'>('dental')
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState(NOTIFICATIONS)

  const unreadCount = notifications.filter(n => n.unread).length

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) router.push(`/patients?search=${encodeURIComponent(search.trim())}`)
  }

  function handleModeSwitch(mode: 'dental' | 'vet') {
    setClinicMode(mode)
    if (mode === 'vet') router.push('/veterinary')
    else router.push('/patients')
  }

  function markAllRead() {
    setNotifications(n => n.map(x => ({ ...x, unread: false })))
  }

  const today = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <header className="h-[60px] bg-white border-b border-slate-200 flex items-center gap-3 px-6 flex-shrink-0 relative z-30">
      <div className="flex-1">
        <h1 className="text-base font-bold text-slate-900">{getTitle(pathname)}</h1>
        <p className="text-xs text-slate-400 leading-none mt-0.5">{today}</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-60 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
        <Search size={14} className="text-slate-400 flex-shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search patients…"
          className="bg-transparent border-none outline-none text-sm flex-1 text-slate-800 placeholder:text-slate-400"
        />
      </form>

      {/* Dental / Vet toggle */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
        <button
          onClick={() => handleModeSwitch('dental')}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
            clinicMode === 'dental'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-white hover:shadow-sm'
          )}
        >
          🦷 Dental
        </button>
        <button
          onClick={() => handleModeSwitch('vet')}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
            clinicMode === 'vet'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-white hover:shadow-sm'
          )}
        >
          🐾 Vet
        </button>
      </div>

      {/* Notifications bell */}
      <div className="relative">
        <button
          onClick={() => setShowNotifs(v => !v)}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {showNotifs && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />

            <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-800">Notifications</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-600 font-semibold hover:underline">
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotifs(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.map(n => {
                  const Icon = n.icon
                  return (
                    <div
                      key={n.id}
                      onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x))}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors',
                        n.unread && 'bg-blue-50/40'
                      )}
                    >
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', n.bg)}>
                        <Icon size={13} className={n.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs leading-snug', n.unread ? 'font-semibold text-slate-800' : 'text-slate-600')}>
                          {n.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                      </div>
                      {n.unread && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                    </div>
                  )
                })}
              </div>

              <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                <button className="text-xs font-semibold text-blue-600 hover:underline">
                  View all notifications
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Patient */}
      <button
        onClick={() => router.push('/patients')}
        className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Plus size={15} />
        New Patient
      </button>
    </header>
  )
}
