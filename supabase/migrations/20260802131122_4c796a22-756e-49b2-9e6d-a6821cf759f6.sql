CREATE TABLE public.revenuecat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE,
  event_type text NOT NULL,
  app_user_id text,
  product_id text,
  environment text,
  expiration_at timestamptz,
  processed boolean NOT NULL DEFAULT false,
  error_message text,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.revenuecat_events TO service_role;

ALTER TABLE public.revenuecat_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.revenuecat_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_revenuecat_events_updated_at
  BEFORE UPDATE ON public.revenuecat_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_revenuecat_events_app_user ON public.revenuecat_events (app_user_id);
CREATE INDEX idx_revenuecat_events_type ON public.revenuecat_events (event_type);