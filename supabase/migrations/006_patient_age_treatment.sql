-- ============================================================
-- 006_patient_age_treatment.sql
-- Adds age (integer) and treatment (text) columns to patients.
-- age is stored directly since exact DOB is not always known in
-- clinic workflows. treatment records the patient's current or
-- primary treatment (free text) and is filterable on the list page.
-- ============================================================

ALTER TABLE patients ADD COLUMN IF NOT EXISTS age       INTEGER;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS treatment TEXT;

CREATE INDEX IF NOT EXISTS patients_treatment_idx ON patients(clinic_id, treatment);
