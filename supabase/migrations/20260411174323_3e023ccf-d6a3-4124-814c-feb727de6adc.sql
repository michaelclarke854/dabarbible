
-- ═══════════════════════════════════════════
-- WISDOM_SESSIONS: Replace admin-all with flagged-only
-- ═══════════════════════════════════════════
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.wisdom_sessions;

CREATE POLICY "Admins can view flagged sessions only"
  ON public.wisdom_sessions FOR SELECT
  TO authenticated
  USING (
    flagged = true
    AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
  );

-- ═══════════════════════════════════════════
-- ROLE_CHANGE_LOG: Remove direct insert (service role only)
-- ═══════════════════════════════════════════
DROP POLICY IF EXISTS "Admins can insert role changes" ON public.role_change_log;

-- ═══════════════════════════════════════════
-- BETA_FEEDBACK: Clean up duplicate select
-- ═══════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view own feedback" ON public.beta_feedback;
