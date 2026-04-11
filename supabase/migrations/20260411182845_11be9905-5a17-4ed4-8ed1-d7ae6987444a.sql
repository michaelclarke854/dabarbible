
-- ============================================
-- FIX 1: Prevent self-role-escalation via trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role (edge functions) to change anything
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- If the authenticated user is updating their own profile,
  -- prevent changes to role, plan, and is_suspended
  IF NEW.user_id = auth.uid() THEN
    NEW.role := OLD.role;
    NEW.plan := OLD.plan;
    NEW.is_suspended := OLD.is_suspended;
    NEW.suspended_at := OLD.suspended_at;
    NEW.suspended_by := OLD.suspended_by;
    NEW.role_changed_at := OLD.role_changed_at;
    NEW.role_changed_by := OLD.role_changed_by;
    NEW.previous_role := OLD.previous_role;
    NEW.beta_granted_at := OLD.beta_granted_at;
    NEW.beta_granted_by := OLD.beta_granted_by;
    NEW.beta_notes := OLD.beta_notes;
    NEW.grace_period_until := OLD.grace_period_until;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_self_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_change();

-- Now simplify the user update policy since the trigger handles protection
DROP POLICY IF EXISTS "Users can update own non-role fields" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FIX 2: Lock down language_waitlist SELECT
-- ============================================
DROP POLICY IF EXISTS "Users can view their own waitlist entries" ON public.language_waitlist;
CREATE POLICY "Users can view own waitlist entries"
  ON public.language_waitlist
  FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- ============================================
-- FIX 3: Remove anonymous session INSERT
-- ============================================
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.wisdom_sessions;
CREATE POLICY "Users can insert their own sessions"
  ON public.wisdom_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FIX 4: Let users read their own beta feedback
-- ============================================
CREATE POLICY "Users can view own feedback"
  ON public.beta_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- FIX 5: Restrict waitlist INSERT to authenticated
-- ============================================
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.language_waitlist;
CREATE POLICY "Authenticated users can join waitlist"
  ON public.language_waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
