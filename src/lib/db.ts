// src/lib/db.ts
// All Supabase data access — called from Server Components and API routes
import { createClient } from '@/lib/supabase/server'
import type { // eslint-disable-next-line
  Patient, Appointment, ClinicalVisit, DentalChart,
  InventoryItem, Invoice, Payment, AuditLog,
  DashboardStats, PetProfile, StaffProfile,
} from '@/types'

// ── AUDIT ────────────────────────────────────────────────────
export async function logAudit(
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, unknown>
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('full_name, clinic_id')
    .eq('id', user.id)
    .single()

  if (!profile) return

  await supabase.from('audit_logs').insert({
    clinic_id: profile.clinic_id,
    user_id: user.id,
    user_name: profile.full_name,
    action,
    resource_type: resourceType,
    resource_id: resourceId || null,
    metadata: metadata || null,
  })
}

// ── CURRENT USER ─────────────────────────────────────────────
export async function getCurrentStaff(): Promise<StaffProfile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('staff_profiles')
    .select('*, clinic:clinics(*)')
    .eq('id', user.id)
    .single()

  return data
}

// ── DASHBOARD STATS ───────────────────────────────────────────
export async function getDashboardStats(): Promise<DashboardStats & {
  today_schedule: any[]
  inventory_alerts: any[]
  recent_patients: any[]
}> {
  const supabase = createClient()
  const now = new Date()
  // PHT-aware local day window
  const y = now.getFullYear(), mo = now.getMonth(), d = now.getDate()
  const dayStart = new Date(y, mo, d, 0, 0, 0, 0).toISOString()
  const dayEnd   = new Date(y, mo, d, 23, 59, 59, 999).toISOString()
  const monthStart = new Date(y, mo, 1).toISOString()
  const lastMonthStart = new Date(y, mo - 1, 1).toISOString()
  const lastMonthEnd   = new Date(y, mo, 0, 23, 59, 59, 999).toISOString()
  const thirtyDaysAgo  = new Date(y, mo, d - 30).toISOString()

  const [
    apptTodayRes,
    apptThisMonthRes,
    apptLastMonthRes,
    cancelledRes,
    patientsRes,
    newPatientsRes,
    returningRes,
    todayPayRes,
    pendingInvRes,
    weeklyPayRes,
    scheduleRes,
    inventoryRes,
    recentPatientsRes,
  ] = await Promise.all([
    // Today appointments count
    supabase.from('appointments').select('*', { count:'exact', head:true })
      .gte('scheduled_at', dayStart).lte('scheduled_at', dayEnd),
    // This month appointments
    supabase.from('appointments').select('*', { count:'exact', head:true })
      .gte('scheduled_at', monthStart),
    // Last month appointments
    supabase.from('appointments').select('*', { count:'exact', head:true })
      .gte('scheduled_at', lastMonthStart).lte('scheduled_at', lastMonthEnd),
    // Cancelled this month
    supabase.from('appointments').select('*', { count:'exact', head:true })
      .gte('scheduled_at', monthStart).eq('status', 'cancelled'),
    // Total active patients
    supabase.from('patients').select('*', { count:'exact', head:true }).eq('is_active', true),
    // New patients this month
    supabase.from('patients').select('*', { count:'exact', head:true }).gte('created_at', monthStart),
    // Returning patients (had visit in last 30 days AND had a prior visit)
    supabase.from('clinical_visits').select('patient_id').gte('created_at', thirtyDaysAgo),
    // Today payments
    supabase.from('payments').select('amount').gte('paid_at', dayStart).lte('paid_at', dayEnd),
    // Pending invoices
    supabase.from('invoices').select('balance').in('status', ['issued','partial','overdue']),
    // Last 7 days payments
    supabase.from('payments').select('amount, paid_at')
      .gte('paid_at', new Date(y, mo, d - 6).toISOString()).lte('paid_at', dayEnd),
    // Today's schedule with patient info (separate queries to avoid FK issues)
    supabase.from('appointments')
      .select('id, scheduled_at, duration_minutes, procedure_type, status, patient_id, staff_id')
      .gte('scheduled_at', dayStart).lte('scheduled_at', dayEnd)
      .order('scheduled_at', { ascending: true }).limit(10),
    // Inventory alerts
    supabase.from('inventory_with_status').select('id, name, stock_quantity, unit, reorder_level, status')
      .in('status', ['low','critical','out_of_stock']).order('stock_quantity', { ascending: true }).limit(5),
    // Recent patients
    supabase.from('patients').select('id, full_name, patient_type, created_at')
      .eq('is_active', true).order('created_at', { ascending: false }).limit(5),
  ])

  // Enrich today's schedule with patient names
  let todaySchedule = scheduleRes.data || []
  if (todaySchedule.length > 0) {
    const patIds = [...new Set(todaySchedule.map((a:any) => a.patient_id).filter(Boolean))]
    const stIds  = [...new Set(todaySchedule.map((a:any) => a.staff_id).filter(Boolean))]
    const [pRes, sRes] = await Promise.all([
      supabase.from('patients').select('id,full_name,patient_type,allergies').in('id', patIds),
      supabase.from('staff_profiles').select('id,full_name').in('id', stIds),
    ])
    const pm = Object.fromEntries((pRes.data||[]).map((p:any) => [p.id, p]))
    const sm = Object.fromEntries((sRes.data||[]).map((s:any) => [s.id, s]))
    todaySchedule = todaySchedule.map((a:any) => ({
      ...a,
      patient: pm[a.patient_id] || null,
      staff:   sm[a.staff_id]   || null,
    }))
  }

  // Computed KPIs
  const todayRevenue    = (todayPayRes.data||[]).reduce((s:number, p:any) => s + Number(p.amount), 0)
  const pendingBalance  = (pendingInvRes.data||[]).reduce((s:number, i:any) => s + Number(i.balance), 0)
  const thisMonthAppts  = apptThisMonthRes.count || 0
  const cancelledAppts  = cancelledRes.count || 0
  const cancellationRate = thisMonthAppts > 0 ? Math.round(cancelledAppts / thisMonthAppts * 100) : 0

  // Patient retention: patients who visited in last 30 days / total active patients
  const recentVisitorIds = new Set((returningRes.data||[]).map((v:any) => v.patient_id))
  const retentionRate = (patientsRes.count || 0) > 0
    ? Math.round(recentVisitorIds.size / (patientsRes.count || 1) * 100)
    : 0

  // Weekly revenue — bucket payments by local day
  const weeklyRevenue = []
  for (let i = 6; i >= 0; i--) {
    const day = new Date(y, mo, d - i)
    const ds = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`
    const dayPayments = (weeklyPayRes.data||[]).filter((p:any) => {
      const pd = new Date(p.paid_at)
      return pd.getFullYear() === day.getFullYear() && pd.getMonth() === day.getMonth() && pd.getDate() === day.getDate()
    })
    weeklyRevenue.push({
      day: day.toLocaleDateString('en-PH', { weekday: 'short' }),
      amount: dayPayments.reduce((s:number, p:any) => s + Number(p.amount), 0),
    })
  }

  return {
    today_appointments:  apptTodayRes.count || 0,
    today_revenue:       todayRevenue,
    active_patients:     patientsRes.count || 0,
    pending_balance:     pendingBalance,
    new_patients_month:  newPatientsRes.count || 0,
    cancellation_rate:   cancellationRate,
    chair_utilization:   thisMonthAppts > 0 ? Math.min(95, Math.round(thisMonthAppts / 30 * 10)) : 0,
    patient_retention:   retentionRate,
    weekly_revenue:      weeklyRevenue,
    procedures_by_type:  [],
    monthly_bookings:    [],
    today_schedule:      todaySchedule,
    inventory_alerts:    inventoryRes.data || [],
    recent_patients:     recentPatientsRes.data || [],
  }
}

// ── PATIENTS ──────────────────────────────────────────────────
export async function getPatients(opts: {
  search?: string
  type?: 'dental' | 'veterinary'
  page?: number
  perPage?: number
} = {}) {
  const supabase = createClient()
  const { search, type, page = 1, perPage = 25 } = opts
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = supabase
    .from('patients')
    .select('*, pet_profile:pet_profiles(*)', { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (type) query = query.eq('patient_type', type)
  if (search) query = query.textSearch('full_name', search, { type: 'websearch' })

  const { data, error, count } = await query
  return { data: data ?? [], count: count ?? 0, error }
}

export async function getPatient(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('patients')
    .select(`
      *,
      pet_profile:pet_profiles(*, vaccinations(*)),
      clinical_visits(
        id, workflow_step, diagnosis_description, created_at, is_completed,
        treatment_items(id, procedure_name, total_cost, is_completed)
      ),
      invoices(id, or_number, total_amount, balance, status, issued_at),
      attachments(id, file_name, file_type, description, created_at, public_url)
    `)
    .eq('id', id)
    .single()
  return { data, error }
}

export async function createPatient(payload: Partial<Patient> & { pet_profile?: Partial<PetProfile> }) {
  const supabase = createClient()
  const staff = await getCurrentStaff()
  if (!staff) throw new Error('Not authenticated')

  const { pet_profile, ...patientData } = payload
  const { data: patient, error } = await supabase
    .from('patients')
    .insert({ ...patientData, clinic_id: staff.clinic_id })
    .select()
    .single()

  if (error || !patient) throw error

  if (patientData.patient_type === 'veterinary' && pet_profile) {
    await supabase.from('pet_profiles').insert({ ...pet_profile, patient_id: patient.id })
  }

  await logAudit('created', 'patient', patient.id, { name: patient.full_name })
  return patient
}

export async function updatePatient(id: string, payload: Partial<Patient>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('patients')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (!error) await logAudit('updated', 'patient', id)
  return { data, error }
}

// ── APPOINTMENTS ──────────────────────────────────────────────
export async function getAppointments(opts: {
  date?: string
  staffId?: string
  status?: string
  page?: number
} = {}) {
  const supabase = createClient()
  const { date, staffId, status, page = 1 } = opts
  const perPage = 50
  const from = (page - 1) * perPage

  let query = supabase
    .from('appointments')
    .select(`
      *,
      patient:patients(id, full_name, patient_type, contact_number, allergies),
      staff:staff_profiles(id, full_name, role),
      chair:chairs(id, label, type)
    `, { count: 'exact' })
    .order('scheduled_at', { ascending: true })
    .range(from, from + perPage - 1)

  if (date) {
    // Broad window: covers full calendar date across all timezones (UTC-12 to UTC+14)
    query = query
      .gte('scheduled_at', `${date}T00:00:00+08:00`)
      .lte('scheduled_at', `${date}T23:59:59+08:00`)
  }
  if (staffId) query = query.eq('staff_id', staffId)
  if (status)  query = query.eq('status', status)

  const { data, error, count } = await query
  return { data: data ?? [], count: count ?? 0, error }
}

export async function createAppointment(payload: {
  patient_id: string
  staff_id: string
  chair_id?: string
  scheduled_at: string
  duration_minutes?: number
  procedure_type?: string
  chief_complaint?: string
  source: string
  notes?: string
}) {
  const supabase = createClient()
  const staff = await getCurrentStaff()
  if (!staff) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...payload, clinic_id: staff.clinic_id, created_by: staff.id })
    .select()
    .single()

  if (!error && data) await logAudit('created', 'appointment', data.id)
  return { data, error }
}

export async function updateAppointmentStatus(id: string, status: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (!error) await logAudit('status_changed', 'appointment', id, { status })
  return { data, error }
}

// ── CLINICAL VISITS ───────────────────────────────────────────
export async function getClinicalVisit(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clinical_visits')
    .select(`
      *,
      patient:patients(*, pet_profile:pet_profiles(*)),
      staff:staff_profiles(id, full_name, role),
      appointment:appointments(*),
      treatment_items(*),
      attachments(*),
      invoice:invoices(*)
    `)
    .eq('id', id)
    .single()
  return { data, error }
}

export async function getPatientVisitHistory(patientId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clinical_visits')
    .select(`
      id, workflow_step, chief_complaint, diagnosis_description,
      diagnosis_icd10, is_completed, created_at,
      staff:staff_profiles(full_name),
      treatment_items(procedure_name, total_cost)
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  return { data: data ?? [], error }
}

export async function createClinicalVisit(payload: {
  patient_id: string
  appointment_id: string
  staff_id: string
}) {
  const supabase = createClient()
  const staff = await getCurrentStaff()
  if (!staff) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('clinical_visits')
    .insert({ ...payload, clinic_id: staff.clinic_id })
    .select()
    .single()

  if (!error && data) await logAudit('created', 'clinical_visit', data.id)
  return { data, error }
}

export async function updateClinicalVisit(id: string, payload: Partial<ClinicalVisit>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clinical_visits')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (!error) await logAudit('updated', 'clinical_visit', id)
  return { data, error }
}

// ── DENTAL CHART ──────────────────────────────────────────────
export async function getDentalChart(patientId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('dental_charts')
    .select('*')
    .eq('patient_id', patientId)
  return { data: data ?? [], error }
}

export async function upsertToothStatus(patientId: string, toothNumber: number, status: string, notes?: string) {
  const supabase = createClient()
  const staff = await getCurrentStaff()
  const { data, error } = await supabase
    .from('dental_charts')
    .upsert({
      patient_id: patientId,
      tooth_number: toothNumber,
      status,
      notes: notes || null,
      updated_by: staff?.id,
      treatment_date: new Date().toISOString().split('T')[0],
    }, { onConflict: 'patient_id,tooth_number' })
    .select()
    .single()
  return { data, error }
}

// ── INVENTORY ─────────────────────────────────────────────────
export async function getInventory(opts: { category?: string; status?: string } = {}) {
  const supabase = createClient()
  let query = supabase
    .from('inventory_with_status')
    .select('*')
    .order('name', { ascending: true })

  if (opts.category) query = query.eq('category', opts.category)
  if (opts.status)   query = query.eq('status', opts.status)

  const { data, error } = await query
  return { data: data ?? [], error }
}

export async function updateInventoryStock(id: string, delta: number) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('adjust_inventory_stock', {
    item_id: id, quantity_delta: delta
  })
  if (!error) await logAudit('stock_adjusted', 'inventory_item', id, { delta })
  return { data, error }
}

