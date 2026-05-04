-- ============================================================
-- CliniCore EMR — Supabase PostgreSQL Schema
-- Migration: 001_initial_schema.sql
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fast text search

-- ── ENUMS ────────────────────────────────────────────────────
CREATE TYPE clinic_type        AS ENUM ('dental', 'veterinary', 'both');
CREATE TYPE user_role          AS ENUM ('admin', 'dentist', 'veterinarian', 'front_desk', 'receptionist');
CREATE TYPE patient_type       AS ENUM ('dental', 'veterinary');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_chair', 'completed', 'cancelled', 'no_show', 'walk_in');
CREATE TYPE booking_source     AS ENUM ('online', 'phone', 'walk_in', 'messenger', 'follow_up', 'referral');
CREATE TYPE workflow_step      AS ENUM ('booking', 'consultation', 'diagnosis', 'treatment_plan', 'procedure', 'billing', 'follow_up');
CREATE TYPE tooth_status       AS ENUM ('healthy', 'treated', 'affected', 'crown', 'missing', 'implant', 'bridge', 'root_canal');
CREATE TYPE vaccination_status AS ENUM ('up_to_date', 'due_soon', 'overdue');
CREATE TYPE payment_mode       AS ENUM ('cash', 'installment_3', 'installment_6', 'insurance', 'philhealth', 'hmo');
CREATE TYPE payment_status     AS ENUM ('paid', 'partial', 'pending', 'overdue', 'waived');
CREATE TYPE invoice_status     AS ENUM ('draft', 'issued', 'partial', 'paid', 'overdue', 'cancelled');
CREATE TYPE inventory_status   AS ENUM ('ok', 'low', 'critical', 'out_of_stock');
CREATE TYPE sex_type           AS ENUM ('male', 'female', 'other');

-- ── CLINICS ───────────────────────────────────────────────────
CREATE TABLE clinics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  branch_name TEXT NOT NULL DEFAULT 'Main Branch',
  address     TEXT,
  phone       TEXT,
  email       TEXT,
  tin         TEXT,
  type        clinic_type NOT NULL DEFAULT 'both',
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── STAFF PROFILES ────────────────────────────────────────────
-- Links to Supabase auth.users
CREATE TABLE staff_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id      UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  role           user_role NOT NULL DEFAULT 'front_desk',
  specialty      TEXT,
  license_number TEXT,
  phone          TEXT,
  avatar_url     TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PATIENTS ──────────────────────────────────────────────────
