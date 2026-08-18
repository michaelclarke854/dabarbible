CREATE TABLE public.winback_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant text NOT NULL,
  subject text NOT NULL,
  verse_ref text,
  days_silent integer NOT NULL DEFAULT 0,
  sent_at timestamptz NOT NULL DEFAULT now(),
  returned_at timestamptz,
  replied_at timestamptz
);

CREATE INDEX winback_log_user_sent_idx ON public.winback_log (user_id, sent_at DESC);
CREATE INDEX winback_log_open_idx ON public.winback_log (returned_at, sent_at DESC);

GRANT ALL ON public.winback_log TO service_role;
GRANT SELECT ON public.winback_log TO authenticated;

ALTER TABLE public.winback_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view winback log"
ON public.winback_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));