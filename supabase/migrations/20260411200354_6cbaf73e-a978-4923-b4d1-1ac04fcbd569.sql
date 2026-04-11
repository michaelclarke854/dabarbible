
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Create the cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_deleted_reflections()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.reflection_entries
  WHERE deleted_at IS NOT NULL
  AND deleted_at < now() - interval '30 days';
END;
$$;

-- Schedule daily at 4am UTC
SELECT cron.schedule(
  'cleanup-deleted-reflections',
  '0 4 * * *',
  $$SELECT public.cleanup_deleted_reflections()$$
);
