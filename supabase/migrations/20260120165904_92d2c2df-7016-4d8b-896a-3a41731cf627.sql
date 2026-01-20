-- Create table for patient photos and their AI analyses
CREATE TABLE public.patient_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  angle TEXT NOT NULL DEFAULT 'front',
  aligner_number INTEGER NOT NULL,
  
  -- Quality metrics
  brightness_score INTEGER,
  sharpness_score INTEGER,
  framing_score INTEGER,
  quality_overall INTEGER,
  
  -- AI Analysis results
  analysis_status TEXT NOT NULL DEFAULT 'pending',
  attachment_status TEXT,
  insertion_quality TEXT,
  gingival_health TEXT,
  overall_score INTEGER,
  recommendations TEXT[],
  analyzed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_photos ENABLE ROW LEVEL SECURITY;

-- Patients can view and insert their own photos
CREATE POLICY "Patients can view own photos"
  ON public.patient_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_photos.patient_id
      AND p.profile_id = get_profile_id(auth.uid())
    )
  );

CREATE POLICY "Patients can insert own photos"
  ON public.patient_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_photos.patient_id
      AND p.profile_id = get_profile_id(auth.uid())
    )
  );

-- Practitioners can view their patients' photos
CREATE POLICY "Practitioners can view patient photos"
  ON public.patient_photos FOR SELECT
  USING (
    has_role(auth.uid(), 'practitioner') AND
    EXISTS (
      SELECT 1 FROM practitioner_patients pp
      JOIN practitioners pr ON pr.id = pp.practitioner_id
      WHERE pp.patient_id = patient_photos.patient_id
      AND pr.profile_id = get_profile_id(auth.uid())
    )
  );

-- Admins can manage all photos
CREATE POLICY "Admins can manage photos"
  ON public.patient_photos FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_patient_photos_updated_at
  BEFORE UPDATE ON public.patient_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for aligner photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'aligner-photos',
  'aligner-photos',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Storage policies for aligner-photos bucket
CREATE POLICY "Patients can upload own photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'aligner-photos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Patients can view own photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'aligner-photos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can manage all photos"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'aligner-photos' AND
    has_role(auth.uid(), 'admin')
  );