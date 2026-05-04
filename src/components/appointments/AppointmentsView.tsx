'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Plus, ChevronLeft, ChevronRight, Search, Calendar, Clock, RefreshCw } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  in_chair: '#2563EB', confirmed: '#10B981', scheduled: '#64748b',
  walk_in: '#F59E0B', completed: '#CBD5E1', cancelled: '#EF4444', no_show: '#EF4444',
}
const STATUS_BADGE: Record<string, string> = {
  in_chair: 'bg-blue-100 text-blue-700', confirmed: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-slate-100 text-slate-600', walk_in: 'bg-amber-100 text-amber-700',
  completed: 'bg-slate-100 text-slate-500', cancelled: 'bg-red-100 text-red-600',
  no_show: 'bg-red-100 text-red-700',
}

function todayStr() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`
}
function dateLabel(s: string) {
  const [y,m,d] = s.split('-').map(Number)
  return new Date(y,m-1,d).toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})
}
function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit',hour12:true})
}
function shiftDate(s: string, delta: number) {
  const [y,m,d] = s.split('-').map(Number)
  const dt = new Date(y,m-1,d+delta)
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
}

export default function AppointmentsView({ initialDate }: { initialDate: string }) {
  const router = useRouter()
  const [date, setDate] = useState(initialDate || todayStr())
  const [appts, setAppts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async (d: string) => {
    setLoading(true)
    const supabase = createClient()
    const [y,m,day] = d.split('-').map(Number)
    const start = new Date(y,m-1,day,0,0,0,0).toISOString()
    const end   = new Date(y,m-1,day,23,59,59,999).toISOString()

    // Step 1: fetch appointments without any joins that could be ambiguous
    const { data: rawAppts, error } = await supabase
      .from('appointments')
      .select('id,scheduled_at,duration_minutes,procedure_type,chief_complaint,status,notes,staff_id,patient_id,chair_id')
      .gte('scheduled_at', start)
      .lte('scheduled_at', end)
      .order('scheduled_at', { ascending: true })

    if (error) {
      toast.error('Error loading appointments: ' + error.message)
      setLoading(false)
      return
    }
    if (!rawAppts || rawAppts.length === 0) {
      setAppts([])
      setLoading(false)
      return
    }

    // Step 2: fetch related data separately — no ambiguous FK issues
    const patientIds = [...new Set(rawAppts.map(a => a.patient_id).filter(Boolean))]
    const staffIds   = [...new Set(rawAppts.map(a => a.staff_id).filter(Boolean))]
    const chairIds   = [...new Set(rawAppts.map(a => a.chair_id).filter(Boolean))]

    const [pRes, sRes, cRes] = await Promise.all([
      patientIds.length ? supabase.from('patients').select('id,full_name,patient_type,contact_number,allergies').in('id', patientIds) : { data: [] },
      staffIds.length   ? supabase.from('staff_profiles').select('id,full_name,role').in('id', staffIds) : { data: [] },
      chairIds.length   ? supabase.from('chairs').select('id,label').in('id', chairIds) : { data: [] },
    ])

    const patMap = Object.fromEntries((pRes.data||[]).map((p:any) => [p.id, p]))
    const stMap  = Object.fromEntries((sRes.data||[]).map((s:any) => [s.id, s]))
    const chMap  = Object.fromEntries((cRes.data||[]).map((c:any) => [c.id, c]))

    const enriched = rawAppts.map(a => ({
      ...a,
      patient: patMap[a.patient_id] || null,
      staff:   stMap[a.staff_id]    || null,
      chair:   chMap[a.chair_id]    || null,
    }))

    setAppts(enriched)
    setLoading(false)
  }, [])

  useEffect(() => { load(date) }, [date, load])

  function nav(delta: number) {
    const next = shiftDate(date, delta)
    setDate(next)
    router.push(`/appointments?date=${next}`, { scroll: false })
  }

  function goToday() {
    const t = todayStr()
    setDate(t)
    router.push(`/appointments?date=${t}`, { scroll: false })
  }

  async function updateStatus(id: string, status: string) {
    const supabase = createClient()
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Status updated')
    setAppts(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  // Group by staff
  const groups = new Map<string, { staff: any; appts: any[] }>()
  appts.forEach(a => {
    const k = a.staff_id || 'unassigned'
    if (!groups.has(k)) groups.set(k, { staff: a.staff, appts: [] })
    groups.get(k)!.appts.push(a)
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => nav(-1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"><ChevronLeft size={16}/></button>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 min-w-[260px]">
            <Calendar size={14} className="text-blue-600 flex-shrink-0"/>
            <span className="text-sm font-semibold text-slate-800">{dateLabel(date)}</span>
          </div>
          <button onClick={() => nav(1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"><ChevronRight size={16}/></button>
          <button onClick={goToday} className="text-xs font-semibold text-blue-600 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-50">Today</button>
          <button onClick={() => load(date)} title="Refresh" className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>
          </button>
        </div>
        <div className="flex items-center gap-3">
          {!loading && <span className="text-sm text-slate-500"><strong className="text-slate-900">{appts.length}</strong> appointment{appts.length !== 1 ? 's' : ''}</span>}
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
            <Plus size={15}/> New Appointment
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl text-center py-16">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-blue-600"/>
          <p className="text-sm text-slate-500">Loading appointments…</p>
        </div>
      ) : appts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl text-center py-16">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-sm font-semibold text-slate-700">No appointments on {dateLabel(date)}</p>
          <p className="text-xs text-slate-400 mt-1">Book one below, or navigate to another date.</p>
          <button onClick={() => setShowNew(true)} className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
            + Book Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(groups.values()).map(({ staff, appts: list }) => (
            <div key={staff?.id || 'unassigned'} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {staff?.full_name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2) || '?'}
                </div>
                <span className="text-sm font-bold text-slate-800">{staff?.full_name || 'Unassigned'}</span>
                <span className="text-xs text-slate-400 capitalize">{staff?.role?.replace('_',' ')}</span>
                <span className="ml-auto text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {list.length} appt{list.length!==1?'s':''}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {list.map((a:any) => (
                  <div key={a.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 group"
                    style={{ borderLeft: `4px solid ${STATUS_COLORS[a.status]||'#94a3b8'}` }}>
                    <div className="min-w-[80px] flex-shrink-0">
                      <div className="text-sm font-bold text-slate-800 flex items-center gap-1">
                        <Clock size={11} className="text-slate-400"/>{timeLabel(a.scheduled_at)}
                      </div>
                      <div className="text-xs text-slate-400">{a.duration_minutes} min</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">{a.patient?.full_name || 'Unknown patient'}</span>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                          a.patient?.patient_type==='dental' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
                          {a.patient?.patient_type==='dental' ? '🦷' : '🐾'} {a.patient?.patient_type}
                        </span>
                        {a.patient?.allergies && <span className="text-[10px] font-bold text-red-600">⚠️ {a.patient.allergies}</span>}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {a.procedure_type || 'General consultation'}
                        {a.chair?.label && ` · ${a.chair.label}`}
                      </div>
                    </div>
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap', STATUS_BADGE[a.status])}>
                      {a.status.replace('_',' ')}
                    </span>
                    <div className="flex gap-2 flex-shrink-0">
                      {a.status === 'scheduled' && (
                        <button onClick={()=>updateStatus(a.id,'confirmed')}
                          className="text-xs font-semibold text-emerald-600 border border-emerald-200 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 whitespace-nowrap">
                          Confirm
                        </button>
                      )}
                      {['scheduled','confirmed'].includes(a.status) && (
                        <button onClick={()=>updateStatus(a.id,'in_chair')}
                          className="text-xs font-semibold text-blue-600 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 whitespace-nowrap">
                          Check In
                        </button>
                      )}
                      <OpenVisitButton appt={a} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <NewAppointmentModal
          date={date}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load(date) }}
        />
      )}
    </div>
  )
}

// ── OPEN / CREATE VISIT BUTTON ───────────────────────────────
function OpenVisitButton({ appt }: { appt: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function openVisit() {
    setLoading(true)
    const sb = createClient()

    // Check if a visit already exists for this appointment
    const { data: existing } = await sb
      .from('clinical_visits')
      .select('id')
      .eq('appointment_id', appt.id)
      .maybeSingle()

    if (existing?.id) {
      router.push(`/clinical/${existing.id}`)
      return
    }

    // No visit yet — create one now
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setLoading(false); return }

    const { data: staff } = await sb
      .from('staff_profiles')
      .select('id, clinic_id')
      .eq('id', user.id)
      .single()

    if (!staff) { toast.error('Staff profile not found'); setLoading(false); return }

    const { data: visit, error } = await sb
      .from('clinical_visits')
      .insert({
        clinic_id:       staff.clinic_id,
        patient_id:      appt.patient_id,
        appointment_id:  appt.id,
        staff_id:        appt.staff_id,
        workflow_step:   'consultation',
        chief_complaint: appt.chief_complaint || appt.procedure_type || '',
      })
      .select('id')
      .single()

    if (error || !visit) {
      toast.error(error?.message || 'Failed to open visit')
      setLoading(false)
      return
    }

    // Mark appointment as in_chair
    await sb.from('appointments').update({ status: 'in_chair' }).eq('id', appt.id)

    router.push(`/clinical/${visit.id}`)
  }

  return (
    <button
      onClick={openVisit}
      disabled={loading}
      className="text-xs font-semibold text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 whitespace-nowrap disabled:opacity-50"
    >
      {loading ? '…' : 'Open →'}
    </button>
  )
}

// ── BOOKING MODAL ─────────────────────────────────────────────
function NewAppointmentModal({ date, onClose, onSaved }: { date:string; onClose:()=>void; onSaved:()=>void }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [staffList, setStaffList] = useState<any[]>([])
  const [chairs, setChairs] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [showList, setShowList] = useState(false)
  const [patient, setPatient] = useState<any>(null)
  const [f, setF] = useState({
    staff_id:'', chair_id:'',
    scheduled_at:`${date}T09:00`,
    duration_minutes:60,
    procedure_type:'', chief_complaint:'',
    source:'walk_in', notes:'',
  })

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const [s,c] = await Promise.all([
        sb.from('staff_profiles').select('id,full_name,role').eq('is_active',true).order('full_name'),
        sb.from('chairs').select('id,label,type').eq('is_active',true).order('label'),
      ])
      if (s.data?.length) { setStaffList(s.data); setF(p=>({...p,staff_id:s.data![0].id})) }
      if (c.data) setChairs(c.data)
    })()
  }, [])

  useEffect(() => {
    if (!query.trim()) { setPatients([]); setShowList(false); return }
    const t = setTimeout(async () => {
      const sb = createClient()
      const { data } = await sb.from('patients')
        .select('id,full_name,patient_type,contact_number,allergies')
        .eq('is_active',true).ilike('full_name',`%${query}%`).limit(8)
      setPatients(data||[])
      setShowList(true)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  async function book() {
    if (!patient)     { toast.error('Select a patient'); return }
    if (!f.staff_id)  { toast.error('Select a provider'); return }
    if (!f.scheduled_at) { toast.error('Set date and time'); return }

    setSaving(true)
    const sb = createClient()
    const { data:{ user } } = await sb.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setSaving(false); return }

    const { data:st } = await sb.from('staff_profiles').select('clinic_id').eq('id',user.id).single()
    if (!st) { toast.error('Staff profile not found'); setSaving(false); return }

    const row: any = {
      clinic_id:        st.clinic_id,
      patient_id:       patient.id,
      staff_id:         f.staff_id,
      created_by:       user.id,
      scheduled_at:     new Date(f.scheduled_at).toISOString(),
      duration_minutes: Number(f.duration_minutes)||60,
      procedure_type:   f.procedure_type||null,
      chief_complaint:  f.chief_complaint||null,
      source:           f.source,
      status:           'scheduled',
      notes:            f.notes||null,
    }
    if (f.chair_id) row.chair_id = f.chair_id

    const { error } = await sb.from('appointments').insert(row)
    if (error) { toast.error(error.message); setSaving(false); return }

    toast.success(`Booked: ${patient.full_name}`)
    setSaving(false)
    onSaved()
  }

  const set = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setF(p=>({...p,[k]:e.target.value}))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">New Appointment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        <div className="space-y-4">
          {/* Patient search */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Patient *</label>
            {patient ? (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                <div>
                  <div className="text-sm font-semibold">{patient.full_name}</div>
                  <div className="text-xs text-slate-500">
                    {patient.patient_type==='dental'?'🦷':'🐾'} {patient.patient_type}
                    {patient.contact_number && ` · ${patient.contact_number}`}
                    {patient.allergies && <span className="ml-2 text-red-600 font-semibold">⚠️ {patient.allergies}</span>}
                  </div>
                </div>
                <button onClick={()=>{setPatient(null);setQuery('')}} className="text-slate-400 hover:text-red-500 font-bold ml-3">✕</button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 focus-within:border-blue-400">
                  <Search size={14} className="text-slate-400"/>
                  <input value={query} onChange={e=>setQuery(e.target.value)}
                    onFocus={()=>patients.length>0&&setShowList(true)}
                    placeholder="Type patient name…"
                    className="flex-1 outline-none text-sm placeholder:text-slate-400"/>
                </div>
                {showList && patients.length>0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-20 mt-1 max-h-48 overflow-y-auto">
                    {patients.map((p:any)=>(
                      <div key={p.id} onClick={()=>{setPatient(p);setQuery(p.full_name);setShowList(false)}}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0">
                        <div className="text-sm font-semibold">{p.full_name}</div>
                        <div className="text-xs text-slate-500">
                          {p.patient_type==='dental'?'🦷':'🐾'} {p.patient_type}
                          {p.contact_number&&` · ${p.contact_number}`}
                          {p.allergies&&<span className="ml-1 text-red-600 font-semibold">⚠️ {p.allergies}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {query.length>1 && patients.length===0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-20 mt-1 px-4 py-3 text-sm text-slate-500">
                    No patients found.{' '}
                    <button onClick={()=>router.push('/patients')} className="text-blue-600 font-semibold hover:underline">Add patient →</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Provider */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Provider *</label>
            <select value={f.staff_id} onChange={set('staff_id')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
              <option value="">Select provider…</option>
              {staffList.map(s=><option key={s.id} value={s.id}>{s.full_name} — {s.role?.replace('_',' ')}</option>)}
            </select>
          </div>

          {/* Date/time + duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date & Time *</label>
              <input type="datetime-local" value={f.scheduled_at} onChange={set('scheduled_at')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Duration</label>
              <select value={f.duration_minutes} onChange={e=>setF(p=>({...p,duration_minutes:Number(e.target.value)}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
                {[15,30,45,60,90,120].map(d=><option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          {/* Chair */}
          {chairs.length>0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Chair / Room</label>
              <select value={f.chair_id} onChange={set('chair_id')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
                <option value="">No chair assigned</option>
                {chairs.map(c=><option key={c.id} value={c.id}>{c.label} ({c.type})</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Procedure / Reason</label>
            <input value={f.procedure_type} onChange={set('procedure_type')}
              placeholder="e.g. Teeth Cleaning, Root Canal, Vaccination…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Chief Complaint</label>
            <input value={f.chief_complaint} onChange={set('chief_complaint')}
              placeholder="Patient's presenting complaint…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Booking Source</label>
              <select value={f.source} onChange={set('source')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
                <option value="walk_in">Walk-in</option>
                <option value="phone">Phone</option>
                <option value="online">Online</option>
                <option value="messenger">Messenger</option>
                <option value="follow_up">Follow-up</option>
                <option value="referral">Referral</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <input value={f.notes} onChange={set('notes')} placeholder="Optional…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"/>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={book} disabled={saving||!patient||!f.staff_id}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Booking…' : 'Book Appointment'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}
