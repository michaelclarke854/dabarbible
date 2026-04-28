
-- 1.1 pastor_leads
CREATE TABLE IF NOT EXISTS public.pastor_leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pastor_name       TEXT NOT NULL,
  church_name       TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  denomination      TEXT,
  country_code      TEXT NOT NULL DEFAULT 'US',
  language          TEXT NOT NULL DEFAULT 'en',
  church_size       TEXT,
  source            TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'directory', 'referral', 'conference', 'seminary')),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'replied', 'trial_started', 'converted', 'opted_out', 'bounced')),
  suppressed        BOOLEAN DEFAULT FALSE,
  initial_sent_at   TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  reply_received_at TIMESTAMPTZ,
  trial_started_at  TIMESTAMPTZ,
  internal_notes    TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pastor_leads_status   ON public.pastor_leads(status, suppressed, country_code);
CREATE INDEX IF NOT EXISTS idx_pastor_leads_email    ON public.pastor_leads(email);
CREATE INDEX IF NOT EXISTS idx_pastor_leads_country  ON public.pastor_leads(country_code, language);
ALTER TABLE public.pastor_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pastor_leads"
  ON public.pastor_leads FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "Admins can manage pastor_leads"
  ON public.pastor_leads FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
  WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- 1.2 outreach_email_log
CREATE TABLE IF NOT EXISTS public.outreach_email_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES public.pastor_leads(id) ON DELETE CASCADE,
  sequence_step   INTEGER NOT NULL DEFAULT 1,
  subject         TEXT NOT NULL,
  body_preview    TEXT,
  resend_id       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at         TIMESTAMPTZ DEFAULT now(),
  delivered_at    TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_outreach_log_lead    ON public.outreach_email_log(lead_id, sequence_step);
CREATE INDEX IF NOT EXISTS idx_outreach_log_status  ON public.outreach_email_log(status, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_log_resend  ON public.outreach_email_log(resend_id);
ALTER TABLE public.outreach_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view outreach_email_log"
  ON public.outreach_email_log FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- 1.3 outreach_reply_log
CREATE TABLE IF NOT EXISTS public.outreach_reply_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID REFERENCES public.pastor_leads(id) ON DELETE SET NULL,
  from_email      TEXT NOT NULL,
  from_name       TEXT,
  subject         TEXT,
  body_preview    TEXT,
  intent          TEXT CHECK (intent IN ('interested', 'question', 'not_now', 'opt_out', 'out_of_office', 'other')),
  agent_response_sent BOOLEAN DEFAULT FALSE,
  processed       BOOLEAN DEFAULT FALSE,
  received_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reply_log_processed ON public.outreach_reply_log(processed, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_reply_log_email     ON public.outreach_reply_log(from_email);
ALTER TABLE public.outreach_reply_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view outreach_reply_log"
  ON public.outreach_reply_log FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- 1.4 outreach_config
CREATE TABLE IF NOT EXISTS public.outreach_config (
  key    TEXT PRIMARY KEY,
  value  JSONB NOT NULL
);
ALTER TABLE public.outreach_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view outreach_config"
  ON public.outreach_config FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "Admins can update outreach_config"
  ON public.outreach_config FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
  WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

INSERT INTO public.outreach_config (key, value) VALUES
  ('sending_paused',    'false'::jsonb),
  ('daily_send_limit',  '50'::jsonb),
  ('sends_today',       '0'::jsonb),
  ('sends_today_reset', to_jsonb(NOW()::text))
ON CONFLICT (key) DO NOTHING;

-- 1.5 pastoral_access_applications
CREATE TABLE IF NOT EXISTS public.pastoral_access_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pastor_name     TEXT NOT NULL,
  church_name     TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  denomination    TEXT,
  church_size     TEXT,
  country         TEXT,
  how_heard       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pastoral_access_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_can_apply"
  ON public.pastoral_access_applications FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(pastor_name)) BETWEEN 1 AND 200
    AND length(trim(church_name)) BETWEEN 1 AND 200
    AND length(trim(email)) BETWEEN 3 AND 320
    AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (denomination IS NULL OR length(denomination) <= 100)
    AND (church_size IS NULL OR length(church_size) <= 50)
    AND (country IS NULL OR length(country) <= 100)
    AND (how_heard IS NULL OR length(how_heard) <= 1000)
  );

CREATE POLICY "Admins can view applications"
  ON public.pastoral_access_applications FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "Admins can update applications"
  ON public.pastoral_access_applications FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
  WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));
