-- Super admin can read all journal agent runs
CREATE POLICY "super_admin can read all journal_agent_runs"
ON public.journal_agent_runs
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'super_admin');

-- Super admin can read all rate limits
CREATE POLICY "super_admin can read all rate_limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'super_admin');

-- Super admin can read all rate_limits_anonymous
CREATE POLICY "super_admin can read all rate_limits_anonymous"
ON public.rate_limits_anonymous
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'super_admin');

-- Super admin can read ALL wisdom sessions (existing policy only allows flagged for admins)
CREATE POLICY "super_admin can read all wisdom_sessions"
ON public.wisdom_sessions
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'super_admin');