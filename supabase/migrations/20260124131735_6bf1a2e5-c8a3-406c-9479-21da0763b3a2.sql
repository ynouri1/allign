-- Create table to store aligner change history
CREATE TABLE public.aligner_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  from_aligner INTEGER NOT NULL,
  to_aligner INTEGER NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.aligner_changes ENABLE ROW LEVEL SECURITY;

-- Patients can insert their own changes
CREATE POLICY "Patients can insert own aligner changes"
ON public.aligner_changes
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM patients p
  WHERE p.id = aligner_changes.patient_id
  AND p.profile_id = get_profile_id(auth.uid())
));

-- Patients can view their own changes
CREATE POLICY "Patients can view own aligner changes"
ON public.aligner_changes
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM patients p
  WHERE p.id = aligner_changes.patient_id
  AND p.profile_id = get_profile_id(auth.uid())
));

-- Practitioners can view their patients' changes
CREATE POLICY "Practitioners can view patient aligner changes"
ON public.aligner_changes
FOR SELECT
USING (
  has_role(auth.uid(), 'practitioner'::app_role) AND
  EXISTS (
    SELECT 1 FROM practitioner_patients pp
    JOIN practitioners pr ON pr.id = pp.practitioner_id
    WHERE pp.patient_id = aligner_changes.patient_id
    AND pr.profile_id = get_profile_id(auth.uid())
  )
);

-- Admins can manage all changes
CREATE POLICY "Admins can manage aligner changes"
ON public.aligner_changes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));