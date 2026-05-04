'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, Users, Stethoscope,
  Smile, PawPrint, Bot, CreditCard, Package,
  BarChart3, Settings, LogOut
} from 'lucide-react'
import type { StaffProfile } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const NAV: { group: string; items: { href: string; icon: any; label: string; badge?: string; exact?: boolean }[] }[] = [
  { group: 'Overview', items: [
    { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/appointments', icon: Calendar,         label: 'Appointments', badge: '3' as string | undefined },
    { href: '/patients',     icon: Users,            label: 'Patients' },
    { href: '/clinical',     icon: Stethoscope,      label: 'Clinical Workflow' },
  ]},
  { group: 'Specialty', items: [
    { href: '/dental',       icon: Smile,            label: 'Dental Charts' },
    { href: '/veterinary',   icon: PawPrint,         label: 'Veterinary' },
    { href: '/ai',           icon: Bot,              label: 'AI Assistant',  exact: false },
  ]},
  { group: 'Operations', items: [
    { href: '/billing',      icon: CreditCard,       label: 'Billing' },
    { href: '/inventory',    icon: Package,          label: 'Inventory' },
    { href: '/reports',      icon: BarChart3,        label: 'Reports & KPIs' },
    { href: '/settings',     icon: Settings,         label: 'Settings / RBAC' },
  ]},
]

interface Props { staff: StaffProfile }

export default function Sidebar({ staff }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
  }

  function isActive(href: string, exact = true) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const initials = staff.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside className="w-[220px] flex-shrink-0 bg-slate-900 text-white flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="h-[60px] flex items-center gap-3 px-5 border-b border-white/8 flex-shrink-0">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
          CC
        </div>
        <div>
          <div className="text-[15px] font-bold leading-none">CliniCore</div>
          <div className="text-[10px] text-slate-500 mt-0.5 tracking-wide">EMR v2.0</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin scrollbar-thumb-white/10">
        {NAV.map(({ group, items }) => (
          <div key={group} className="mb-1">
            <div className="px-5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[1.2px] text-slate-500">
              {group}
            </div>
            {items.map(({ href, icon: Icon, label, badge, exact = true }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-5 py-2.5 text-[13.5px] font-medium transition-all duration-150 border-l-[3px]',
                  isActive(href, exact)
                    ? 'bg-blue-600/20 text-white border-blue-500'
                    : 'text-slate-400 border-transparent hover:bg-white/6 hover:text-white'
                )}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {badge && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/8 flex-shrink-0 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white truncate">{staff.full_name}</div>
          <div className="text-[11px] text-slate-500 capitalize">{staff.role.replace('_', ' ')}</div>
        </div>
        <button
          onClick={handleLogout}
          className="text-slate-500 hover:text-red-400 transition-colors p-1"
          title="Sign out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}
