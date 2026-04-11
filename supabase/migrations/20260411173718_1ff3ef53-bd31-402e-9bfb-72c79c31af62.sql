
-- Drop the overly permissive anon policy
DROP POLICY IF EXISTS "Service can insert crisis events" ON public.crisis_events;

-- The language_waitlist also has a permissive insert — that's intentional for the waitlist form.
-- For crisis_events, edge functions use service_role key which bypasses RLS anyway,
-- so no anon policy is needed.
