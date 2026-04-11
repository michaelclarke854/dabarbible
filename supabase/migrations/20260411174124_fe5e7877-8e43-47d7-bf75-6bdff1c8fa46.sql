
-- ═══════════════════════════════════════════
-- PART 1: PROFILES TABLE ADDITIONS
-- ═══════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid,
  ADD COLUMN IF NOT EXISTS beta_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS beta_granted_by uuid,
  ADD COLUMN IF NOT EXISTS beta_notes text,
  ADD COLUMN IF NOT EXISTS role_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS role_changed_by uuid,
  ADD COLUMN IF NOT EXISTS previous_role text,
  ADD COLUMN IF NOT EXISTS grace_period_until timestamptz;

-- ═══════════════════════════════════════════
-- VALIDATION TRIGGER (instead of CHECK constraints)
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.validate_profile_role_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role NOT IN (
    'super_admin', 'admin', 'beta', 'free', 'personal',
    'family_owner', 'family_member', 'community_admin',
    'community_member', 'suspended'
  ) THEN
    RAISE EXCEPTION 'Invalid role: %', NEW.role;
  END IF;

  IF NEW.plan NOT IN ('free', 'personal', 'family', 'community') THEN
    RAISE EXCEPTION 'Invalid plan: %', NEW.plan;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_profile_role_plan
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_role_plan();

-- ═══════════════════════════════════════════
-- PART 2: SUPER ADMIN LOCK TRIGGER
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.enforce_super_admin_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  super_admin_email constant text := 'michaelclarke854@gmail.com';
BEGIN
  -- Look up email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Rule 1: If this is the system owner, force super_admin
  IF user_email = super_admin_email THEN
    NEW.role := 'super_admin';
    RETURN NEW;
  END IF;

  -- Rule 2: No one else can claim super_admin
  IF NEW.role = 'super_admin' AND user_email IS DISTINCT FROM super_admin_email THEN
    RAISE EXCEPTION 'super_admin role is reserved for the system owner';
  END IF;

  -- Rule 3: super_admin cannot be revoked (on UPDATE only)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'super_admin' AND NEW.role != 'super_admin' THEN
      RAISE EXCEPTION 'super_admin role cannot be revoked';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_super_admin_lock
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_super_admin_lock();

-- ═══════════════════════════════════════════
-- NEW TABLES
-- ═══════════════════════════════════════════

CREATE TABLE public.role_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid REFERENCES auth.users(id),
  changed_by uuid REFERENCES auth.users(id),
  old_role text,
  new_role text,
  notes text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_change_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  feedback_text text NOT NULL,
  screen_context text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════
-- SECURITY DEFINER: get user role without RLS recursion
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- ═══════════════════════════════════════════
-- RLS POLICIES: role_change_log
-- ═══════════════════════════════════════════

CREATE POLICY "Admins can view role changes"
  ON public.role_change_log FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Admins can insert role changes"
  ON public.role_change_log FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- ═══════════════════════════════════════════
-- RLS POLICIES: beta_feedback
-- ═══════════════════════════════════════════

CREATE POLICY "Users can submit own feedback"
  ON public.beta_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
  ON public.beta_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON public.beta_feedback FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- ═══════════════════════════════════════════
-- UPDATE EXISTING PROFILES RLS
-- ═══════════════════════════════════════════

-- Drop old policies that will be replaced
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Users can update own profile but CANNOT change role, plan, or suspension
CREATE POLICY "Users can update own non-role fields"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = (public.get_user_role(auth.uid()))
    AND plan = (SELECT plan FROM public.profiles WHERE user_id = auth.uid())
    AND is_suspended IS NOT DISTINCT FROM (SELECT is_suspended FROM public.profiles WHERE user_id = auth.uid())
  );

-- Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Admins can update any profile (for role changes, suspensions, etc.)
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));
