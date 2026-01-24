-- Allow patients to view alerts about themselves
CREATE POLICY "Patients can view own alerts"
ON public.practitioner_alerts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = practitioner_alerts.patient_id
    AND p.profile_id = get_profile_id(auth.uid())
  )
);