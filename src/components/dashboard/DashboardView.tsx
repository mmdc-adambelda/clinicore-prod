'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import {
  Users, Calendar, DollarSign, AlertTriangle,
  TrendingUp, TrendingDown, Clock, Package,
  CheckCircle, XCircle, Stethoscope
} from 'lucide-react'

const STATUS_BADGE: Record<string, string> = {
  in_chair:  'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-slate-100 text-slate-600',
  walk_in:   'bg-amber-100 text-amber-700',
  completed: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-600',
}
const INVENTORY_BADGE: Record<string, string> = {
  low:          'bg-amber-100 text-amber-700',
  critical:     'bg-red-100 text-red-700',
  out_of_stock: 'bg-red-200 text-red-800',
}
const INVENTORY_LABEL: Record<string, string> = {
  low:          '⚠️ Low stock',
  critical:     '🚨 Critical',
  out_of_stock: '❌ Out of stock',
}

function formatPHP(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function DashboardView({ stats }: { stats: any }) {
  const router = useRouter()

  const kpiCards = [
    {
      icon: Calendar,
      label: "Today's Appointments",
      value: stats.today_appointments,
      sub: stats.today_appointments === 0 ? 'None scheduled today' : `${stats.today_appointments} patient${stats.today_appointments !== 1 ? 's' : ''} today`,
      trend: stats.today_appointments > 0 ? 'up' : 'neutral',
      color: 'bg-blue-50', iconColor: 'text-blue-600',
    },
    {
      icon: Users,
      label: 'Active Patients',
      value: stats.active_patients.toLocaleString(),
      sub: `+${stats.new_patients_month} new this month`,
      trend: 'up',
      color: 'bg-emerald-50', iconColor: 'text-emerald-600',
    },
    {
      icon: DollarSign,
      label: "Today's Revenue",
      value: formatPHP(stats.today_revenue),
      sub: stats.today_revenue === 0 ? 'No payments today yet' : 'Collected today',
      trend: stats.today_revenue > 0 ? 'up' : 'neutral',
      color: 'bg-amber-50', iconColor: 'text-amber-600',
    },
    {
      icon: AlertTriangle,
      label: 'Outstanding Balance',
      value: formatPHP(stats.pending_balance),
      sub: stats.pending_balance === 0 ? 'All invoices settled ✓' : 'Across unpaid invoices',
      trend: stats.pending_balance > 0 ? 'dn' : 'up',
      color: 'bg-red-50', iconColor: 'text-red-500',
    },
  ]

  return (
    <div className="space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ icon: Icon, label, value, sub, trend, color, iconColor }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', color)}>
              <Icon size={17} className={iconColor} />
            </div>
            <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
            <div className={cn('text-xs font-medium flex items-center gap-1',
              trend === 'up' ? 'text-emerald-600' : trend === 'dn' ? 'text-red-500' : 'text-slate-400')}>
              {trend === 'up' ? <TrendingUp size={12}/> : trend === 'dn' ? <TrendingDown size={12}/> : null}
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Today's Schedule — REAL DATA */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-blue-600"/>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Today&apos;s Schedule</h2>
            </div>
            <button onClick={() => router.push('/appointments')} className="text-xs font-semibold text-blue-600 hover:underline">
              Full Calendar →
            </button>
          </div>

          {stats.today_schedule?.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Calendar size={28} className="mx-auto mb-2 opacity-30"/>
              <p className="text-sm font-medium">No appointments today</p>
              <button onClick={() => router.push('/appointments')}
                className="mt-3 text-xs font-semibold text-blue-600 hover:underline">
                Book appointment →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.today_schedule.map((appt: any) => (
                <div key={appt.id}
                  onClick={() => router.push(`/appointments`)}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer group transition-colors">
                  <div className="min-w-[64px] text-center flex-shrink-0">
                    <div className="text-sm font-bold text-slate-800">{formatTime(appt.scheduled_at)}</div>
                    <div className="text-[10px] text-slate-400">{appt.duration_minutes}m</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {appt.patient?.full_name || 'Unknown'}
                      </span>
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        appt.patient?.patient_type === 'dental' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
                        {appt.patient?.patient_type === 'dental' ? '🦷' : '🐾'}
                      </span>
                      {appt.patient?.allergies && (
                        <span className="text-[10px] text-red-600 font-bold">⚠️ {appt.patient.allergies}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {appt.procedure_type || 'Consultation'}
                      {appt.staff?.full_name && ` · ${appt.staff.full_name}`}
                    </div>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap', STATUS_BADGE[appt.status] || 'bg-slate-100 text-slate-600')}>
                    {appt.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Weekly Revenue Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Last 7 Days — Revenue</h2>
            {stats.weekly_revenue.every((d: any) => d.amount === 0) ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                No payments recorded yet. Revenue will appear here once invoices are paid.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={stats.weekly_revenue} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="day" tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                  <YAxis hide/>
                  <Tooltip
                    formatter={(v: number) => ['₱'+v.toLocaleString(), 'Revenue']}
                    contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="amount" fill="#2563EB" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'Patient Retention',
                value: `${stats.patient_retention}%`,
                sub: 'visited last 30 days',
                color: stats.patient_retention >= 50 ? 'text-emerald-600' : 'text-amber-600',
                bg: stats.patient_retention >= 50 ? 'bg-emerald-50' : 'bg-amber-50',
              },
              {
                label: 'Cancellation Rate',
                value: `${stats.cancellation_rate}%`,
                sub: 'this month',
                color: stats.cancellation_rate > 15 ? 'text-red-600' : 'text-slate-700',
                bg: stats.cancellation_rate > 15 ? 'bg-red-50' : 'bg-slate-50',
              },
              {
                label: 'New Patients',
                value: stats.new_patients_month,
                sub: 'this month',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                label: 'Active Patients',
                value: stats.active_patients.toLocaleString(),
                sub: 'total in database',
                color: 'text-slate-900',
                bg: 'bg-slate-50',
              },
            ].map(k => (
              <div key={k.label} className={cn('rounded-xl p-4 border border-slate-100', k.bg)}>
                <div className="text-xs text-slate-500 font-medium mb-0.5">{k.label}</div>
                <div className={cn('text-2xl font-bold', k.color)}>{k.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Inventory Alerts — REAL DATA */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={15} className="text-slate-500"/>
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Inventory Alerts</h2>
              </div>
              <button onClick={() => router.push('/inventory')} className="text-xs font-semibold text-blue-600 hover:underline">
                Manage →
              </button>
            </div>
            {stats.inventory_alerts?.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <CheckCircle size={20} className="mx-auto mb-1.5 text-emerald-400"/>
                <p className="text-sm font-medium text-emerald-600">All inventory levels OK</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.inventory_alerts.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{item.name}</div>
                      <div className="text-xs text-slate-400">
                        {item.stock_quantity} {item.unit} remaining · reorder at {item.reorder_level}
                      </div>
                    </div>
                    <span className={cn('text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap', INVENTORY_BADGE[item.status])}>
                      {INVENTORY_LABEL[item.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Patients */}
      {stats.recent_patients?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope size={15} className="text-slate-500"/>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Recently Added Patients</h2>
            </div>
            <button onClick={() => router.push('/patients')} className="text-xs font-semibold text-blue-600 hover:underline">
              All Patients →
            </button>
          </div>
          <div className="flex gap-4 px-5 py-4 overflow-x-auto">
            {stats.recent_patients.map((p: any) => (
              <div key={p.id} onClick={() => router.push(`/patients/${p.id}`)}
                className="flex-shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-4 w-44 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold mb-2',
                  p.patient_type === 'dental' ? 'bg-blue-600' : 'bg-purple-600')}>
                  {p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div className="text-sm font-semibold text-slate-900 truncate">{p.full_name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{p.patient_type === 'dental' ? '🦷 Dental' : '🐾 Vet'}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {new Date(p.created_at).toLocaleDateString('en-PH', { month:'short', day:'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
