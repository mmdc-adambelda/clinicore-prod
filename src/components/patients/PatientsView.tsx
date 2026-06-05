'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Patient } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Search, Plus, Upload, Download } from 'lucide-react'

const STATUS_BADGE: Record<string,string> = { active:'bg-emerald-100 text-emerald-700', inactive:'bg-slate-100 text-slate-500' }

const PATIENT_CSV_HEADERS = ['first_name','last_name','date_of_birth','sex','contact_number','email','allergies','medical_history','source']
const PATIENT_CSV_TEMPLATE = [
  PATIENT_CSV_HEADERS.join(','),
  'Juan,dela Cruz,1990-01-15,male,09171234567,juan@email.com,NKDA,,walk_in',
  'Maria,Santos,1985-06-20,female,09281234567,maria@email.com,Penicillin,Hypertension,phone',
].join('\n')

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += line[i]
    }
  }
  result.push(current)
  return result
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim().replace(/^"|"$/g, '') })
    return row
  })
}

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
          {['All','New'].map(t => (
            <button key={t} onClick={() => router.push(t === 'All' ? '/patients' : `/patients?type=${t.toLowerCase()}`)}
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
              {['Patient / ID','Last Visit','Next Appt','Balance','Status',''].map(h => (
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
                </td>
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
              <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">No patients found. Add your first patient.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showNew && <NewPatientModal onClose={() => { setShowNew(false); router.refresh() }} />}
    </div>
  )
}

function NewPatientModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'single' | 'bulk'>('single')

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Add Patient</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-5">
          <button onClick={() => setTab('single')} className={cn('flex-1 py-2 rounded-md text-sm font-semibold transition-all', tab === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            Single Patient
          </button>
          <button onClick={() => setTab('bulk')} className={cn('flex-1 py-2 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-1.5', tab === 'bulk' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            <Upload size={13}/> Bulk Upload
          </button>
        </div>

        {tab === 'single' ? <SinglePatientForm onClose={onClose} /> : <BulkPatientUpload onClose={onClose} />}
      </div>
    </div>
  )
}

function SinglePatientForm({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [f, setF] = useState({ first_name:'', last_name:'', date_of_birth:'', sex:'female', contact_number:'', email:'', allergies:'', medical_history:'', source:'walk_in' })
  const s = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setF(p=>({...p,[k]:e.target.value}))

  async function save() {
    if (!f.first_name || !f.last_name) { toast.error('Name is required'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setLoading(false); return }
    const { data: staff } = await supabase.from('staff_profiles').select('clinic_id').eq('id', user.id).single()
    if (!staff) { toast.error('Profile error'); setLoading(false); return }

    const { data: patient, error } = await supabase.from('patients').insert({ ...f, patient_type: 'dental', clinic_id: staff.clinic_id }).select().single()
    if (error || !patient) { toast.error(error?.message || 'Failed to create patient'); setLoading(false); return }

    const teeth = [11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28,31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48]
    await supabase.from('dental_charts').insert(teeth.map(t => ({ patient_id: patient.id, tooth_number: t, status:'healthy' })))

    toast.success('Patient saved!')
    onClose()
  }

  return (
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
      <div className="flex gap-2 mt-2">
        <button onClick={save} disabled={loading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
          {loading ? 'Saving…' : 'Save Patient Record'}
        </button>
        <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
      </div>
    </div>
  )
}

function BulkPatientUpload({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)

  function downloadTemplate() {
    const blob = new Blob([PATIENT_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'patient_upload_template.csv'
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      setRows(parsed)
    }
    reader.readAsText(file)
  }

  async function upload() {
    if (rows.length === 0) { toast.error('No rows to upload'); return }
    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setUploading(false); return }
    const { data: staff } = await supabase.from('staff_profiles').select('clinic_id').eq('id', user.id).single()
    if (!staff) { toast.error('Profile error'); setUploading(false); return }

    const valid = rows.filter(r => r.first_name?.trim() && r.last_name?.trim())
    if (valid.length === 0) { toast.error('No valid rows — first_name and last_name are required'); setUploading(false); return }

    const payload = valid.map(r => ({
      first_name: r.first_name.trim(),
      last_name: r.last_name.trim(),
      date_of_birth: r.date_of_birth?.trim() || null,
      sex: (['male','female','other'].includes(r.sex?.trim()) ? r.sex.trim() : null),
      contact_number: r.contact_number?.trim() || null,
      email: r.email?.trim() || null,
      allergies: r.allergies?.trim() || null,
      medical_history: r.medical_history?.trim() || null,
      source: (['online','phone','walk_in','messenger','follow_up','referral'].includes(r.source?.trim()) ? r.source.trim() : 'walk_in'),
      patient_type: 'dental',
      clinic_id: staff.clinic_id,
    }))

    const { data: inserted, error } = await supabase.from('patients').insert(payload).select('id')
    const successCount = inserted?.length || 0
    const failedCount = valid.length - successCount

    if (successCount > 0 && inserted) {
      const teeth = [11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28,31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48]
      const chartRows = inserted.flatMap(p => teeth.map(t => ({ patient_id: p.id, tooth_number: t, status: 'healthy' })))
      await supabase.from('dental_charts').insert(chartRows)
    }

    if (error) toast.error(error.message)
    else toast.success(`${successCount} patient${successCount !== 1 ? 's' : ''} uploaded`)

    setResult({ success: successCount, failed: rows.length - valid.length + failedCount })
    setUploading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <div className="text-xs font-bold text-slate-700">CSV Template</div>
          <div className="text-xs text-slate-500 mt-0.5">Download to see the required columns and format</div>
        </div>
        <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap">
          <Download size={13}/> Download Template
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Upload CSV File</label>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all"
        >
          <Upload size={20} className="mx-auto mb-2 text-slate-400" />
          {fileName
            ? <div className="text-sm font-semibold text-slate-700">{fileName}</div>
            : <div className="text-sm text-slate-400">Click to choose a CSV file</div>}
          {rows.length > 0 && <div className="text-xs text-blue-600 font-semibold mt-1">{rows.length} row{rows.length !== 1 ? 's' : ''} detected</div>}
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </div>
      </div>

      {rows.length > 0 && !result && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
            Preview — first {Math.min(3, rows.length)} of {rows.length} rows
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  {PATIENT_CSV_HEADERS.slice(0, 5).map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 capitalize">{h.replace('_',' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 3).map((r, i) => (
                  <tr key={i} className={cn('border-b border-slate-50', (!r.first_name || !r.last_name) && 'bg-red-50')}>
                    <td className={cn('px-3 py-2', !r.first_name && 'text-red-500 font-semibold')}>{r.first_name || '⚠ missing'}</td>
                    <td className={cn('px-3 py-2', !r.last_name && 'text-red-500 font-semibold')}>{r.last_name || '⚠ missing'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.date_of_birth || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 capitalize">{r.sex || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.contact_number || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className={cn('rounded-xl p-4 text-sm font-semibold', result.failed === 0 ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-amber-50 border border-amber-200 text-amber-700')}>
          ✓ {result.success} uploaded successfully{result.failed > 0 ? ` · ${result.failed} skipped (missing required fields)` : ''}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={upload}
          disabled={uploading || rows.length === 0 || !!result}
          className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Upload size={14}/>
          {uploading ? 'Uploading…' : result ? 'Done' : `Upload ${rows.length} Patient${rows.length !== 1 ? 's' : ''}`}
        </button>
        <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">
          {result ? 'Close' : 'Cancel'}
        </button>
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
