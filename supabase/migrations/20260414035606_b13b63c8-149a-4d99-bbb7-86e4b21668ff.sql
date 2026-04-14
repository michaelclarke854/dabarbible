
-- Create crisis_log table
CREATE TABLE IF NOT EXISTS public.crisis_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  keyword_matched TEXT NOT NULL,
  session_id TEXT,
  severity TEXT NOT NULL DEFAULT 'crisis'
);

-- Add validation trigger for severity
CREATE OR REPLACE FUNCTION public.validate_crisis_severity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.severity NOT IN ('crisis', 'watch') THEN
    RAISE EXCEPTION 'Invalid severity: %. Must be crisis or watch.', NEW.severity;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_crisis_log_severity
BEFORE INSERT OR UPDATE ON public.crisis_log
FOR EACH ROW EXECUTE FUNCTION public.validate_crisis_severity();

-- Enable RLS
ALTER TABLE public.crisis_log ENABLE ROW LEVEL SECURITY;

-- Admins can view
CREATE POLICY "Admins can view crisis logs"
ON public.crisis_log FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Service role can insert (from edge functions)
CREATE POLICY "Service role can insert crisis logs"
ON public.crisis_log FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

-- Add pending_checkin to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_checkin BOOLEAN NOT NULL DEFAULT false;

-- Insert default admin_email if not exists
INSERT INTO public.app_config (key, value)
VALUES ('admin_email', 'michaelclarke854@gmail.com')
ON CONFLICT (key) DO NOTHING;
