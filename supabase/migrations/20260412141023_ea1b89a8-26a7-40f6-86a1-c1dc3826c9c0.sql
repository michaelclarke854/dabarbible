
-- processed_webhook_events: only accessed by service_role in edge functions
-- No public policies needed — RLS blocks all non-service-role access by default

-- rate_limits_anonymous: only accessed by service_role in edge functions  
-- No public policies needed — RLS blocks all non-service-role access by default

-- rate_limits table (pre-existing, no policies) — also service_role only
-- Adding a note: these tables are intentionally policy-free because they're
-- only accessed via service_role key in edge functions, which bypasses RLS.

-- Fix: Add explicit deny-all policies so linter is satisfied
CREATE POLICY "Service role only" ON public.processed_webhook_events
  FOR ALL USING (false);

CREATE POLICY "Service role only" ON public.rate_limits_anonymous
  FOR ALL USING (false);

CREATE POLICY "Service role only" ON public.rate_limits
  FOR ALL USING (false);
