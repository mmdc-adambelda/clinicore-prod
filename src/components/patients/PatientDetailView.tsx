'use client'
import { useRouter } from 'next/navigation'
import type { Patient } from '@/types'
import { cn, formatDate } from '@/lib/utils'
import { Smile, PawPrint, Clock, CreditCard } from 'lucide-react'

export default function PatientDetailView({ patient }: { patient: Patient & { clinical_visits?: any[]; invoices?: any[]; attachments?: any[] } }) {
  const router = useRouter()
  const isDental = patient.patient_type === 'dental'
  const visits = patient.clinical_visits || []
  const invoices = patient.invoices || []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4">
        <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0', isDental ? 'bg-blue-600' : 'bg-purple-600')}>
          {patient.full_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{patient.full_name}</h1>
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', isDental ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
              {isDental ? '🦷 Dental' : '🐾 Veterinary'}
            </span>
          </div>
          <div className="flex gap-4 mt-1 flex-wrap text-sm text-slate-500">
            <span>ID: {patient.id}</span>
            {patient.date_of_birth && <span>DOB: {formatDate(patient.date_of_birth)}</span>}
            {patient.sex && <span className="capitalize">{patient.sex}</span>}
            {patient.contact_number && <span>📱 {patient.contact_number}</span>}
            {patient.email && <span>✉️ {patient.email}</span>}
          </div>
          {patient.allergies && <div className="mt-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded inline-block">⚠️ Allergies: {patient.allergies}</div>}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => router.push(isDental ? `/dental/${patient.id}` : `/veterinary/${patient.id}`)}
            className="flex items-center gap-1.5 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold hover:border-blue-300 hover:text-blue-600 transition-colors">
            {isDental ? <Smile size={14}/> : <PawPrint size={14}/>} View Chart
          </button>
          <button onClick={() => router.push('/billing')}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
            <CreditCard size={14}/> Billing
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Visit Timeline */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-slate-400"/>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Visit History</h2>
          </div>
          {visits.length === 0 && <div className="text-slate-400 text-sm text-center py-8">No visits yet</div>}
          <div className="space-y-0">
            {visits.map((v: any, i: number) => (
              <div key={v.id} className="flex gap-3 pb-5 relative">
                {i < visits.length - 1 && <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-200"/>}
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-sm flex-shrink-0 z-10">🩺</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{v.diagnosis_description || v.chief_complaint || 'Consultation'}</span>
                    <span className="text-xs text-slate-400">{formatDate(v.created_at)}</span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', v.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>
                      {v.is_completed ? 'Completed' : v.workflow_step}
                    </span>
                  </div>
                  {v.treatment_items?.length > 0 && (
                    <div className="text-xs text-slate-500 mt-0.5">{v.treatment_items.map((t:any) => t.procedure_name).join(' · ')}</div>
                  )}
                  <button onClick={() => router.push(`/clinical/${v.id}`)} className="text-xs text-blue-600 hover:underline mt-1">Open record →</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoices */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Billing History</h2>
          {invoices.length === 0 && <div className="text-slate-400 text-sm text-center py-8">No invoices yet</div>}
          <div className="space-y-2">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{inv.or_number}</div>
                  <div className="text-xs text-slate-500">{formatDate(inv.issued_at)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">₱{Number(inv.total_amount).toLocaleString()}</div>
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
