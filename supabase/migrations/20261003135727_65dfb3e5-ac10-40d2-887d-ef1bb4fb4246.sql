DO $$
DECLARE j record;
BEGIN
  FOR j IN SELECT jobname FROM cron.job
    WHERE jobname IN ('dabar-elijah-outreach','dabar-expand-pastor-leads','pastoral-outreach-daily')
       OR command ILIKE '%/functions/v1/elijah-outreach%'
       OR command ILIKE '%/functions/v1/pastoral-outreach%'
       OR command ILIKE '%/functions/v1/expand-pastor-leads%'
  LOOP
    PERFORM cron.unschedule(j.jobname);
  END LOOP;
END $$;