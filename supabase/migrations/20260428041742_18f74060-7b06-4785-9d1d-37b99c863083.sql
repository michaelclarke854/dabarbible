-- Lead generation tracking + audit fields for ELIJAH lead expansion engine

CREATE TABLE IF NOT EXISTS public.lead_gen_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  leads_found      INTEGER NOT NULL DEFAULT 0,
  leads_inserted   INTEGER NOT NULL DEFAULT 0,
  leads_skipped    INTEGER NOT NULL DEFAULT 0,
  sources_searched TEXT[],
  errors           TEXT[],
  status           TEXT NOT NULL DEFAULT 'complete'
                   CHECK (status IN ('complete', 'partial', 'failed'))
);

ALTER TABLE public.lead_gen_log ENABLE ROW LEVEL SECURITY;

-- Admins can read; only service role can insert
CREATE POLICY "Admins can view lead_gen_log"
  ON public.lead_gen_log FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin','admin']));

CREATE POLICY "Service role can insert lead_gen_log"
  ON public.lead_gen_log FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "No direct delete on lead_gen_log"
  ON public.lead_gen_log FOR DELETE
  TO anon, authenticated
  USING (false);

CREATE POLICY "No direct update on lead_gen_log"
  ON public.lead_gen_log FOR UPDATE
  TO anon, authenticated
  USING (false);

CREATE INDEX IF NOT EXISTS idx_lead_gen_log_run_at
  ON public.lead_gen_log (run_at DESC);

-- Pastor leads audit trail for autonomous expansion
ALTER TABLE public.pastor_leads
  ADD COLUMN IF NOT EXISTS email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_url        TEXT;