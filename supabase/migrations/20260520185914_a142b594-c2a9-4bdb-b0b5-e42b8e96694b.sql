-- Allow 'trial' as a profile role (in addition to existing roles)
CREATE OR REPLACE FUNCTION public.validate_profile_role_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role NOT IN (
    'super_admin', 'admin', 'beta', 'free', 'personal',
    'family_owner', 'family_member', 'community_admin',
    'community_member', 'suspended', 'trial'
  ) THEN
    RAISE EXCEPTION 'Invalid role: %', NEW.role;
  END IF;

  IF NEW.plan NOT IN ('free', 'trial', 'personal', 'family', 'community') THEN
    RAISE EXCEPTION 'Invalid plan: %', NEW.plan;
  END IF;

  RETURN NEW;
END;
$function$;

-- Allow 'expired' as a subscription status
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS status_valid;
ALTER TABLE public.subscriptions ADD CONSTRAINT status_valid
  CHECK (status = ANY (ARRAY['active'::text, 'cancelled'::text, 'past_due'::text, 'expired'::text]));

-- Allow 'reviewer' as a subscription provider
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_provider_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_provider_check
  CHECK (provider = ANY (ARRAY['stripe'::text, 'revenuecat'::text, 'reviewer'::text]));