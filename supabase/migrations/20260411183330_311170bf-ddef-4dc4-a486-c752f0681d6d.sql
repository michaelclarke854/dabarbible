
-- ============================================
-- FIX: Community member role escalation prevention
-- ============================================
CREATE OR REPLACE FUNCTION public.enforce_community_member_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow 'admin' role if inserter is already a community admin
  IF NEW.role != 'member' THEN
    IF NOT is_community_admin(NEW.community_id, auth.uid()) THEN
      NEW.role := 'member';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_community_member_role_trigger
  BEFORE INSERT ON public.community_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_community_member_role();

-- ============================================
-- FIX: Language waitlist DELETE policy
-- ============================================
CREATE POLICY "Users can delete own waitlist entries"
  ON public.language_waitlist
  FOR DELETE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid())::text);

-- ============================================
-- Rate limiting table for seek-wisdom
-- ============================================
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  endpoint text NOT NULL DEFAULT 'seek-wisdom',
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role needs access (edge functions)
-- No user-facing policies needed

CREATE INDEX idx_rate_limits_user_endpoint ON public.rate_limits (user_id, endpoint, window_start);
