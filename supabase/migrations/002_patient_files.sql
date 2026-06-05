-- ══════════════════════════════════════════════════════════════
-- 002_patient_files
-- Stores metadata for X-ray images and lab result files uploaded
-- to Google Drive on behalf of a patient.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE patient_files (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id  UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  file_url    TEXT        NOT NULL,                        -- Google Drive webViewLink
  file_id     TEXT        NOT NULL,                        -- Google Drive file ID (for deletion)
  file_name   TEXT        NOT NULL,
  file_type   TEXT        NOT NULL CHECK (file_type IN ('xray', 'lab_result')),
  notes       TEXT,
  uploaded_by UUID        NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX patient_files_patient_id_idx ON patient_files (patient_id);

-- ── Row-Level Security ─────────────────────────────────────────
ALTER TABLE patient_files ENABLE ROW LEVEL SECURITY;

-- Clinic staff can see files for patients in their clinic
CREATE POLICY files_isolation ON patient_files
  FOR ALL USING (
    patient_id IN (SELECT id FROM patients WHERE clinic_id = auth_clinic_id())
  );
