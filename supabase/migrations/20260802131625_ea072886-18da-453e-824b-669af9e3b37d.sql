CREATE TABLE public.app_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  user_id uuid,
  screen_count integer NOT NULL DEFAULT 1,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.app_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.app_sessions TO anon;
GRANT ALL ON public.app_sessions TO service_role;

ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;

-- Write-only telemetry: clients may create and heartbeat sessions but the
-- SELECT policy is intentionally restrictive so no client can read others' rows.
CREATE POLICY "anyone can start a session" ON public.app_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "anyone can heartbeat a session" ON public.app_sessions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "users read own sessions" ON public.app_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_app_sessions_updated_at
  BEFORE UPDATE ON public.app_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_app_sessions_started_at ON public.app_sessions (started_at);