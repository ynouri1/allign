-- Add resolution_notes column to practitioner_alerts table
ALTER TABLE public.practitioner_alerts
ADD COLUMN resolution_notes TEXT;