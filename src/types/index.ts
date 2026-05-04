// ============================================================
// CliniCore EMR — TypeScript Types
// Matches Supabase PostgreSQL schema exactly
// ============================================================

export type ClinicType = 'dental' | 'veterinary' | 'both'
export type UserRole = 'admin' | 'dentist' | 'veterinarian' | 'front_desk' | 'receptionist'
export type PatientType = 'dental' | 'veterinary'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_chair' | 'completed' | 'cancelled' | 'no_show' | 'walk_in'
export type BookingSource = 'online' | 'phone' | 'walk_in' | 'messenger' | 'follow_up' | 'referral'
export type WorkflowStep = 'booking' | 'consultation' | 'diagnosis' | 'treatment_plan' | 'procedure' | 'billing' | 'follow_up'
export type ToothStatus = 'healthy' | 'treated' | 'affected' | 'crown' | 'missing' | 'implant' | 'bridge' | 'root_canal'
export type VaccinationStatus = 'up_to_date' | 'due_soon' | 'overdue'
export type PaymentMode = 'cash' | 'installment_3' | 'installment_6' | 'insurance' | 'philhealth' | 'hmo'
export type PaymentStatus = 'paid' | 'partial' | 'pending' | 'overdue' | 'waived'
export type InvoiceStatus = 'draft' | 'issued' | 'partial' | 'paid' | 'overdue' | 'cancelled'
export type InventoryStatus = 'ok' | 'low' | 'critical' | 'out_of_stock'
export type Sex = 'male' | 'female' | 'other'

// ── CLINIC ──────────────────────────────────────────────────
export interface Clinic {
  id: string
  name: string
  branch_name: string
  address: string
  phone: string
  email: string
  tin: string
  type: ClinicType
  logo_url: string | null
  created_at: string
  updated_at: string
}

// ── STAFF / USER PROFILE ────────────────────────────────────
export interface StaffProfile {
  id: string                  // matches auth.users.id
  clinic_id: string
  full_name: string
  role: UserRole
  specialty: string | null
  license_number: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // relations
  clinic?: Clinic
}

// ── PATIENT ─────────────────────────────────────────────────
export interface Patient {
  id: string
  clinic_id: string
  patient_type: PatientType
  first_name: string
  last_name: string
  full_name: string           // generated column
  date_of_birth: string | null
  sex: Sex | null
  contact_number: string | null
  email: string | null
  address: string | null
  allergies: string | null
  medical_history: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  source: BookingSource | null
  is_active: boolean
  created_at: string
  updated_at: string
  // relations
  clinic?: Clinic
  pet_profile?: PetProfile | null
  outstanding_balance?: number
}

// ── PET PROFILE ─────────────────────────────────────────────
export interface PetProfile {
  id: string
  patient_id: string          // links to patients table (owner record)
  pet_name: string
  species: string
  breed: string | null
  weight_kg: number | null
  age_years: number | null
  sex: Sex | null
  color: string | null
  microchip_number: string | null
  last_vaccination_date: string | null
  next_vaccination_due: string | null
  vaccination_status: VaccinationStatus
  created_at: string
  updated_at: string
  // relations
  owner?: Patient
  vaccinations?: Vaccination[]
}

// ── VACCINATION ─────────────────────────────────────────────
export interface Vaccination {
  id: string
  pet_id: string
  vaccine_name: string
  administered_date: string
  next_due_date: string | null
  batch_number: string | null
  administered_by: string | null
  notes: string | null
  created_at: string
}

// ── CHAIR / RESOURCE ────────────────────────────────────────
export interface Chair {
  id: string
  clinic_id: string
  label: string
  type: 'dental' | 'veterinary' | 'general'
  is_active: boolean
}

// ── APPOINTMENT ─────────────────────────────────────────────
export interface Appointment {
  id: string
  clinic_id: string
  patient_id: string
  staff_id: string
  chair_id: string | null
  scheduled_at: string        // ISO timestamp
  duration_minutes: number
  procedure_type: string | null
  chief_complaint: string | null
  source: BookingSource
  status: AppointmentStatus
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  // relations
  patient?: Patient
  staff?: StaffProfile
  chair?: Chair
  clinical_visit?: ClinicalVisit | null
}

// ── CLINICAL VISIT ───────────────────────────────────────────
export interface ClinicalVisit {
  id: string
  clinic_id: string
  patient_id: string
  appointment_id: string
  staff_id: string
  workflow_step: WorkflowStep
  chief_complaint: string | null
  // SOAP
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  // Vitals
  blood_pressure: string | null
  temperature: number | null
  weight: number | null
  pulse_rate: number | null
  // Diagnosis
  diagnosis_icd10: string | null
  diagnosis_description: string | null
  // AI
  ai_suggestion_id: string | null
  ai_suggestion_accepted: boolean
  // Status
  is_completed: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
  // relations
  patient?: Patient
  staff?: StaffProfile
  appointment?: Appointment
  treatment_items?: TreatmentItem[]
  attachments?: Attachment[]
  invoice?: Invoice | null
}

// ── DENTAL CHART ─────────────────────────────────────────────
export interface DentalChart {
  id: string
  patient_id: string
  tooth_number: number        // 11-48 (FDI notation)
  status: ToothStatus
  surface_affected: string | null  // M, D, O, B, L, etc.
  notes: string | null
  treatment_date: string | null
  updated_by: string | null
  updated_at: string
}

