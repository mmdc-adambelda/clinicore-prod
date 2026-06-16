'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, Users, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Home' },
  { href: '/appointments', icon: Calendar,        label: 'Schedule' },
  { href: '/patients',     icon: Users,           label: 'Patients' },
  { href: '/clinical',     icon: Stethoscope,     label: 'Clinical' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex items-stretch safe-bottom"
         style={{ height: '60px', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {TABS.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
              active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
