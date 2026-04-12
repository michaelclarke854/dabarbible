
-- Fix 1: CRITICAL — Prevent privilege escalation on profiles
-- Drop the overly permissive self-update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Replace with a restricted policy that only allows safe column updates
-- by ensuring sensitive columns haven't changed
CREATE POLICY "Users can update own safe fields" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
    AND plan = (SELECT p.plan FROM public.profiles p WHERE p.user_id = auth.uid())
    AND is_suspended IS NOT DISTINCT FROM (SELECT p.is_suspended FROM public.profiles p WHERE p.user_id = auth.uid())
    AND stripe_customer_id IS NOT DISTINCT FROM (SELECT p.stripe_customer_id FROM public.profiles p WHERE p.user_id = auth.uid())
    AND trial_ends_at IS NOT DISTINCT FROM (SELECT p.trial_ends_at FROM public.profiles p WHERE p.user_id = auth.uid())
    AND trial_started_at IS NOT DISTINCT FROM (SELECT p.trial_started_at FROM public.profiles p WHERE p.user_id = auth.uid())
    AND trial_converted IS NOT DISTINCT FROM (SELECT p.trial_converted FROM public.profiles p WHERE p.user_id = auth.uid())
    AND beta_granted_at IS NOT DISTINCT FROM (SELECT p.beta_granted_at FROM public.profiles p WHERE p.user_id = auth.uid())
    AND beta_granted_by IS NOT DISTINCT FROM (SELECT p.beta_granted_by FROM public.profiles p WHERE p.user_id = auth.uid())
    AND role_changed_at IS NOT DISTINCT FROM (SELECT p.role_changed_at FROM public.profiles p WHERE p.user_id = auth.uid())
    AND role_changed_by IS NOT DISTINCT FROM (SELECT p.role_changed_by FROM public.profiles p WHERE p.user_id = auth.uid())
    AND previous_role IS NOT DISTINCT FROM (SELECT p.previous_role FROM public.profiles p WHERE p.user_id = auth.uid())
    AND suspended_at IS NOT DISTINCT FROM (SELECT p.suspended_at FROM public.profiles p WHERE p.user_id = auth.uid())
    AND suspended_by IS NOT DISTINCT FROM (SELECT p.suspended_by FROM public.profiles p WHERE p.user_id = auth.uid())
    AND grace_period_until IS NOT DISTINCT FROM (SELECT p.grace_period_until FROM public.profiles p WHERE p.user_id = auth.uid())
  );

-- Fix 2: Tighten language_waitlist INSERT to own email only
DROP POLICY IF EXISTS "Authenticated users can join waitlist" ON public.language_waitlist;

CREATE POLICY "Users can join waitlist with own email" ON public.language_waitlist
  FOR INSERT
  WITH CHECK (
    email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
  );
