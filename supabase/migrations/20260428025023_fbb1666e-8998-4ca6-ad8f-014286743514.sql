-- Schedule weekly congregation pulse generation
-- Runs every Monday at 14:00 UTC (~9am ET / 6am PT)
-- Uses cron_shared_secret from vault, matched to CRON_SECRET env var in pulse-generator

SELECT cron.schedule(
  'congregation-pulse-weekly',
  '0 14 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://crkkimoblnrxpszehmkg.supabase.co/functions/v1/pulse-generator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_shared_secret' LIMIT 1)
    ),
    body := jsonb_build_object('source', 'cron', 'time', now()::text)
  ) AS request_id;
  $$
);