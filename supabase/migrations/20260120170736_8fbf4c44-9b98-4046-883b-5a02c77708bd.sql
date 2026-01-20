-- Create table for practitioner alerts linked to patient photos
CREATE TABLE public.practitioner_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES public.patient_photos(id) ON DELETE SET NULL,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN ('attachment_lost', 'poor_insertion', 'gingival_issue', 'missed_change', 'photo_needed')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  message TEXT NOT NULL,
  
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.practitioner_alerts ENABLE ROW LEVEL SECURITY;

-- Practitioners can view and update their own alerts
CREATE POLICY "Practitioners can view own alerts"
  ON public.practitioner_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM practitioners pr
      WHERE pr.id = practitioner_alerts.practitioner_id
      AND pr.profile_id = get_profile_id(auth.uid())
    )
  );

CREATE POLICY "Practitioners can update own alerts"
  ON public.practitioner_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM practitioners pr
      WHERE pr.id = practitioner_alerts.practitioner_id
      AND pr.profile_id = get_profile_id(auth.uid())
    )
  );

-- Admins can manage all alerts
CREATE POLICY "Admins can manage alerts"
  ON public.practitioner_alerts FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_practitioner_alerts_updated_at
  BEFORE UPDATE ON public.practitioner_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();