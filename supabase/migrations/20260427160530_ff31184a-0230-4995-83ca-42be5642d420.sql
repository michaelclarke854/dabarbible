
CREATE TABLE IF NOT EXISTS public.pastoral_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  church_name TEXT,
  church_size TEXT,
  denomination TEXT,
  city TEXT,
  state TEXT,
  website TEXT,
  linkedin_url TEXT,
  source TEXT DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'identified',
  last_contacted_at TIMESTAMPTZ,
  next_contact_at TIMESTAMPTZ,
  reply_received BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pastoral_leads_status ON public.pastoral_leads(status);
CREATE INDEX IF NOT EXISTS idx_pastoral_leads_next_contact ON public.pastoral_leads(next_contact_at)
  WHERE status NOT IN ('unsubscribed', 'endorsed', 'referring');

CREATE TRIGGER update_pastoral_leads_updated_at
  BEFORE UPDATE ON public.pastoral_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.pastoral_outreach_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.pastoral_leads(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resend_id TEXT,
  opened BOOLEAN DEFAULT false,
  clicked BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_pastoral_log_lead ON public.pastoral_outreach_log(lead_id);

ALTER TABLE public.pastoral_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastoral_outreach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pastoral leads"
  ON public.pastoral_leads
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = ANY (ARRAY['super_admin','admin']))
  WITH CHECK (public.get_user_role(auth.uid()) = ANY (ARRAY['super_admin','admin']));

CREATE POLICY "Admins manage pastoral outreach log"
  ON public.pastoral_outreach_log
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = ANY (ARRAY['super_admin','admin']))
  WITH CHECK (public.get_user_role(auth.uid()) = ANY (ARRAY['super_admin','admin']));
