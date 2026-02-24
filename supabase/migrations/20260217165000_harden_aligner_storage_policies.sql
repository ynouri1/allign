-- Harden storage policies for aligner-photos bucket
-- Restrict access to:
-- - patient owning the folder
-- - assigned practitioner
-- - admin

DROP POLICY IF EXISTS "Patients can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Patients can view own photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all photos" ON storage.objects;

CREATE POLICY "Patients can upload own photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'aligner-photos'
  AND EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.profile_id = public.get_profile_id(auth.uid())
      AND p.id::text = split_part(name, '/', 1)
  )
);

CREATE POLICY "Authenticated can view authorized photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'aligner-photos'
  AND (
    EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE p.profile_id = public.get_profile_id(auth.uid())
        AND p.id::text = split_part(name, '/', 1)
    )
    OR EXISTS (
      SELECT 1
      FROM public.practitioner_patients pp
      JOIN public.practitioners pr ON pr.id = pp.practitioner_id
      WHERE pr.profile_id = public.get_profile_id(auth.uid())
        AND pp.patient_id::text = split_part(name, '/', 1)
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Admins can manage all photos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'aligner-photos'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'aligner-photos'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);