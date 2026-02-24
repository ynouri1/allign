-- ============================================================
-- wear_time_sessions — tracks individual aligner-wearing windows
-- A patient starts the chrono → row inserted with started_at.
-- Patient stops the chrono → ended_at is set.
-- Daily total = SUM of all durations for that calendar day.
-- ============================================================

CREATE TABLE public.wear_time_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Guard: ended_at must be after started_at
  CONSTRAINT chk_end_after_start CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- Fast lookups: "all sessions for this patient this day"
CREATE INDEX idx_wear_sessions_patient_day
  ON public.wear_time_sessions (patient_id, started_at);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.wear_time_sessions ENABLE ROW LEVEL SECURITY;

-- Patients: full CRUD on their own sessions
CREATE POLICY "patients_manage_own_sessions" ON public.wear_time_sessions
  FOR ALL
  TO authenticated
  USING (
    patient_id IN (
      SELECT p.id FROM public.patients p
      WHERE p.profile_id = public.get_profile_id(auth.uid())
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT p.id FROM public.patients p
      WHERE p.profile_id = public.get_profile_id(auth.uid())
    )
  );

-- Practitioners: read-only on assigned patients
CREATE POLICY "practitioners_read_assigned_sessions" ON public.wear_time_sessions
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT pp.patient_id FROM public.practitioner_patients pp
      JOIN public.practitioners pr ON pr.id = pp.practitioner_id
      WHERE pr.profile_id = public.get_profile_id(auth.uid())
    )
  );

-- Admins: full access
CREATE POLICY "admins_all_sessions" ON public.wear_time_sessions
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );
