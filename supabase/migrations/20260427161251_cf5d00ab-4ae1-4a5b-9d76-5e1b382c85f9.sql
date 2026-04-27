
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_nudges_sent JSONB NOT NULL DEFAULT '{"day3": false, "day21": false, "day28": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS daily_verse_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_verse_send_hour_utc INTEGER NOT NULL DEFAULT 13,
  ADD COLUMN IF NOT EXISTS daily_verse_unsub_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS daily_verse_last_sent_on DATE,
  ADD COLUMN IF NOT EXISTS daily_verse_opted_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS daily_verse_prompt_seen BOOLEAN NOT NULL DEFAULT false;

-- Replace the safe-update policy so users CAN update their own daily verse preferences
-- but still cannot escalate role/plan/trial fields.
DROP POLICY IF EXISTS "Users can update own safe fields" ON public.profiles;

CREATE POLICY "Users can update own safe fields"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
  AND plan = (SELECT p.plan FROM public.profiles p WHERE p.user_id = auth.uid())
  AND NOT (is_suspended IS DISTINCT FROM (SELECT p.is_suspended FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (stripe_customer_id IS DISTINCT FROM (SELECT p.stripe_customer_id FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (trial_ends_at IS DISTINCT FROM (SELECT p.trial_ends_at FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (trial_started_at IS DISTINCT FROM (SELECT p.trial_started_at FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (trial_converted IS DISTINCT FROM (SELECT p.trial_converted FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (trial_nudges_sent IS DISTINCT FROM (SELECT p.trial_nudges_sent FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (beta_granted_at IS DISTINCT FROM (SELECT p.beta_granted_at FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (beta_granted_by IS DISTINCT FROM (SELECT p.beta_granted_by FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (role_changed_at IS DISTINCT FROM (SELECT p.role_changed_at FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (role_changed_by IS DISTINCT FROM (SELECT p.role_changed_by FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (previous_role IS DISTINCT FROM (SELECT p.previous_role FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (suspended_at IS DISTINCT FROM (SELECT p.suspended_at FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (suspended_by IS DISTINCT FROM (SELECT p.suspended_by FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (grace_period_until IS DISTINCT FROM (SELECT p.grace_period_until FROM public.profiles p WHERE p.user_id = auth.uid()))
);

CREATE OR REPLACE FUNCTION public.lookup_user_by_verse_unsub_token(_token TEXT)
RETURNS TABLE(user_id UUID)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.profiles WHERE daily_verse_unsub_token = _token LIMIT 1;
$$;
