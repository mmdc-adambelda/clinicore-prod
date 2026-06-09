'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Patient, DentalChart } from '@/types'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn, formatDate } from '@/lib/utils'

// ── Clinical status config ──────────────────────────────────────
const SC: Record<string, { code: string; label: string; bg: string; text: string; border: string }> = {
  healthy:    { code: '',    label: 'Present',              bg: 'bg-white',      text: 'text-slate-400',  border: 'border-slate-300' },
  affected:   { code: 'D',  label: 'Decayed (D)',           bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-400' },
  treated:    { code: 'Co', label: 'Composite Filling (Co)',bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-400' },
  crown:      { code: 'JC', label: 'Jacket Crown (JC)',     bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-400' },
  missing:    { code: 'X',  label: 'Extracted / Missing',   bg: 'bg-slate-100',  text: 'text-slate-500',  border: 'border-slate-400' },
  implant:    { code: 'Im', label: 'Implant (Im)',          bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400' },
  bridge:     { code: 'P',  label: 'Pontic / Bridge (P)',   bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-400' },
  root_canal: { code: 'Rc', label: 'Root Canal (Rc)',       bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-400' },
}

// Permanent teeth in chart display order (right→midline, midline→left)
const UPR = [18,17,16,15,14,13,12,11]
const UPL = [21,22,23,24,25,26,27,28]
const LWR = [48,47,46,45,44,43,42,41]
const LWL = [31,32,33,34,35,36,37,38]

// Primary (deciduous) teeth
const PUR = [55,54,53,52,51]
const PUL = [61,62,63,64,65]
const PLR = [85,84,83,82,81]
const PLL = [71,72,73,74,75]

// ── Sub-components ──────────────────────────────────────────────
function Tooth({ num, status, isUpper, small, onClick }: {
  num: number; status: string; isUpper: boolean; small?: boolean; onClick: () => void
}) {
  const c = SC[status] || SC.healthy
  const isMissing = status === 'missing'
  return (
    <button onClick={onClick} title={`Tooth #${num} — ${c.label}`}
      className="flex flex-col items-center gap-[2px] group outline-none focus:outline-none">
      {isUpper && (
        <span className="text-[9px] font-bold text-slate-700 group-hover:text-blue-500 leading-none">{num}</span>
      )}
      <div className={cn(
        'rounded-full border-2 flex items-center justify-center font-bold transition-all group-hover:scale-110 group-hover:shadow-md',
        small ? 'w-6 h-6 text-[8px]' : 'w-8 h-8 text-[9px]',
        c.bg, c.text, c.border,
        isMissing && 'border-dashed'
      )}>
        {c.code}
      </div>
      {!small && (
        <div className={cn(
          'rounded-full border opacity-30',
          'w-[18px] h-[18px]',
          c.bg, c.border,
          isMissing && 'border-dashed'
        )} />
      )}
      {!isUpper && (
        <span className="text-[9px] font-bold text-slate-700 group-hover:text-blue-500 leading-none">{num}</span>
      )}
    </button>
  )
}

function Arch({ nums, chartMap, isUpper, small, onTooth }: {
  nums: number[]; chartMap: Record<number, DentalChart>; isUpper: boolean; small?: boolean; onTooth: (n: number) => void
}) {
  return (
    <div className="flex gap-[3px]">
      {nums.map(n => (
        <Tooth key={n} num={n}
          status={chartMap[n]?.status || 'healthy'}
          isUpper={isUpper} small={small}
          onClick={() => onTooth(n)} />
      ))}
    </div>
  )
}

function StatusBoxRow({ count, size = 8 }: { count: number; size?: number }) {
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('h-3 border border-slate-300 bg-slate-50', `w-${size}`)} />
      ))}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────
export default function DentalChartView({ patient, chart, history }: {
  patient: Patient; chart: DentalChart[]; history: any[]
}) {
  const router = useRouter()
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const chartMap = Object.fromEntries(chart.map(t => [t.tooth_number, t])) as Record<number, DentalChart>

  function openTooth(num: number) { setSelectedTooth(num); setShowModal(true) }

  const affected = chart.filter(t => t.status !== 'healthy')
  const summary  = Object.entries(
    affected.reduce((a, t) => { a[t.status] = (a[t.status] || 0) + 1; return a }, {} as Record<string,number>)
  )

  return (
    <div className="space-y-5">

      {/* Patient header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-base">
          {patient.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold text-slate-900">{patient.full_name}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-slate-500">🦷 Dental</span>
            {summary.map(([s, count]) => (
              <span key={s} className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', SC[s]?.bg, SC[s]?.text)}>
                {count} {SC[s]?.code || s}
              </span>
            ))}
          </div>
        </div>
        <button onClick={() => router.push(`/patients/${patient.id}`)}
          className="text-sm text-blue-600 hover:underline flex-shrink-0">
          ← Patient Record
        </button>
      </div>

      {/* ══ DENTAL RECORD CHART ══ */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex-1 text-center text-sm font-bold text-slate-700 uppercase tracking-widest">
            DENTAL RECORD CHART
          </div>
          <button onClick={() => toast.success('Print / export coming soon')}
            className="text-xs font-semibold text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 flex-shrink-0">
            📥 Export
          </button>
        </div>

        {/* Patient info strip */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600 border-b border-slate-100 pb-3 mb-5">
          <span><b>Name:</b> {patient.full_name}</span>
          <span><b>Age:</b> {patient.date_of_birth
            ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000)
            : '—'}</span>
          <span><b>Gender:</b> {patient.sex === 'male' ? 'M' : patient.sex === 'female' ? 'F' : patient.sex || '—'}</span>
          <span><b>Date:</b> {new Date().toLocaleDateString('en-PH')}</span>
        </div>

        <div className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-4">
          INTRAORAL EXAMINATION
        </div>

        {/* ── CHART GRID ── */}
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-0 mx-auto">

            {/* STATUS RIGHT / LEFT — upper */}
            <div className="flex items-center gap-1 mb-[3px]">
              <span className="text-[8px] font-bold text-slate-500 uppercase leading-tight w-[68px] text-right pr-2 flex-shrink-0">
                STATUS<br/>RIGHT
              </span>
              <StatusBoxRow count={8} />
              <div className="w-[2px] h-3 bg-slate-600 mx-1 flex-shrink-0" />
              <StatusBoxRow count={8} />
              <span className="text-[8px] font-bold text-slate-500 uppercase leading-tight w-[48px] pl-2 flex-shrink-0">
                STATUS<br/>LEFT
              </span>
            </div>

            {/* Primary upper */}
            <div className="flex items-start gap-1 mb-[3px]">
              <span className="text-[8px] font-bold text-slate-500 uppercase leading-tight w-[68px] text-right pr-2 pt-1 flex-shrink-0">
                TEMPORARY<br/>TEETH
              </span>
              <div className="flex items-start gap-1">
                <Arch nums={PUR} chartMap={chartMap} isUpper small onTooth={openTooth} />
                <div className="w-[2px] self-stretch bg-slate-500 mx-1" />
                <Arch nums={PUL} chartMap={chartMap} isUpper small onTooth={openTooth} />
              </div>
            </div>

            {/* Status boxes below primary upper */}
            <div className="flex items-center gap-1 mb-2 pl-[68px]">
              <div className="flex gap-[3px]">
                {PUR.map(n => <div key={n} className="w-6 h-3 border border-slate-300 bg-slate-50" />)}
              </div>
              <div className="w-[2px] mx-1" />
              <div className="flex gap-[3px]">
                {PUL.map(n => <div key={n} className="w-6 h-3 border border-slate-300 bg-slate-50" />)}
              </div>
            </div>

            {/* Permanent upper */}
            <div className="flex items-start gap-1">
              <span className="text-[8px] font-bold text-slate-500 uppercase leading-tight w-[68px] text-right pr-2 pt-2 flex-shrink-0">
                TEETH
              </span>
              <div className="flex items-start gap-1">
                <Arch nums={UPR} chartMap={chartMap} isUpper onTooth={openTooth} />
                <div className="w-[2px] self-stretch bg-slate-700 mx-1" />
                <Arch nums={UPL} chartMap={chartMap} isUpper onTooth={openTooth} />
              </div>
            </div>

            {/* MIDLINE */}
            <div className="w-full border-t-2 border-dashed border-slate-500 my-[5px]" />

            {/* Permanent lower */}
            <div className="flex items-start gap-1">
              <span className="w-[68px] flex-shrink-0" />
              <div className="flex items-start gap-1">
                <Arch nums={LWR} chartMap={chartMap} isUpper={false} onTooth={openTooth} />
                <div className="w-[2px] self-stretch bg-slate-700 mx-1" />
                <Arch nums={LWL} chartMap={chartMap} isUpper={false} onTooth={openTooth} />
              </div>
            </div>

            {/* Status boxes above primary lower */}
            <div className="flex items-center gap-1 mt-2 pl-[68px]">
              <div className="flex gap-[3px]">
                {PLR.map(n => <div key={n} className="w-6 h-3 border border-slate-300 bg-slate-50" />)}
              </div>
              <div className="w-[2px] mx-1" />
              <div className="flex gap-[3px]">
                {PLL.map(n => <div key={n} className="w-6 h-3 border border-slate-300 bg-slate-50" />)}
              </div>
            </div>

            {/* Primary lower */}
            <div className="flex items-start gap-1 mt-[3px]">
              <span className="text-[8px] font-bold text-slate-500 uppercase leading-tight w-[68px] text-right pr-2 pt-1 flex-shrink-0">
                TEMPORARY<br/>TEETH
              </span>
              <div className="flex items-start gap-1">
                <Arch nums={PLR} chartMap={chartMap} isUpper={false} small onTooth={openTooth} />
                <div className="w-[2px] self-stretch bg-slate-500 mx-1" />
                <Arch nums={PLL} chartMap={chartMap} isUpper={false} small onTooth={openTooth} />
              </div>
            </div>

            {/* STATUS RIGHT / LEFT — lower */}
            <div className="flex items-center gap-1 mt-[3px]">
              <span className="text-[8px] font-bold text-slate-500 uppercase leading-tight w-[68px] text-right pr-2 flex-shrink-0">
                STATUS<br/>RIGHT
              </span>
              <StatusBoxRow count={8} />
              <div className="w-[2px] h-3 bg-slate-600 mx-1 flex-shrink-0" />
              <StatusBoxRow count={8} />
              <span className="text-[8px] font-bold text-slate-500 uppercase leading-tight w-[48px] pl-2 flex-shrink-0">
                STATUS<br/>LEFT
              </span>
            </div>

          </div>
        </div>

        {/* ── LEGEND ── */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Condition</div>
            <div className="space-y-1 text-slate-600">
              <div><b className="text-emerald-600">✓</b> — Present Teeth</div>
              <div><b className="text-red-600">D</b> — Decayed (Caries / For Filling)</div>
              <div><b className="text-slate-600">X</b> — Extracted due to Caries</div>
              <div><b className="text-slate-600">XO</b> — Extracted due to Other Causes</div>
              <div><b className="text-slate-600">Im</b> — Impacted Tooth</div>
              <div><b className="text-slate-600">Un</b> — Unerupted</div>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Restorations &amp; Prosthetics</div>
            <div className="space-y-1 text-slate-600">
              <div><b className="text-blue-600">Co</b> — Composite Filling</div>
              <div><b className="text-blue-500">Am</b> — Amalgam Filling</div>
              <div><b className="text-amber-600">JC</b> — Jacket Crown</div>
              <div><b className="text-indigo-600">P</b> — Pontic / Bridge</div>
              <div><b className="text-purple-600">Im</b> — Implant</div>
              <div><b className="text-orange-600">Rc</b> — Root Canal Treatment</div>
              <div><b className="text-slate-600">S</b> — Sealants</div>
              <div><b className="text-slate-600">Rm</b> — Removable Denture</div>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Current Chart Status</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SC).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1">
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center text-[7px] font-bold',
                    cfg.bg, cfg.text, cfg.border
                  )}>
                    {cfg.code}
                  </div>
                  <span className="text-slate-500 text-[10px]">{cfg.label.split(' (')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CLINICAL FINDINGS ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-4">Clinical Findings</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">

          <div>
            <div className="font-bold text-slate-700 mb-2">Periodontal Screening</div>
            {['Gingivitis','Early Periodontitis','Moderate Periodontitis','Advanced Periodontitis'].map(item => (
              <label key={item} className="flex items-center gap-2 py-0.5 text-slate-600 cursor-pointer hover:text-slate-900">
                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-400" />
                <span>{item}</span>
              </label>
            ))}
          </div>

          <div>
            <div className="font-bold text-slate-700 mb-2">Occlusion</div>
            {['Class (Molar)','Overjet','Overbite','Midline Deviation','Crossbite'].map(item => (
              <div key={item} className="flex items-center justify-between gap-2 py-0.5 text-slate-600">
                <span>{item}</span>
                <div className="w-16 border-b border-slate-300" />
              </div>
            ))}
          </div>

          <div>
            <div className="font-bold text-slate-700 mb-2">Appliances</div>
            {['Orthodontic','Stayplate','Others'].map(item => (
              <label key={item} className="flex items-center gap-2 py-0.5 text-slate-600 cursor-pointer hover:text-slate-900">
                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-400" />
                <span>{item}</span>
              </label>
            ))}
            <div className="font-bold text-slate-700 mt-4 mb-2">TMD</div>
            {['Clenching','Clicking','Trismus','Muscle Spasm'].map(item => (
              <label key={item} className="flex items-center gap-2 py-0.5 text-slate-600 cursor-pointer hover:text-slate-900">
                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-400" />
                <span>{item}</span>
              </label>
            ))}
          </div>

          <div>
            <div className="font-bold text-slate-700 mb-2">X-Ray Taken</div>
            {['Periapical V','Panoramic','Cephalometric','Occlusal (Upper/Lower)','Others'].map(item => (
              <label key={item} className="flex items-center gap-2 py-0.5 text-slate-600 cursor-pointer hover:text-slate-900">
                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-400" />
                <span>{item}</span>
              </label>
            ))}
          </div>

        </div>
      </div>

      {/* ── TREATMENT HISTORY ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Treatment History</h2>
        </div>
        {history.flatMap((v: any) => v.treatment_items || []).length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400">No treatment records yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Date','Tooth','Procedure','Provider','Cost','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.flatMap((v: any) => (v.treatment_items || []).map((t: any, i: number) => (
                <tr key={`${v.id}-${i}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(v.created_at)}</td>
                  <td className="px-4 py-3 text-sm font-bold">{t.tooth_number ? `#${t.tooth_number}` : 'Full'}</td>
                  <td className="px-4 py-3 text-sm text-slate-800">{t.procedure_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{v.staff?.full_name || '—'}</td>
                  <td className="px-4 py-3 text-sm font-semibold">₱{Number(t.total_cost || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                      t.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>
                      {t.is_completed ? 'Complete' : 'In Progress'}
                    </span>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && selectedTooth !== null && (
        <ToothModal
          toothNum={selectedTooth}
          current={chartMap[selectedTooth]}
          patientId={patient.id}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); router.refresh() }}
        />
      )}
    </div>
  )
}

// ── Tooth status modal ──────────────────────────────────────────
function ToothModal({ toothNum, current, patientId, onClose, onSave }: {
  toothNum: number; current?: DentalChart; patientId: string; onClose: () => void; onSave: () => void
}) {
  const [status, setStatus]   = useState(current?.status || 'healthy')
  const [notes, setNotes]     = useState(current?.notes || '')
  const [surface, setSurface] = useState(current?.surface_affected || '')
  const [loading, setLoading] = useState(false)

  const isPrimary = toothNum >= 51

  async function save() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('dental_charts').upsert({
      patient_id: patientId,
      tooth_number: toothNum,
      status,
      notes,
      surface_affected: surface,
      updated_by: user?.id,
      treatment_date: new Date().toISOString().split('T')[0],
    }, { onConflict: 'patient_id,tooth_number' })
    toast.success(`Tooth #${toothNum} updated`)
    setLoading(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <div className={cn(
            'w-9 h-9 rounded-full border-2 flex items-center justify-center text-[10px] font-bold',
            SC[status]?.bg, SC[status]?.text, SC[status]?.border
          )}>
            {SC[status]?.code || ''}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Tooth #{toothNum}</h2>
            {isPrimary && <span className="text-[10px] text-slate-400">Primary / Deciduous</span>}
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
            {Object.entries(SC).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Surface Affected</label>
          <input value={surface} onChange={e => setSurface(e.target.value)}
            placeholder="e.g. M, D, O, B, L"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
            placeholder="Treatment details, observations…" />
        </div>

        <div className="flex gap-2">
          <button onClick={save} disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
            {loading ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
