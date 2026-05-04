'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Patient } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Search, Plus } from 'lucide-react'

const TYPE_BADGE: Record<string,string> = { dental:'bg-blue-100 text-blue-700', veterinary:'bg-purple-100 text-purple-700' }
const STATUS_BADGE: Record<string,string> = { active:'bg-emerald-100 text-emerald-700', inactive:'bg-slate-100 text-slate-500', walk_in:'bg-amber-100 text-amber-700' }

export default function PatientsView({ patients, total }: { patients: Patient[]; total: number }) {
  const router = useRouter()
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/patients?search=${encodeURIComponent(search)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['All','Dental','Veterinary','New'].map(t => (
            <button key={t} onClick={() => router.push(t === 'All' ? '/patients' : t === 'Veterinary' ? '/veterinary' : `/patients?type=${t.toLowerCase()}`)}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:text-blue-600 transition-colors">
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <form onSubmit={handleSearch} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <Search size={14} className="text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients…" className="text-sm outline-none w-40 text-slate-800 placeholder:text-slate-400" />
          </form>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
            <Plus size={15}/> Add Patient
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-500 font-medium">{total} patients found</div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Patient / ID','Type','Last Visit','Next Appt','Balance','Status',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {patients.map(p => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-blue-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900 text-sm">{p.full_name}</div>
                  <div className="text-xs text-slate-400">{p.id}</div>
                  {p.pet_profile && <div className="text-xs text-purple-600">🐾 {p.pet_profile.pet_name}</div>}
                </td>
                <td className="px-4 py-3"><span className={cn('badge text-xs font-semibold px-2 py-0.5 rounded-full', TYPE_BADGE[p.patient_type])}>{p.patient_type === 'dental' ? '🦷' : '🐾'} {p.patient_type}</span></td>
                <td className="px-4 py-3 text-sm text-slate-600">{p.updated_at ? formatDate(p.updated_at) : '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">—</td>
                <td className="px-4 py-3">
                  {(p.outstanding_balance || 0) > 0
                    ? <span className="text-red-600 font-bold text-sm">₱{(p.outstanding_balance||0).toLocaleString()}</span>
                    : <span className="text-slate-400 text-sm">₱0</span>
                  }
                </td>
                <td className="px-4 py-3"><span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_BADGE[p.is_active ? 'active' : 'inactive'])}>{p.is_active ? 'active' : 'inactive'}</span></td>
                <td className="px-4 py-3">
                  <button onClick={() => router.push(`/patients/${p.id}`)} className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap">Open →</button>
                </td>
              </tr>
            ))}
            {patients.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No patients found. Add your first patient.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showNew && <NewPatientModal onClose={() => { setShowNew(false); router.refresh() }} />}
    </div>
  )
}

function NewPatientModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<'dental'|'veterinary'>('dental')
  const [f, setF] = useState({ first_name:'', last_name:'', date_of_birth:'', sex:'female', contact_number:'', email:'', allergies:'', medical_history:'', source:'walk_in' })
  const [pet, setPet] = useState({ pet_name:'', species:'Dog', breed:'', weight_kg:0, age_years:0 })
  const s = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setF(p=>({...p,[k]:e.target.value}))
  const sp = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setPet(p=>({...p,[k]:e.target.value}))

  async function save() {
    if (!f.first_name || !f.last_name) { toast.error('Name is required'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setLoading(false); return }
    const { data: staff } = await supabase.from('staff_profiles').select('clinic_id').eq('id', user.id).single()
    if (!staff) { toast.error('Profile error'); setLoading(false); return }

    const { data: patient, error } = await supabase.from('patients').insert({ ...f, patient_type: type, clinic_id: staff.clinic_id }).select().single()
    if (error || !patient) { toast.error(error?.message || 'Failed to create patient'); setLoading(false); return }

    if (type === 'veterinary') {
      await supabase.from('pet_profiles').insert({ ...pet, patient_id: patient.id })
    }

    // Insert default dental chart entries
    if (type === 'dental') {
      const teeth = [11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28,31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48]
      await supabase.from('dental_charts').insert(teeth.map(t => ({ patient_id: patient.id, tooth_number: t, status:'healthy' })))
    }

    toast.success('Patient saved!')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Add New Patient</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        <div className="flex gap-2 mb-4">
          {(['dental','veterinary'] as const).map(t => (
            <button key={t} onClick={() => setType(t)} className={cn('flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors', type === t ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300')}>
              {t === 'dental' ? '🦷 Dental Patient' : '🐾 Veterinary Patient'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <F label="First Name" value={f.first_name} onChange={s('first_name')} />
            <F label="Last Name" value={f.last_name} onChange={s('last_name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Date of Birth" type="date" value={f.date_of_birth} onChange={s('date_of_birth')} />
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Sex</label>
              <select value={f.sex} onChange={s('sex')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
                <option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Contact Number" value={f.contact_number} onChange={s('contact_number')} />
            <F label="Email" type="email" value={f.email} onChange={s('email')} />
          </div>
          <F label="Known Allergies" value={f.allergies} onChange={s('allergies')} placeholder="NKDA, Penicillin…" />
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Medical History</label>
            <textarea value={f.medical_history} onChange={s('medical_history')} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none" placeholder="Hypertension, diabetes, prior surgeries…" />
          </div>

          {type === 'veterinary' && (
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pet Information</div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Pet Name" value={pet.pet_name} onChange={sp('pet_name')} />
                <div><label className="block text-xs font-semibold text-slate-600 mb-1">Species</label>
                  <select value={pet.species} onChange={sp('species')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
                    {['Dog','Cat','Rabbit','Bird','Hamster','Other'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <F label="Breed" value={pet.breed} onChange={sp('breed')} />
                <F label="Weight (kg)" type="number" value={String(pet.weight_kg)} onChange={sp('weight_kg')} />
                <F label="Age (years)" type="number" value={String(pet.age_years)} onChange={sp('age_years')} />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={save} disabled={loading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
            {loading ? 'Saving…' : 'Save Patient Record'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function F({ label, value, onChange, type='text', placeholder='' }: { label:string; value:string; onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void; type?:string; placeholder?:string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
    </div>
  )
}
