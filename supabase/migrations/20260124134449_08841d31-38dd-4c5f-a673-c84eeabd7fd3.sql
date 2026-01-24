-- Create table for tutorial videos
CREATE TABLE public.tutorial_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  duration TEXT DEFAULT '0:00',
  category TEXT NOT NULL DEFAULT 'conseils',
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutorial_videos ENABLE ROW LEVEL SECURITY;

-- Everyone can view active videos
CREATE POLICY "Anyone can view active videos"
ON public.tutorial_videos
FOR SELECT
USING (is_active = true);

-- Admins can manage all videos
CREATE POLICY "Admins can manage videos"
ON public.tutorial_videos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_tutorial_videos_updated_at
BEFORE UPDATE ON public.tutorial_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for tutorial videos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('tutorial-videos', 'tutorial-videos', true, 52428800);

-- Storage policies for tutorial videos bucket
CREATE POLICY "Anyone can view tutorial videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'tutorial-videos');

CREATE POLICY "Admins can upload tutorial videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'tutorial-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tutorial videos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'tutorial-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tutorial videos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'tutorial-videos' AND has_role(auth.uid(), 'admin'::app_role));