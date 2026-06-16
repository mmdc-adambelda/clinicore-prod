-- ============================================================
-- 005_appointments_created_by_patients.sql
-- appointments.created_by was FK'd to staff_profiles(id), so a
-- patient booking their own appointment (created_by = auth.uid())
-- always violated appointments_created_by_fkey since patients have
-- no staff_profiles row. staff_profiles.id already references
-- auth.users(id), so repointing the FK there covers every existing
-- staff id while also allowing patient ids.
-- ============================================================

ALTER TABLE appointments DROP CONSTRAINT appointments_created_by_fkey;
ALTER TABLE appointments ADD CONSTRAINT appointments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id);
