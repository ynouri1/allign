-- Enable Supabase Realtime for practitioner_alerts and patient_photos
-- so that dashboards update automatically without page refresh.

ALTER PUBLICATION supabase_realtime ADD TABLE practitioner_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE patient_photos;
