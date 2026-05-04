'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn, formatDate } from '@/lib/utils'
import { PawPrint, Syringe, Stethoscope, Plus } from 'lucide-react'

const SPECIES_EMOJI: Record<string, string> = { Dog: '🐕', Cat: '🐈', Rabbit: '🐇', Bird: '🦜', Hamster: '🐹' }
const VACC_STYLE: Record<string, string> = {
  up_to_date: 'bg-emerald-100 text-emerald-700',
  due_soon:   'bg-amber-100 text-amber-700',
  overdue:    'bg-red-100 text-red-700',
}

export default function VetPatientView({ patient }: { patient: any }) {
  const router = useRouter()
  const [showVaccModal, setShowVaccModal] = useState(false)
  const pet = patient.pet_profile
  const vaccinations = pet?.vaccinations || []
  const visits = patient.clinical_visits || []

  if (!pet) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <div className="text-4xl mb-3">🐾</div>
        <div className="text-slate-700 font-semibold mb-1">No pet profile found</div>
        <div className="text-slate-400 text-sm mb-4">This patient doesn&apos;t have a pet profile attached.</div>
        <button onClick={() => router.push(`/patients/${patient.id}`)} className="text-blue-600 text-sm font-semibold hover:underline">← Back to Patient</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-4xl flex-shrink-0">
          {SPECIES_EMOJI[pet.species] || '🐾'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{pet.pet_name}</h1>
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', VACC_STYLE[pet.vaccination_status])}>
              {pet.vaccination_status === 'up_to_date' ? '✓ Vaccinated' : pet.vaccination_status === 'due_soon' ? '📅 Due soon' : '⚠️ Overdue'}
            </span>
          </div>
          <div className="flex gap-4 mt-1 flex-wrap text-sm text-slate-500">
            <span>{pet.species} · {pet.breed || 'Unknown breed'}</span>
            {pet.age_years && <span>{pet.age_years} yrs old</span>}
            {pet.weight_kg && <span>{pet.weight_kg} kg</span>}
            {pet.sex && <span className="capitalize">{pet.sex}</span>}
            {pet.color && <span>{pet.color}</span>}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">👤 Owner: <span className="font-semibold text-slate-800">{patient.full_name}</span> · 📱 {patient.contact_number || 'No contact'}</div>
          {pet.microchip_number && <div className="text-xs text-slate-400 mt-0.5">🔖 Microchip: {pet.microchip_number}</div>}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => router.push(`/patients/${patient.id}`)}
            className="border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50"
          >
            ← Owner Record
          </button>
          <button
            onClick={() => router.push('/appointments')}
            className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 flex items-center gap-1.5"
          >
            <Stethoscope size={14} /> Book Appointment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Vaccination Records */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Syringe size={15} className="text-purple-600" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Vaccination Records</h2>
            </div>
            <button
              onClick={() => setShowVaccModal(true)}
              className="flex items-center gap-1 text-xs font-bold text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50"
            >
              <Plus size={12} /> Add Record
            </button>
          </div>

          {/* Next due alert */}
          {pet.next_vaccination_due && (
            <div className={cn(
              'mx-4 mt-3 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2',
              pet.vaccination_status === 'overdue' ? 'bg-red-50 text-red-700 border border-red-200' :
              pet.vaccination_status === 'due_soon' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-emerald-50 text-emerald-700 border border-emerald-200'
            )}>
              💉 Next vaccination due: {formatDate(pet.next_vaccination_due)}
            </div>
          )}

          <div className="p-4">
            {vaccinations.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <Syringe size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No vaccination records yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {vaccinations.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm flex-shrink-0">💉</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-sm">{v.vaccine_name}</div>
                      <div className="text-xs text-slate-500">Given: {formatDate(v.administered_date)} {v.administered_by && `· By: ${v.administered_by}`}</div>
                      {v.next_due_date && <div className="text-xs text-purple-600 font-medium">Next: {formatDate(v.next_due_date)}</div>}
                    </div>
                    {v.batch_number && <div className="text-xs text-slate-400 whitespace-nowrap">Lot: {v.batch_number}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Visit History */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope size={15} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Clinical Visit History</h2>
          </div>
          {visits.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <PawPrint size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No visits recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visits.map((v: any) => (
                <div
                  key={v.id}
                  onClick={() => router.push(`/clinical/${v.id}`)}
                  className="p-3 rounded-lg border border-slate-100 hover:border-purple-200 hover:bg-purple-50/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{v.diagnosis_description || v.chief_complaint || 'Consultation'}</span>
                    <span className="text-xs text-slate-400">{formatDate(v.created_at)}</span>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto', v.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>
                      {v.is_completed ? '✓ Done' : v.workflow_step}
                    </span>
                  </div>
                  {v.treatment_items?.length > 0 && (
                    <div className="text-xs text-slate-500 mt-0.5">{v.treatment_items.map((t: any) => t.procedure_name).join(' · ')}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pet Info Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Pet Details</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Name', pet.pet_name],
              ['Species', pet.species],
              ['Breed', pet.breed || '—'],
              ['Age', pet.age_years ? `${pet.age_years} years` : '—'],
              ['Weight', pet.weight_kg ? `${pet.weight_kg} kg` : '—'],
              ['Sex', pet.sex || '—'],
              ['Color', pet.color || '—'],
              ['Microchip', pet.microchip_number || 'Not tagged'],
            ].map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-400 font-medium mb-0.5">{k}</div>
                <div className="font-semibold text-slate-800 capitalize">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Owner info */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Owner Information</h2>
          <div className="space-y-2.5 text-sm">
            {[
              ['Full Name', patient.full_name],
              ['Phone', patient.contact_number || '—'],
              ['Email', patient.email || '—'],
              ['Address', patient.address || '—'],
              ['Emergency Contact', patient.emergency_contact || '—'],
              ['Emergency Phone', patient.emergency_phone || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <span className="text-slate-500 flex-shrink-0">{k}</span>
                <span className="font-semibold text-slate-800 text-right truncate">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showVaccModal && (
        <AddVaccModal
          petId={pet.id}
          onClose={() => setShowVaccModal(false)}
          onSave={() => { setShowVaccModal(false); window.location.reload() }}
        />
      )}
    </div>
  )
}

function AddVaccModal({ petId, onClose, onSave }: { petId: string; onClose: () => void; onSave: () => void }) {
  const [loading, setLoading] = useState(false)
  const [f, setF] = useState({ vaccine_name: '', administered_date: '', next_due_date: '', batch_number: '', administered_by: '', notes: '' })
  const s = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF(p => ({ ...p, [k]: e.target.value }))

  async function save() {
    if (!f.vaccine_name || !f.administered_date) { toast.error('Vaccine name and date required'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('vaccinations').insert({
      pet_id: petId,
      vaccine_name: f.vaccine_name,
      administered_date: f.administered_date,
      next_due_date: f.next_due_date || null,
      batch_number: f.batch_number || null,
      administered_by: f.administered_by || null,
      notes: f.notes || null,
    })
    if (error) { toast.error(error.message); setLoading(false); return }

    // Update pet vaccination status
    if (f.next_due_date) {
      const daysUntil = Math.floor((new Date(f.next_due_date).getTime() - Date.now()) / 86400000)
      const status = daysUntil < 0 ? 'overdue' : daysUntil <= 30 ? 'due_soon' : 'up_to_date'
      await supabase.from('pet_profiles').update({
        last_vaccination_date: f.administered_date,
        next_vaccination_due: f.next_due_date,
        vaccination_status: status,
      }).eq('id', petId)
    }

    toast.success('Vaccination record added')
    setLoading(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold">Add Vaccination Record</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <div className="space-y-3">
          <Field label="Vaccine Name *" value={f.vaccine_name} onChange={s('vaccine_name')} placeholder="e.g. Anti-Rabies, DHPP" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date Administered *" type="date" value={f.administered_date} onChange={s('administered_date')} />
            <Field label="Next Due Date" type="date" value={f.next_due_date} onChange={s('next_due_date')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Batch / Lot #" value={f.batch_number} onChange={s('batch_number')} placeholder="Optional" />
            <Field label="Administered By" value={f.administered_by} onChange={s('administered_by')} placeholder="Vet name" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <textarea value={f.notes} onChange={s('notes')} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none" placeholder="Reactions, site, observations…" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={save} disabled={loading} className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-60">
            {loading ? 'Saving…' : 'Save Record'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
    </div>
  )
}
