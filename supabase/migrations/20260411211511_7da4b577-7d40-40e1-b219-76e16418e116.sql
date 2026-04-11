-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily trial expiry check at 9am UTC
SELECT cron.schedule(
  'expire-trials-daily',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://crkkimoblnrxpszehmkg.supabase.co/functions/v1/expire-trials',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya2tpbW9ibG5yeHBzemVobWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDQwNjUsImV4cCI6MjA5MTQ4MDA2NX0.jBR4qIt_wiqOk_VtnmPk7EAIDMdDBkj_HPtKEg15xgk"}'::jsonb,
      body:='{"time": "scheduled"}'::jsonb
    ) AS request_id;
  $$
);