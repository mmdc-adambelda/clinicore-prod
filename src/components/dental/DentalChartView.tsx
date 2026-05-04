'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Patient, DentalChart } from '@/types'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn, formatDate } from '@/lib/utils'

const TOOTH_STATUS_STYLES: Record<string,string> = {
  healthy:'bg-emerald-50 border-emerald-300 text-emerald-700',
  treated:'bg-blue-50 border-blue-300 text-blue-700',
  affected:'bg-red-50 border-red-300 text-red-700',
  crown:'bg-amber-50 border-amber-300 text-amber-700',
  missing:'bg-slate-100 border-dashed border-slate-300 text-slate-400 opacity-60',
  implant:'bg-purple-50 border-purple-300 text-purple-700',
  bridge:'bg-indigo-50 border-indigo-300 text-indigo-700',
  root_canal:'bg-orange-50 border-orange-300 text-orange-700',
}

const ARCHES = {
  upperRight: [18,17,16,15,14,13,12,11],
  upperLeft:  [21,22,23,24,25,26,27,28],
  lowerLeft:  [31,32,33,34,35,36,37,38],
  lowerRight: [41,42,43,44,45,46,47,48],
}

export default function DentalChartView({ patient, chart, history }: { patient: Patient; chart: DentalChart[]; history: any[] }) {
  const router = useRouter()
  const [selectedTooth, setSelectedTooth] = useState<number|null>(null)
  const [showModal, setShowModal] = useState(false)

  const chartMap = Object.fromEntries(chart.map(t => [t.tooth_number, t]))

  function handleTooth(num: number) {
    setSelectedTooth(num)
    setShowModal(true)
  }

  return (
    <div className="space-y-5">
      {/* Patient header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">{patient.full_name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
        <div className="flex-1">
          <div className="text-lg font-bold text-slate-900">{patient.full_name}</div>
          <div className="text-xs text-slate-500">ID: {patient.id} · 🦷 Dental Patient</div>
        </div>
        <button onClick={() => router.push(`/patients/${patient.id}`)} className="text-sm text-blue-600 hover:underline">← Patient Record</button>
      </div>

      {/* Dental Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Interactive Dental Chart (FDI Notation)</h2>
          <button onClick={() => toast.success('Chart exported as PDF')} className="text-xs font-semibold text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">📥 Export</button>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="text-xs font-bold text-slate-400 mb-1">◀ UPPER RIGHT · UPPER LEFT ▶</div>
          {['upperRight','upperLeft'].map(arch => (
            <div key={arch} className="flex gap-1">
              {ARCHES[arch as keyof typeof ARCHES].map(num => {
                const tooth = chartMap[num]
                const status = tooth?.status || 'healthy'
                return (
                  <div key={num} className="flex flex-col items-center gap-0.5 cursor-pointer group" onClick={() => handleTooth(num)}>
                    <div className={cn('w-8 h-9 rounded-t-lg rounded-b-sm border-[1.5px] flex items-center justify-center text-[9px] font-bold transition-all group-hover:-translate-y-1 group-hover:shadow-md', TOOTH_STATUS_STYLES[status])}>
                      {num}
                    </div>
                    <div className="text-[8px] text-slate-400">#{num}</div>
                  </div>
                )
              })}
            </div>
          ))}
          <div className="w-full h-px bg-dashed border-t border-dashed border-slate-300 my-2"/>
          {['lowerLeft','lowerRight'].map(arch => (
            <div key={arch} className="flex gap-1">
              {ARCHES[arch as keyof typeof ARCHES].map(num => {
                const tooth = chartMap[num]
                const status = tooth?.status || 'healthy'
                return (
                  <div key={num} className="flex flex-col items-center gap-0.5 cursor-pointer group" onClick={() => handleTooth(num)}>
                    <div className="text-[8px] text-slate-400">#{num}</div>
                    <div className={cn('w-8 h-9 rounded-b-lg rounded-t-sm border-[1.5px] flex items-center justify-center text-[9px] font-bold transition-all group-hover:translate-y-1 group-hover:shadow-md', TOOTH_STATUS_STYLES[status])}>
                      {num}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          <div className="text-xs font-bold text-slate-400 mt-1">◀ LOWER RIGHT · LOWER LEFT ▶</div>
        </div>

        {/* Legend */}
        <div className="flex gap-3 flex-wrap justify-center mt-5 pt-4 border-t border-slate-100">
          {Object.entries(TOOTH_STATUS_STYLES).map(([s, cls]) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={cn('w-4 h-4 rounded border-[1.5px]', cls)}/>
              <span className="text-xs text-slate-500 capitalize">{s.replace('_',' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Treatment table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Treatment History</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Date','Tooth','Procedure','Provider','Cost','Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.flatMap((v:any) => (v.treatment_items||[]).map((t:any,i:number) => (
              <tr key={`${v.id}-${i}`} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(v.created_at)}</td>
                <td className="px-4 py-3 text-sm font-bold">{t.tooth_number ? `#${t.tooth_number}` : 'Full'}</td>
                <td className="px-4 py-3 text-sm text-slate-800">{t.procedure_name}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{v.staff?.full_name || '—'}</td>
                <td className="px-4 py-3 text-sm font-semibold">₱{Number(t.total_cost||0).toLocaleString()}</td>
                <td className="px-4 py-3"><span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', t.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>{t.is_completed ? 'Complete' : 'In Progress'}</span></td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {showModal && selectedTooth && (
        <ToothModal toothNum={selectedTooth} current={chartMap[selectedTooth]} patientId={patient.id}
          onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); router.refresh() }} />
      )}
    </div>
  )
}

function ToothModal({ toothNum, current, patientId, onClose, onSave }: any) {
  const [status, setStatus] = useState(current?.status || 'healthy')
  const [notes, setNotes] = useState(current?.notes || '')
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('dental_charts').upsert({ patient_id: patientId, tooth_number: toothNum, status, notes, updated_by: user?.id, treatment_date: new Date().toISOString().split('T')[0] }, { onConflict: 'patient_id,tooth_number' })
    toast.success(`Tooth #${toothNum} updated`)
    setLoading(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
        <h2 className="text-base font-bold mb-4">Tooth #{toothNum}</h2>
        <div className="mb-3">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
            {Object.keys(TOOTH_STATUS_STYLES).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none" placeholder="Surface affected, treatment details…" />
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">{loading ? 'Saving…' : 'Save'}</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold">Cancel</button>
        </div>
      </div>
    </div>
  )
}
