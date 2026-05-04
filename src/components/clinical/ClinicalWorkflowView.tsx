'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ClinicalVisit } from '@/types'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn, formatDateTime } from '@/lib/utils'

const STEPS = ['booking','consultation','diagnosis','treatment_plan','procedure','billing','follow_up']
const STEP_LABELS = ['Booking','Consultation','Diagnosis','Treatment Plan','Procedure','Billing','Follow-up']

export default function ClinicalWorkflowView({ visit, history }: { visit: ClinicalVisit & { patient?: any; treatment_items?: any[] }; history: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)
  const [form, setForm] = useState({
    chief_complaint: visit.chief_complaint || '',
    subjective: visit.subjective || '',
    objective: visit.objective || '',
    assessment: visit.assessment || '',
    plan: visit.plan || '',
    diagnosis_icd10: visit.diagnosis_icd10 || '',
    diagnosis_description: visit.diagnosis_description || '',
    blood_pressure: visit.blood_pressure || '',
    temperature: visit.temperature || '',
    weight: visit.weight || '',
    pulse_rate: visit.pulse_rate || '',
  })
  const currentStep = STEPS.indexOf(visit.workflow_step)
  const patient = visit.patient
  const s = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setForm(f => ({...f, [k]: e.target.value}))

  async function save(nextStep?: string) {
    setLoading(true)
    const supabase = createClient()
    const update: any = { ...form }
    if (nextStep) update.workflow_step = nextStep
    const { error } = await supabase.from('clinical_visits').update(update).eq('id', visit.id)
    if (error) toast.error(error.message)
    else { toast.success('Saved'); router.refresh() }
    setLoading(false)
  }

  async function runAI() {
    if (!form.subjective && !form.objective) { toast.error('Add clinical notes first'); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: `${form.subjective} ${form.objective}`, patientId: visit.patient_id, visitId: visit.id }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setAiResult(data)
      toast.success('AI suggestions ready')
    } catch { toast.error('AI unavailable') }
    finally { setAiLoading(false) }
  }

  function acceptAI() {
    if (!aiResult) return
    setForm(f => ({
      ...f,
      subjective: aiResult.soap_subjective || f.subjective,
      objective: aiResult.soap_objective || f.objective,
      assessment: aiResult.soap_assessment || f.assessment,
      plan: aiResult.soap_plan || f.plan,
      diagnosis_icd10: aiResult.suggested_icd10 || f.diagnosis_icd10,
      diagnosis_description: aiResult.suggested_diagnosis || f.diagnosis_description,
    }))
    toast.success('AI suggestions applied')
    setAiResult(null)
  }

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-0 overflow-x-auto">
        {STEP_LABELS.map((label, i) => {
          const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'todo'
          return (
            <div key={i} className="flex items-center flex-shrink-0">
              <div
                onClick={() => save(STEPS[i])}
                className={cn('flex items-center gap-1.5 cursor-pointer group')}
              >
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                  state === 'done'   ? 'bg-emerald-500 border-emerald-500 text-white' :
                  state === 'active' ? 'bg-blue-600 border-blue-600 text-white' :
                  'bg-white border-slate-300 text-slate-400 group-hover:border-blue-300'
                )}>
                  {state === 'done' ? '✓' : i + 1}
                </div>
                <span className={cn('text-xs font-medium whitespace-nowrap', state === 'done' ? 'text-emerald-600' : state === 'active' ? 'text-blue-600' : 'text-slate-400')}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && <div className={cn('w-6 h-0.5 mx-1', i < currentStep ? 'bg-emerald-400' : 'bg-slate-200')}/>}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: SOAP form */}
        <div className="space-y-4">
          {/* Patient info */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">{patient?.full_name}</h2>
                <div className="text-xs text-slate-500 mt-0.5">
                  {patient?.sex?.toUpperCase()} · ID: {patient?.id?.slice(0,8)}
                  {patient?.allergies && <span className="ml-2 text-red-600 font-semibold">⚠️ {patient.allergies}</span>}
                </div>
              </div>
              <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', visit.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>
                {visit.is_completed ? '✓ Completed' : STEP_LABELS[currentStep]}
              </span>
            </div>

            {/* Vitals */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[['BP','blood_pressure','mmHg'],['Temp (°C)','temperature',''],['Weight (kg)','weight',''],['Pulse','pulse_rate','bpm']].map(([lbl,k,unit]) => (
                <div key={k}>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{lbl}</label>
                  <input value={(form as any)[k]} onChange={s(k)} placeholder={unit} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-400" />
                </div>
              ))}
            </div>

            {/* SOAP */}
            {[
              { label:'Chief Complaint', key:'chief_complaint', rows:2 },
              { label:'S — Subjective', key:'subjective', rows:3 },
              { label:'O — Objective (Clinical findings)', key:'objective', rows:3 },
            ].map(({ label, key, rows }) => (
              <div key={key} className="mb-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                <textarea value={(form as any)[key]} onChange={s(key)} rows={rows} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none" />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ICD-10 Code</label>
                <input value={form.diagnosis_icd10} onChange={s('diagnosis_icd10')} placeholder="K04.0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Diagnosis</label>
                <input value={form.diagnosis_description} onChange={s('diagnosis_description')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
              </div>
            </div>

            {[
              { label:'A — Assessment', key:'assessment', rows:2 },
              { label:'P — Plan (numbered steps)', key:'plan', rows:4 },
            ].map(({ label, key, rows }) => (
              <div key={key} className="mb-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                <textarea value={(form as any)[key]} onChange={s(key)} rows={rows} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none" />
              </div>
            ))}

            <div className="flex gap-2 mt-4">
              <button onClick={() => save()} disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                {loading ? 'Saving…' : 'Save Notes'}
              </button>
              {currentStep < STEPS.length - 1 && (
                <button onClick={() => save(STEPS[currentStep + 1])} disabled={loading} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
                  Next Step →
                </button>
              )}
              <button onClick={() => router.push(`/billing?new=1`)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700">💳 Create Invoice</button>
            </div>
          </div>

          {/* AI Panel */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">🤖</div>
              <div className="text-sm font-bold text-blue-800">AI Clinical Assistant</div>
              <div className="ml-auto text-xs text-slate-500">Powered by Claude</div>
            </div>

            {aiResult ? (
              <div className="space-y-3">
                {aiResult.medication_alerts && aiResult.medication_alerts !== 'None' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs font-semibold text-amber-800">⚠️ {aiResult.medication_alerts}</div>
                )}
                <div className="bg-white rounded-lg p-3 text-xs">
                  <div className="font-bold text-blue-700 mb-1">Suggested Diagnosis</div>
                  <div className="text-slate-700">{aiResult.suggested_diagnosis} <span className="text-slate-400">({aiResult.suggested_icd10})</span></div>
                  <div className="text-slate-500 mt-1">Confidence: {Math.round((aiResult.confidence_score || 0) * 100)}%</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={acceptAI} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">✓ Accept & Apply</button>
                  <button onClick={() => setAiResult(null)} className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold">Dismiss</button>
                </div>
              </div>
            ) : (
              <button onClick={runAI} disabled={aiLoading} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                {aiLoading ? '⚙️ Generating suggestions…' : '🤖 Generate AI Suggestions'}
              </button>
            )}
          </div>
        </div>

        {/* Right: Timeline */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Patient History Timeline</h2>
          {history.length === 0 && <div className="text-slate-400 text-sm text-center py-8">No prior visits</div>}
          <div className="space-y-0">
            {history.map((h: any, i: number) => (
              <div key={h.id} className="flex gap-3 pb-5 relative">
                {i < history.length - 1 && <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-200"/>}
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-sm flex-shrink-0 z-10">🩺</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{h.diagnosis_description || h.chief_complaint || 'Visit'}</span>
                    <span className="text-xs text-slate-400">{formatDateTime(h.created_at)}</span>
                  </div>
                  {h.treatment_items?.length > 0 && (
                    <div className="text-xs text-slate-500 mt-0.5">{h.treatment_items.map((t:any)=>t.procedure_name).join(' · ')}</div>
                  )}
                  {h.staff && <div className="text-xs text-slate-400">{h.staff.full_name}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
