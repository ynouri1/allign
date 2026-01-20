-- Fix security vulnerability: Deny anonymous access to profiles table
-- This ensures only authenticated users can access profile data
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix security vulnerability: Deny anonymous access to patient_photos table  
-- This protects PHI (Protected Health Information) from unauthorized access
CREATE POLICY "Deny anonymous access to patient_photos"
ON public.patient_photos
FOR SELECT
USING (auth.uid() IS NOT NULL);