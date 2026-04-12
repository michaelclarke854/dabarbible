
-- 1.1: Attach handle_new_user trigger to auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 1.5: Age enforcement trigger
CREATE OR REPLACE FUNCTION public.enforce_age_minimum()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.age_group = 'blocked' THEN
    RAISE EXCEPTION 'User must be 13 or older to create an account';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_age_on_profile
  BEFORE INSERT OR UPDATE OF age_group ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_age_minimum();

-- 1.6: stripe_customer_id on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- 1.7: Webhook idempotency table
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT,
  processed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- 1.8: Anonymous rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits_anonymous (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.rate_limits_anonymous ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.cleanup_anon_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits_anonymous WHERE created_at < now() - interval '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
