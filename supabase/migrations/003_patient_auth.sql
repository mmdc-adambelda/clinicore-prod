-- ============================================================
-- 003_patient_auth.sql
-- Patient portal: links auth.users → patients for self-service booking
-- ============================================================

-- ── patient_profiles ─────────────────────────────────────────
-- One row per patient who has a portal login.
-- patient_id references the existing patients table.
-- clinic_id is denormalized here for fast RLS checks.
CREATE TABLE IF NOT EXISTS patient_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id)  ON DELETE CASCADE,
  patient_id UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id  UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;

-- Patients can read/update their own profile
CREATE POLICY patient_profiles_self ON patient_profiles
  FOR ALL USING (id = auth.uid());

-- Staff in the same clinic can manage patient profiles
CREATE POLICY patient_profiles_staff ON patient_profiles
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM staff_profiles WHERE id = auth.uid()
    )
  );

-- ── Helper functions (SECURITY DEFINER to bypass RLS on lookup) ──
CREATE OR REPLACE FUNCTION auth_patient_clinic_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT clinic_id FROM patient_profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_patient_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT patient_id FROM patient_profiles WHERE id = auth.uid()
$$;

-- ── appointments: additional policies for patients ────────────
-- Allow patients to read appointment slots in their clinic
-- (used to show available / booked times on the booking page)
CREATE POLICY appointments_patient_read ON appointments
  FOR SELECT USING (clinic_id = auth_patient_clinic_id());

-- Allow patients to book appointments for themselves
CREATE POLICY appointments_patient_book ON appointments
  FOR INSERT WITH CHECK (
    clinic_id  = auth_patient_clinic_id()
    AND patient_id = auth_patient_id()
    AND created_by = auth.uid()
  );

-- Allow patients to cancel their own future appointments
CREATE POLICY appointments_patient_cancel ON appointments
  FOR UPDATE USING (
    patient_id = auth_patient_id()
    AND status IN ('scheduled', 'confirmed')
  )
  WITH CHECK (status = 'cancelled');

-- ── staff_profiles: patients can read dentists in their clinic ─
CREATE POLICY staff_profiles_patient_read ON staff_profiles
  FOR SELECT USING (
    clinic_id = auth_patient_clinic_id()
    AND role   = 'dentist'
    AND is_active = true
  );