CREATE TABLE patients (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id        UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_type     patient_type NOT NULL DEFAULT 'dental',
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  full_name        TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  date_of_birth    DATE,
  sex              sex_type,
  contact_number   TEXT,
  email            TEXT,
  address          TEXT,
  allergies        TEXT,
  medical_history  TEXT,
  emergency_contact TEXT,
  emergency_phone  TEXT,
  source           booking_source DEFAULT 'walk_in',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search index on patients
CREATE INDEX patients_search_idx ON patients USING GIN (
  to_tsvector('english', full_name || ' ' || COALESCE(contact_number, '') || ' ' || COALESCE(email, ''))
);
CREATE INDEX patients_clinic_idx ON patients(clinic_id);

-- ── PET PROFILES ──────────────────────────────────────────────
CREATE TABLE pet_profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id            UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE, -- owner
  pet_name              TEXT NOT NULL,
  species               TEXT NOT NULL,
  breed                 TEXT,
  weight_kg             DECIMAL(6,2),
  age_years             INTEGER,
  sex                   sex_type,
  color                 TEXT,
  microchip_number      TEXT,
  last_vaccination_date DATE,
  next_vaccination_due  DATE,
  vaccination_status    vaccination_status NOT NULL DEFAULT 'up_to_date',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── VACCINATIONS ──────────────────────────────────────────────
CREATE TABLE vaccinations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id           UUID NOT NULL REFERENCES pet_profiles(id) ON DELETE CASCADE,
  vaccine_name     TEXT NOT NULL,
  administered_date DATE NOT NULL,
  next_due_date    DATE,
  batch_number     TEXT,
  administered_by  TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CHAIRS / RESOURCES ────────────────────────────────────────
CREATE TABLE chairs (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  label     TEXT NOT NULL,
  type      TEXT NOT NULL DEFAULT 'dental',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── APPOINTMENTS ──────────────────────────────────────────────
CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id        UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  staff_id         UUID NOT NULL REFERENCES staff_profiles(id),
  chair_id         UUID REFERENCES chairs(id),
  scheduled_at     TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  procedure_type   TEXT,
  chief_complaint  TEXT,
  source           booking_source NOT NULL DEFAULT 'online',
  status           appointment_status NOT NULL DEFAULT 'scheduled',
  notes            TEXT,
  created_by       UUID NOT NULL REFERENCES staff_profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX appointments_clinic_date_idx ON appointments(clinic_id, scheduled_at);
CREATE INDEX appointments_staff_idx ON appointments(staff_id, scheduled_at);
CREATE INDEX appointments_patient_idx ON appointments(patient_id);

-- Prevent double-booking: same chair, same time slot
CREATE UNIQUE INDEX appointments_no_double_book
  ON appointments(chair_id, scheduled_at)
  WHERE status NOT IN ('cancelled', 'no_show') AND chair_id IS NOT NULL;

-- ── CLINICAL VISITS ───────────────────────────────────────────
CREATE TABLE clinical_visits (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id               UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id              UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id          UUID NOT NULL REFERENCES appointments(id),
  staff_id                UUID NOT NULL REFERENCES staff_profiles(id),
  workflow_step           workflow_step NOT NULL DEFAULT 'consultation',
  chief_complaint         TEXT,
  -- SOAP
  subjective              TEXT,
  objective               TEXT,
  assessment              TEXT,
  plan                    TEXT,
  -- Vitals
  blood_pressure          TEXT,
  temperature             DECIMAL(4,1),
  weight                  DECIMAL(6,2),
  pulse_rate              INTEGER,
  -- Diagnosis
  diagnosis_icd10         TEXT,
  diagnosis_description   TEXT,
  -- AI
  ai_suggestion_id        UUID,
  ai_suggestion_accepted  BOOLEAN NOT NULL DEFAULT FALSE,
  -- Status
  is_completed            BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX visits_patient_idx ON clinical_visits(patient_id, created_at DESC);
CREATE INDEX visits_clinic_idx ON clinical_visits(clinic_id, created_at DESC);

-- ── DENTAL CHART ──────────────────────────────────────────────
CREATE TABLE dental_charts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tooth_number     INTEGER NOT NULL CHECK (tooth_number BETWEEN 11 AND 85),
  status           tooth_status NOT NULL DEFAULT 'healthy',
  surface_affected TEXT,       -- M,D,O,B,L combinations
  notes            TEXT,
  treatment_date   DATE,
  updated_by       UUID REFERENCES staff_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, tooth_number)
);

-- ── TREATMENT ITEMS ───────────────────────────────────────────
CREATE TABLE treatment_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id         UUID NOT NULL REFERENCES clinical_visits(id) ON DELETE CASCADE,
  clinic_id        UUID NOT NULL REFERENCES clinics(id),
  procedure_name   TEXT NOT NULL,
  procedure_code   TEXT,
  tooth_number     INTEGER,
  quantity         INTEGER NOT NULL DEFAULT 1,
  unit_cost        DECIMAL(10,2) NOT NULL,
  total_cost       DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  materials_cost   DECIMAL(10,2) GENERATED ALWAYS AS (ROUND(quantity * unit_cost * 0.40, 2)) STORED,
  lab_cost         DECIMAL(10,2) GENERATED ALWAYS AS (ROUND(quantity * unit_cost * 0.30, 2)) STORED,
  professional_fee DECIMAL(10,2) GENERATED ALWAYS AS (ROUND(quantity * unit_cost * 0.30, 2)) STORED,
  notes            TEXT,
  is_completed     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INVENTORY ─────────────────────────────────────────────────
CREATE TABLE inventory_items (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id          UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  category           TEXT NOT NULL,
  unit               TEXT NOT NULL DEFAULT 'piece',
  stock_quantity     INTEGER NOT NULL DEFAULT 0,
  reorder_level      INTEGER NOT NULL DEFAULT 5,
  unit_cost          DECIMAL(10,2),
  supplier           TEXT,
  last_used_at       TIMESTAMPTZ,
  last_restocked_at  TIMESTAMPTZ,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Computed status view
CREATE VIEW inventory_with_status AS
  SELECT *,
    CASE
      WHEN stock_quantity = 0              THEN 'out_of_stock'::inventory_status
      WHEN stock_quantity <= reorder_level * 0.3 THEN 'critical'::inventory_status
      WHEN stock_quantity <= reorder_level THEN 'low'::inventory_status
      ELSE 'ok'::inventory_status
    END AS status
  FROM inventory_items;

-- ── TREATMENT INVENTORY USAGE ─────────────────────────────────
CREATE TABLE treatment_inventory_usage (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_item_id   UUID NOT NULL REFERENCES treatment_items(id) ON DELETE CASCADE,
  inventory_item_id   UUID NOT NULL REFERENCES inventory_items(id),
  quantity_used       INTEGER NOT NULL DEFAULT 1
);

-- ── INVOICES ──────────────────────────────────────────────────
CREATE SEQUENCE or_number_seq START 1000;

CREATE TABLE invoices (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id             UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id            UUID NOT NULL REFERENCES patients(id),
  visit_id              UUID REFERENCES clinical_visits(id),
  or_number             TEXT NOT NULL DEFAULT ('OR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('or_number_seq')::TEXT, 5, '0')),
  subtotal              DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_pct          DECIMAL(5,2) NOT NULL DEFAULT 0,
  discount_amount       DECIMAL(12,2) GENERATED ALWAYS AS (ROUND(subtotal * discount_pct / 100, 2)) STORED,
  total_amount          DECIMAL(12,2) GENERATED ALWAYS AS (ROUND(subtotal - (subtotal * discount_pct / 100), 2)) STORED,
  amount_paid           DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance               DECIMAL(12,2) GENERATED ALWAYS AS (ROUND(subtotal - (subtotal * discount_pct / 100) - amount_paid, 2)) STORED,
  payment_mode          payment_mode NOT NULL DEFAULT 'cash',
  installment_months    INTEGER,
  hmo_provider          TEXT,
  insurance_claim_number TEXT,
  status                invoice_status NOT NULL DEFAULT 'draft',
  notes                 TEXT,
  issued_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date              DATE,
  created_by            UUID NOT NULL REFERENCES staff_profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(or_number)
);

CREATE INDEX invoices_patient_idx ON invoices(patient_id);
CREATE INDEX invoices_clinic_status_idx ON invoices(clinic_id, status);

-- ── PAYMENTS ──────────────────────────────────────────────────
CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id       UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  clinic_id        UUID NOT NULL REFERENCES clinics(id),
  amount           DECIMAL(12,2) NOT NULL,
  method           TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  received_by      UUID NOT NULL REFERENCES staff_profiles(id),
  paid_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update invoice.amount_paid on payment insert
CREATE OR REPLACE FUNCTION update_invoice_amount_paid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET amount_paid = (
    SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id
  ),
  status = CASE
    WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id) = 0 THEN 'issued'
    WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id) >= total_amount THEN 'paid'
    ELSE 'partial'
  END,
  updated_at = NOW()
  WHERE id = NEW.invoice_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_payment_insert
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_amount_paid();

-- ── ATTACHMENTS ───────────────────────────────────────────────
CREATE TABLE attachments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id    UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_id     UUID REFERENCES clinical_visits(id),
  file_name    TEXT NOT NULL,
  file_type    TEXT NOT NULL,
  file_size    INTEGER NOT NULL,
  storage_path TEXT NOT NULL,   -- Supabase Storage object path
  public_url   TEXT,
  description  TEXT,
  uploaded_by  UUID NOT NULL REFERENCES staff_profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AI SUGGESTIONS ────────────────────────────────────────────
CREATE TABLE ai_suggestions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id             UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  visit_id              UUID REFERENCES clinical_visits(id),
  patient_id            UUID NOT NULL REFERENCES patients(id),
  raw_input             TEXT NOT NULL,
  suggested_diagnosis   TEXT,
  suggested_icd10       TEXT,
  suggested_plan        TEXT,
  soap_subjective       TEXT,
  soap_objective        TEXT,
  soap_assessment       TEXT,
  soap_plan             TEXT,
  medication_alerts     TEXT,
  confidence_score      DECIMAL(4,3),
  similar_cases_count   INTEGER,
  accepted              BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_by           UUID REFERENCES staff_profiles(id),
  accepted_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AUDIT LOG ─────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id     UUID NOT NULL REFERENCES clinics(id),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  user_name     TEXT NOT NULL,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   UUID,
  ip_address    INET,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_log_clinic_idx ON audit_logs(clinic_id, created_at DESC);

-- ── UPDATED_AT TRIGGERS ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON clinics          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON staff_profiles   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON patients         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON pet_profiles     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON appointments     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON clinical_visits  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON inventory_items  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON invoices         FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Every table locked to the user's clinic_id
-- ══════════════════════════════════════════════════════════════

ALTER TABLE clinics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccinations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chairs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_visits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_charts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's clinic_id
CREATE OR REPLACE FUNCTION auth_clinic_id()
RETURNS UUID AS $$
  SELECT clinic_id FROM staff_profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM staff_profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Clinic: users see only their clinic
CREATE POLICY clinic_isolation ON clinics
  USING (id = auth_clinic_id());

-- Staff: see own clinic's staff
CREATE POLICY staff_isolation ON staff_profiles
  USING (clinic_id = auth_clinic_id());

-- Patients: clinic isolation
CREATE POLICY patients_isolation ON patients
  FOR ALL USING (clinic_id = auth_clinic_id());

-- Pet profiles: via patient's clinic
CREATE POLICY pet_isolation ON pet_profiles
  FOR ALL USING (
    patient_id IN (SELECT id FROM patients WHERE clinic_id = auth_clinic_id())
  );

CREATE POLICY vacc_isolation ON vaccinations
  FOR ALL USING (
    pet_id IN (SELECT p.id FROM pet_profiles p JOIN patients pa ON pa.id = p.patient_id WHERE pa.clinic_id = auth_clinic_id())
  );

-- Appointments: clinic isolation
CREATE POLICY appt_isolation ON appointments
  FOR ALL USING (clinic_id = auth_clinic_id());

-- Clinical visits: clinic isolation
CREATE POLICY visits_isolation ON clinical_visits
  FOR ALL USING (clinic_id = auth_clinic_id());

-- Dental charts: via patient
CREATE POLICY dental_isolation ON dental_charts
  FOR ALL USING (
    patient_id IN (SELECT id FROM patients WHERE clinic_id = auth_clinic_id())
  );

-- Treatment items: via visit
CREATE POLICY treatment_isolation ON treatment_items
  FOR ALL USING (clinic_id = auth_clinic_id());

-- Inventory: clinic isolation
CREATE POLICY inventory_isolation ON inventory_items
  FOR ALL USING (clinic_id = auth_clinic_id());

-- Invoices: clinic isolation
CREATE POLICY invoice_isolation ON invoices
  FOR ALL USING (clinic_id = auth_clinic_id());

CREATE POLICY payment_isolation ON payments
  FOR ALL USING (clinic_id = auth_clinic_id());

-- Attachments: clinic isolation
CREATE POLICY attachment_isolation ON attachments
  FOR ALL USING (clinic_id = auth_clinic_id());

CREATE POLICY ai_isolation ON ai_suggestions
  FOR ALL USING (clinic_id = auth_clinic_id());

CREATE POLICY audit_isolation ON audit_logs
  FOR ALL USING (clinic_id = auth_clinic_id());
  -- Only admin can read audit logs
  -- Additional policy for admin-only:
  -- USING (clinic_id = auth_clinic_id() AND auth_user_role() = 'admin');

-- ── STORAGE BUCKETS ───────────────────────────────────────────
-- Run in Supabase Storage tab, or via this SQL:
INSERT INTO storage.buckets (id, name, public) VALUES
  ('patient-attachments', 'patient-attachments', false),
  ('clinic-logos',        'clinic-logos',         true);

-- Storage RLS: users can only access their clinic's files
CREATE POLICY "clinic staff access attachments"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'patient-attachments' AND
    (storage.foldername(name))[1] = auth_clinic_id()::text
  );

