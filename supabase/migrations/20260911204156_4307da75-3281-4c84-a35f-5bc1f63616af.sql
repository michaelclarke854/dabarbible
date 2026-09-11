DO $$
BEGIN
  -- Unschedule the three pastor cold-outreach cron jobs, skipping any that don't exist.
  BEGIN
    PERFORM cron.unschedule('dabar-elijah-outreach');
    RAISE NOTICE 'Unscheduled dabar-elijah-outreach';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'dabar-elijah-outreach not found (skipped): %', SQLERRM;
  END;

  BEGIN
    PERFORM cron.unschedule('dabar-expand-pastor-leads');
    RAISE NOTICE 'Unscheduled dabar-expand-pastor-leads';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'dabar-expand-pastor-leads not found (skipped): %', SQLERRM;
  END;

  BEGIN
    PERFORM cron.unschedule('pastoral-outreach-daily');
    RAISE NOTICE 'Unscheduled pastoral-outreach-daily';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pastoral-outreach-daily not found (skipped): %', SQLERRM;
  END;
END $$;

-- Confirm sending_paused stays true on outreach_config (key/value table)
UPDATE public.outreach_config
SET value = 'true'::jsonb
WHERE key = 'sending_paused'
  AND value IS DISTINCT FROM 'true'::jsonb;