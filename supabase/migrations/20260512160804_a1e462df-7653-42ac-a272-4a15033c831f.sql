
-- 1. support_requests
CREATE TABLE IF NOT EXISTS public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  category text NOT NULL CHECK (category IN ('billing','technical','content','account','other')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_requests_insert_any ON public.support_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY support_requests_select_own ON public.support_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY support_requests_admin_select ON public.support_requests
  FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin','admin']));

CREATE POLICY support_requests_admin_update ON public.support_requests
  FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin','admin']))
  WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin','admin']));

CREATE INDEX IF NOT EXISTS support_requests_user_id_idx ON public.support_requests(user_id);
CREATE INDEX IF NOT EXISTS support_requests_status_idx ON public.support_requests(status);
CREATE INDEX IF NOT EXISTS support_requests_created_at_idx ON public.support_requests(created_at DESC);

-- 2. subscriptions: additive columns for RevenueCat / iOS IAP support
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS revenuecat_user_id text,
  ADD COLUMN IF NOT EXISTS revenuecat_entitlement text,
  ADD COLUMN IF NOT EXISTS apple_product_id text,
  ADD COLUMN IF NOT EXISTS environment text,
  ADD COLUMN IF NOT EXISTS last_webhook_event_id text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_provider_check'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_provider_check
      CHECK (provider IN ('stripe','revenuecat'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_environment_check'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_environment_check
      CHECK (environment IS NULL OR environment IN ('sandbox','production'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_provider_uidx
  ON public.subscriptions(user_id, provider);
CREATE INDEX IF NOT EXISTS subscriptions_revenuecat_user_id_idx
  ON public.subscriptions(revenuecat_user_id);
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);

-- 3. processed_webhook_events: add provider column
ALTER TABLE public.processed_webhook_events
  ADD COLUMN IF NOT EXISTS provider text;
CREATE INDEX IF NOT EXISTS processed_webhook_events_processed_at_idx
  ON public.processed_webhook_events(processed_at DESC);
