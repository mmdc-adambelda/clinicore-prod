'use client'
import { Calendar, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Appt {
  id: string
  scheduled_at: string
  procedure_type: string | null
  chief_complaint: string | null
  status: string
  notes: string | null
  staff: { full_name: string; specialty: string | null } | null
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed:  'bg-green-100 text-green-700',
  in_chair:   'bg-purple-100 text-purple-700',
  completed:  'bg-slate-100 text-slate-600',
  cancelled:  'bg-red-100 text-red-600',
  no_show:    'bg-amber-100 text-amber-700',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
}

export default function PatientAppointmentsView({ appointments }: { appointments: Appt[] }) {
  const upcoming = appointments.filter(a => !['completed', 'cancelled', 'no_show'].includes(a.status))
  const past     = appointments.filter(a =>  ['completed', 'cancelled', 'no_show'].includes(a.status))

  function Section({ title, items }: { title: string; items: Appt[] }) {
    if (items.length === 0) return null
    return (
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{title}</h3>
        <div className="space-y-3">
          {items.map(appt => (
            <div key={appt.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                    {appt.staff?.full_name
                      ? appt.staff.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)
                      : '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {appt.staff?.full_name ? `Dr. ${appt.staff.full_name}` : 'Unknown Dentist'}
                    </p>
                    <p className="text-xs text-slate-500">{appt.staff?.specialty || 'General Dentist'}</p>
                  </div>
                </div>
                <span className={cn(
                  'text-[10px] font-bold px-2.5 py-1 rounded-full capitalize',
                  STATUS_STYLES[appt.status] || 'bg-slate-100 text-slate-600',
                )}>
                  {appt.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                <span className="flex items-center gap-1.5"><Calendar size={12} />{fmtDate(appt.scheduled_at)}</span>
                <span className="flex items-center gap-1.5"><Clock size={12} />{fmtTime(appt.scheduled_at)}</span>
              </div>
              {appt.procedure_type && (
                <p className="text-xs text-blue-700 font-medium bg-blue-50 rounded-lg px-2.5 py-1.5 mt-2">
                  {appt.procedure_type}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <h2 className="text-base font-bold text-slate-800 mb-5">All Appointments</h2>
      {appointments.length === 0 ? (
        <div className="text-center py-14">
          <Calendar size={44} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">No appointments yet</p>
          <Link
            href="/patient/book"
            className="inline-block mt-4 text-sm text-blue-600 font-bold border border-blue-200 px-5 py-2 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Book Now →
          </Link>
        </div>
      ) : (
        <>
          <Section title="Upcoming" items={upcoming} />
          <Section title="Past"     items={past} />
        </>
      )}
    </div>
  )
}
