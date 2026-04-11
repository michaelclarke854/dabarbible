-- Add trial columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_converted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_nudge_sent jsonb NOT NULL DEFAULT '{"day14": false, "day21": false, "day28": false}'::jsonb;

-- Add expires_at to wisdom_sessions for 90-day retention
ALTER TABLE public.wisdom_sessions
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Update the plan/role validation trigger to allow 'trial'
CREATE OR REPLACE FUNCTION public.validate_profile_role_plan()
RETURNS trigger
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

  IF NEW.plan NOT IN ('free', 'trial', 'personal', 'family', 'community') THEN
    RAISE EXCEPTION 'Invalid plan: %', NEW.plan;
  END IF;

  RETURN NEW;
END;
$$;

-- Update handle_new_user to set trial fields on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, plan, role, trial_started_at, trial_ends_at)
  VALUES (NEW.id, 'trial', 'personal', now(), now() + interval '30 days');
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'trial', 'active');
  RETURN NEW;
END;
$$;