CREATE TABLE public.reflection_recall_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  step integer NOT NULL,
  variant text NOT NULL,
  subject text NOT NULL,
  source_kind text NOT NULL,
  source_id uuid,
  days_silent integer,
  sent_at timestamptz NOT NULL DEFAULT now(),
  returned_at timestamptz,
  replied_at timestamptz,
  UNIQUE (user_id, step)
);
GRANT ALL ON public.reflection_recall_log TO service_role;
ALTER TABLE public.reflection_recall_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_reflection_recall_log_user ON public.reflection_recall_log (user_id, sent_at DESC);