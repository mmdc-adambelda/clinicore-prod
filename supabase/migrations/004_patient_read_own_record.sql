-- ============================================================
-- 004_patient_read_own_record.sql
-- Patients could book appointments but could not read their own
-- patients row, so PatientPortalProfile.patient came back null
-- (RLS silently dropped the embedded join) and crashed the portal
-- UI on login. This adds the missing read access.
-- ============================================================

CREATE POLICY patients_patient_read ON patients
  FOR SELECT USING (id = auth_patient_id());
