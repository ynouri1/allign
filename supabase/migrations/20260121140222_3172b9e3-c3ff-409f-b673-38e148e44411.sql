-- Add column to store teeth with attachments (array of tooth numbers)
-- Using FDI notation: 11-18 (upper right), 21-28 (upper left), 31-38 (lower left), 41-48 (lower right)
ALTER TABLE public.patients 
ADD COLUMN attachment_teeth integer[] DEFAULT '{}';

-- Add a comment to document the column
COMMENT ON COLUMN public.patients.attachment_teeth IS 'Array of tooth numbers (FDI notation) that have attachments';