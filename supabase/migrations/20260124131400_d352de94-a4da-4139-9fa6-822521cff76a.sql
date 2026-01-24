-- Allow patients to update their own current_aligner
CREATE POLICY "Patients can update own aligner" 
ON public.patients 
FOR UPDATE 
USING (profile_id = get_profile_id(auth.uid()))
WITH CHECK (profile_id = get_profile_id(auth.uid()));