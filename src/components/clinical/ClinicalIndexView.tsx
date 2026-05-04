'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn, formatDateTime } from '@/lib/utils'
import { Stethoscope, Clock, Plus, ArrowRight } from 'lucide-react'

const STEP_COLOR: Record<string, string> = {
  booking:        'bg-slate-100 text-slate-600',
  consultation:   'bg-blue-100 text-blue-700',
  diagnosis:      'bg-purple-100 text-purple-700',
  treatment_plan: 'bg-amber-100 text-amber-700',
  procedure:      'bg-orange-100 text-orange-700',
  billing:        'bg-emerald-100 text-emerald-700',
  follow_up:      'bg-teal-100 text-teal-700',
}

export default function ClinicalIndexView({ visits, appointments }: { visits: any[]; appointments: any[] }) {
  const router = useRouter()
  const [starting, setStarting] = useState<string | null>(null)

  async function startVisit(appt: any) {
    setStarting(appt.id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setStarting(null); return }

    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('id, clinic_id')
      .eq('id', user.id)
      .single()

    if (!staff) { toast.error('Staff profile not found'); setStarting(null); return }

    // Check if visit already exists for this appointment
    const { data: existing } = await supabase
      .from('clinical_visits')
      .select('id')
      .eq('appointment_id', appt.id)
      .single()

    if (existing) {
      router.push(`/clinical/${existing.id}`)
      return
    }

    // Create new clinical visit
    const { data: visit, error } = await supabase
      .from('clinical_visits')
      .insert({
        clinic_id: staff.clinic_id,
        patient_id: appt.patient.id,
        appointment_id: appt.id,
        staff_id: staff.id,
        workflow_step: 'consultation',
        chief_complaint: appt.chief_complaint || appt.procedure_type || '',
      })
      .select()
      .single()

    if (error || !visit) {
      toast.error(error?.message || 'Failed to start visit')
      setStarting(null)
      return
    }

    // Update appointment status to in_chair
    await supabase
      .from('appointments')
      .update({ status: 'in_chair' })
      .eq('id', appt.id)

    toast.success('Clinical visit started')
    router.push(`/clinical/${visit.id}`)
  }

  return (
    <div className="space-y-6">

      {/* Today's Queue */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              Today&apos;s Queue — Start a Visit
            </h2>
          </div>
          <button
            onClick={() => router.push('/appointments')}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Manage Appointments →
          </button>
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Clock size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No appointments scheduled for today.</p>
            <button
              onClick={() => router.push('/appointments')}
              className="mt-3 text-xs font-semibold text-blue-600 hover:underline"
            >
              Go to Appointments →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map((appt: any) => (
              <div key={appt.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                {/* Time */}
                <div className="min-w-[52px] text-center">
                  <div className="text-sm font-bold text-slate-800">
                    {new Date(appt.scheduled_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Patient */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">{appt.patient?.full_name}</span>
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full',
                      appt.patient?.patient_type === 'dental'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    )}>
                      {appt.patient?.patient_type === 'dental' ? '🦷' : '🐾'} {appt.patient?.patient_type}
                    </span>
                    {appt.patient?.allergies && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        ⚠️ {appt.patient.allergies}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {appt.procedure_type || 'General consultation'} · {appt.staff?.full_name}
                  </div>
                </div>

                {/* Status badge */}
                <span className={cn(
                  'text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap',
                  appt.status === 'in_chair'  ? 'bg-blue-100 text-blue-700' :
                  appt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 text-slate-600'
                )}>
                  {appt.status.replace('_', ' ')}
                </span>

                {/* Action */}
                <button
                  onClick={() => startVisit(appt)}
                  disabled={starting === appt.id}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  {starting === appt.id ? (
                    'Starting…'
                  ) : (
                    <><Stethoscope size={13} /> Start Visit</>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active / In-Progress Visits */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Stethoscope size={16} className="text-slate-500" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Active Visits — In Progress
          </h2>
          <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {visits.length}
          </span>
        </div>

        {visits.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Stethoscope size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active visits. Start one from today&apos;s queue above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visits.map((v: any) => (
              <div
                key={v.id}
                onClick={() => router.push(`/clinical/${v.id}`)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-blue-50/50 cursor-pointer transition-colors group"
              >
                {/* Patient avatar */}
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                  v.patient?.patient_type === 'dental' ? 'bg-blue-600' : 'bg-purple-600'
                )}>
                  {v.patient?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">{v.patient?.full_name}</span>
                    {v.patient?.allergies && (
                      <span className="text-[10px] font-bold text-red-600">⚠️ {v.patient.allergies}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {v.chief_complaint || 'No complaint recorded'} · {formatDateTime(v.created_at)}
                  </div>
                </div>

                {/* Step badge */}
                <span className={cn(
                  'text-xs font-bold px-2.5 py-1 rounded-full capitalize whitespace-nowrap',
                  STEP_COLOR[v.workflow_step] || 'bg-slate-100 text-slate-600'
                )}>
                  {v.workflow_step.replace('_', ' ')}
                </span>

                {/* Doctor */}
                <div className="text-xs text-slate-400 hidden lg:block whitespace-nowrap">
                  {v.staff?.full_name}
                </div>

                <ArrowRight size={15} className="text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
