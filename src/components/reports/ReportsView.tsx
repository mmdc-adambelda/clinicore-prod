'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts'
import type { DashboardStats } from '@/types'

import toast from 'react-hot-toast'

export default function ReportsView({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Monthly Revenue', value:'₱284,500', sub:'↑ 12% vs last month', color:'text-slate-900' },
          { label:'Procedures Rendered', value:'187', sub:'↑ 14 vs last month', color:'text-slate-900' },
          { label:'New Patients', value:'24', sub:'↑ 4 vs last month', color:'text-emerald-600' },
          { label:'Cancellation Rate', value:'8%', sub:'↑ 2% — investigate', color:'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs text-slate-500 font-medium mb-1">{s.label}</div>
            <div className={`text-2xl font-bold ${s.color} mb-1`}>{s.value}</div>
            <div className="text-xs text-slate-400">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Weekly Revenue</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.weekly_revenue} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="day" tick={{ fontSize:12, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => '₱'+v.toLocaleString()}/>
              <Tooltip formatter={(v:number) => ['₱'+v.toLocaleString(),'Revenue']} contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid #e2e8f0' }}/>
              <Bar dataKey="amount" fill="#2563EB" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Revenue by Procedure</h2>
          <div className="space-y-3">
            {[
              { name:'Root Canal Therapy', pct:32, color:'#2563EB' },
              { name:'Crown & Bridge',     pct:24, color:'#8B5CF6' },
              { name:'Orthodontics',       pct:18, color:'#10B981' },
              { name:'Extractions',        pct:12, color:'#F97316' },
              { name:'Cleaning & Prophy',  pct:9,  color:'#0EA5E9' },
              { name:'Vet Consultations',  pct:5,  color:'#F59E0B' },
            ].map(item => (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{item.name}</span>
                  <span className="font-semibold">{item.pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width:`${item.pct}%`, background:item.color }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">KPIs</h2>
            <button onClick={() => toast.success('Exporting report…')} className="text-xs text-blue-600 font-semibold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">📥 Export PDF</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label:'Patient Retention',  value:'75%',  color:'text-emerald-600', bg:'bg-emerald-50' },
              { label:'Chair Utilization',  value:'60%',  color:'text-blue-600',    bg:'bg-blue-50' },
              { label:'Referral Rate',      value:'32%',  color:'text-slate-900',  bg:'bg-slate-50' },
              { label:'Online Bookings',    value:'48%',  color:'text-purple-600', bg:'bg-purple-50' },
              { label:'New Patients/Month', value:'24',   color:'text-slate-900',  bg:'bg-slate-50' },
              { label:'Avg Visit Value',    value:'₱6,200', color:'text-amber-600', bg:'bg-amber-50' },
            ].map(k => (
              <div key={k.label} className={`${k.bg} rounded-xl p-4`}>
                <div className="text-xs text-slate-500 mb-1">{k.label}</div>
                <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Monthly Bookings Trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={[{m:'Nov',c:98},{m:'Dec',c:112},{m:'Jan',c:134},{m:'Feb',c:89},{m:'Mar',c:145},{m:'Apr',c:167},{m:'May',c:142}]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="m" tick={{fontSize:12,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:'1px solid #e2e8f0'}}/>
              <Line type="monotone" dataKey="c" stroke="#2563EB" strokeWidth={2.5} dot={{ fill:'#2563EB', r:4 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