-- ── SEED: DEFAULT PROCEDURE TEMPLATES ─────────────────────────
-- These are just reference data, not patient data
CREATE TABLE procedure_templates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_type  clinic_type NOT NULL,
  name         TEXT NOT NULL,
  code         TEXT,
  default_cost DECIMAL(10,2),
  duration_min INTEGER DEFAULT 60,
  category     TEXT
);

INSERT INTO procedure_templates (clinic_type, name, code, default_cost, duration_min, category) VALUES
-- Dental
('dental', 'Oral Prophylaxis (Cleaning)', 'D1110', 800, 30, 'Preventive'),
('dental', 'Composite Filling (1 surface)', 'D2140', 2500, 45, 'Restorative'),
('dental', 'Composite Filling (2 surfaces)', 'D2150', 3200, 60, 'Restorative'),
('dental', 'Root Canal Therapy - Anterior', 'D3310', 7000, 90, 'Endodontic'),
('dental', 'Root Canal Therapy - Posterior', 'D3330', 9000, 120, 'Endodontic'),
('dental', 'Tooth Extraction (simple)', 'D7110', 1500, 30, 'Surgical'),
('dental', 'Tooth Extraction (surgical)', 'D7210', 3500, 60, 'Surgical'),
('dental', 'PFM Crown', 'D2710', 8500, 60, 'Prosthetics'),
('dental', 'Full Porcelain Crown', 'D2740', 12000, 60, 'Prosthetics'),
('dental', 'Dental Implant', 'D6010', 45000, 90, 'Implants'),
('dental', 'Removable Partial Denture', 'D5211', 15000, 60, 'Prosthetics'),
('dental', 'Orthodontic Consultation', 'D8660', 500, 30, 'Orthodontics'),
-- Veterinary
('veterinary', 'Wellness Examination', 'V001', 500, 30, 'Preventive'),
('veterinary', 'Vaccination - Core (Dogs)', 'V010', 800, 20, 'Vaccination'),
('veterinary', 'Vaccination - Rabies', 'V011', 600, 20, 'Vaccination'),
('veterinary', 'Spay (Female)', 'V020', 5000, 120, 'Surgery'),
('veterinary', 'Neuter (Male)', 'V021', 3500, 90, 'Surgery'),
('veterinary', 'Dental Cleaning (Pet)', 'V030', 3000, 60, 'Dental'),
('veterinary', 'Blood Chemistry Panel', 'V040', 1800, 30, 'Diagnostics'),
('veterinary', 'X-Ray (per view)', 'V050', 800, 20, 'Diagnostics');