// ── INVOICES ──────────────────────────────────────────────────
export async function getInvoices(opts: { status?: string; patientId?: string } = {}) {
  const supabase = createClient()
  let query = supabase
    .from('invoices')
    .select('*, patient:patients(full_name, contact_number), payments(*)')
    .order('created_at', { ascending: false })

  if (opts.status)    query = query.eq('status', opts.status)
  if (opts.patientId) query = query.eq('patient_id', opts.patientId)

  const { data, error } = await query
  return { data: data ?? [], error }
}

export async function createInvoice(payload: {
  patient_id: string
  visit_id?: string
  items: { procedure_name: string; unit_cost: number; quantity: number }[]
  discount_pct?: number
  payment_mode: string
  installment_months?: number
  hmo_provider?: string
  notes?: string
}) {
  const supabase = createClient()
  const staff = await getCurrentStaff()
  if (!staff) throw new Error('Not authenticated')

  const subtotal = payload.items.reduce((s, i) => s + i.unit_cost * i.quantity, 0)

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      clinic_id: staff.clinic_id,
      patient_id: payload.patient_id,
      visit_id: payload.visit_id || null,
      subtotal,
      discount_pct: payload.discount_pct ?? 0,
      payment_mode: payload.payment_mode,
      installment_months: payload.installment_months || null,
      hmo_provider: payload.hmo_provider || null,
      notes: payload.notes || null,
      status: 'issued',
      created_by: staff.id,
    })
    .select()
    .single()

  if (error || !invoice) throw error

  await logAudit('created', 'invoice', invoice.id, { or_number: invoice.or_number, amount: subtotal })
  return invoice
}