// ── TREATMENT ITEM ───────────────────────────────────────────
export interface TreatmentItem {
  id: string
  visit_id: string
  clinic_id: string
  procedure_name: string
  procedure_code: string | null
  tooth_number: number | null
  quantity: number
  unit_cost: number
  total_cost: number
  materials_cost: number      // 40% of total
  lab_cost: number            // 30% of total
  professional_fee: number    // 30% of total
  notes: string | null
  is_completed: boolean
  created_at: string
  // relations
  inventory_items_used?: TreatmentInventoryUsage[]
}

// ── TREATMENT INVENTORY USAGE ────────────────────────────────
export interface TreatmentInventoryUsage {
  id: string
  treatment_item_id: string
  inventory_item_id: string
  quantity_used: number
  // relations
  inventory_item?: InventoryItem
}

// ── INVOICE ──────────────────────────────────────────────────
export interface Invoice {
  id: string
  clinic_id: string
  patient_id: string
  visit_id: string | null
  or_number: string           // auto-generated
  subtotal: number
  discount_pct: number
  discount_amount: number
  total_amount: number
  amount_paid: number
  balance: number
  payment_mode: PaymentMode
  installment_months: number | null
  hmo_provider: string | null
  insurance_claim_number: string | null
  status: InvoiceStatus
  notes: string | null
  issued_at: string
  due_date: string | null
  created_by: string
  created_at: string
  updated_at: string
  // relations
  patient?: Patient
  visit?: ClinicalVisit
  payments?: Payment[]
  items?: TreatmentItem[]
}

// ── PAYMENT ──────────────────────────────────────────────────
export interface Payment {
  id: string
  invoice_id: string
  clinic_id: string
  amount: number
  method: 'cash' | 'gcash' | 'bank_transfer' | 'card' | 'insurance'
  reference_number: string | null
  received_by: string
  paid_at: string
  notes: string | null
  created_at: string
}

// ── INVENTORY ITEM ───────────────────────────────────────────
export interface InventoryItem {
  id: string
  clinic_id: string
  name: string
  category: string
  unit: string
  stock_quantity: number
  reorder_level: number
  unit_cost: number | null
  supplier: string | null
  status: InventoryStatus     // computed or stored
  last_used_at: string | null
  last_restocked_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ── ATTACHMENT ────────────────────────────────────────────────
export interface Attachment {
  id: string
  clinic_id: string
  patient_id: string
  visit_id: string | null
  file_name: string
  file_type: string
  file_size: number
  storage_path: string        // Supabase Storage path
  public_url: string | null
  description: string | null
  uploaded_by: string
  created_at: string
}

// ── AI SUGGESTION ─────────────────────────────────────────────
export interface AISuggestion {
  id: string
  clinic_id: string
  visit_id: string | null
  patient_id: string
  raw_input: string
  suggested_diagnosis: string | null
  suggested_icd10: string | null
  suggested_plan: string | null
  soap_subjective: string | null
  soap_objective: string | null
  soap_assessment: string | null
  soap_plan: string | null
  medication_alerts: string | null
  confidence_score: number | null
  similar_cases_count: number | null
  accepted: boolean
  accepted_by: string | null
  accepted_at: string | null
  created_at: string
}

// ── AUDIT LOG ─────────────────────────────────────────────────
export interface AuditLog {
  id: string
  clinic_id: string
  user_id: string
  user_name: string
  action: string
  resource_type: string
  resource_id: string | null
  ip_address: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// ── API RESPONSE TYPES ────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  per_page: number
  total_pages: number
}

// ── FORM TYPES ────────────────────────────────────────────────
export interface PatientFormData {
  patient_type: PatientType
  first_name: string
  last_name: string
  date_of_birth?: string
  sex?: Sex
  contact_number?: string
  email?: string
  address?: string
  allergies?: string
  medical_history?: string
  emergency_contact?: string
  emergency_phone?: string
  source?: BookingSource
  // vet only
  pet_name?: string
  species?: string
  breed?: string
  weight_kg?: number
  age_years?: number
}

export interface AppointmentFormData {
  patient_id: string
  staff_id: string
  chair_id?: string
  scheduled_at: string
  duration_minutes: number
  procedure_type?: string
  chief_complaint?: string
  source: BookingSource
  notes?: string
}

export interface ClinicalNoteFormData {
  chief_complaint?: string
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
  blood_pressure?: string
  temperature?: number
  weight?: number
  pulse_rate?: number
  diagnosis_icd10?: string
  diagnosis_description?: string
}

export interface InvoiceFormData {
  patient_id: string
  visit_id?: string
  items: { procedure_name: string; unit_cost: number; quantity: number; tooth_number?: number }[]
  discount_pct: number
  payment_mode: PaymentMode
  installment_months?: number
  hmo_provider?: string
  notes?: string
}

// ── DASHBOARD STATS ───────────────────────────────────────────
export interface DashboardStats {
  today_appointments: number
  today_revenue: number
  active_patients: number
  pending_balance: number
  new_patients_month: number
  cancellation_rate: number
  chair_utilization: number
  patient_retention: number
  weekly_revenue: { day: string; amount: number }[]
  procedures_by_type: { name: string; count: number; revenue: number }[]
  monthly_bookings: { month: string; count: number }[]
}
