SELECT cron.schedule(
  'dabar-expand-pastor-leads',
  '0 13 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://crkkimoblnrxpszehmkg.supabase.co/functions/v1/expand-pastor-leads',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya2tpbW9ibG5yeHBzemVobWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDQwNjUsImV4cCI6MjA5MTQ4MDA2NX0.jBR4qIt_wiqOk_VtnmPk7EAIDMdDBkj_HPtKEg15xgk',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  WHERE (SELECT COUNT(*) FROM public.pastor_leads WHERE status = 'pending' AND COALESCE(suppressed, false) = false) < 500;
  $$
);