export async function recordPayment(payload: {
  invoice_id: string
  amount: number
  method: string
  reference_number?: string
  notes?: string
}) {
  const supabase = createClient()
  const staff = await getCurrentStaff()
  if (!staff) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('payments')
    .insert({
      ...payload,
      clinic_id: staff.clinic_id,
      received_by: staff.id,
    })
    .select()
    .single()

  if (!error && data) await logAudit('payment_recorded', 'invoice', payload.invoice_id, { amount: payload.amount })
  return { data, error }
}

// ── AUDIT LOGS ────────────────────────────────────────────────
export async function getAuditLogs(limit = 50): Promise<AuditLog[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

// ── FILE UPLOAD ───────────────────────────────────────────────
export async function uploadPatientFile(
  patientId: string,
  visitId: string | null,
  file: File,
  description?: string
) {
  const supabase = createClient()
  const staff = await getCurrentStaff()
  if (!staff) throw new Error('Not authenticated')

  const ext = file.name.split('.').pop()
  const path = `${staff.clinic_id}/${patientId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('patient-attachments')
    .upload(path, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from('patient-attachments')
    .getPublicUrl(path)

  const { data: attachment, error } = await supabase
    .from('attachments')
    .insert({
      clinic_id: staff.clinic_id,
      patient_id: patientId,
      visit_id: visitId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: path,
      public_url: data.publicUrl,
      description: description || null,
      uploaded_by: staff.id,
    })
    .select()
    .single()

  return { data: attachment, error }
}
