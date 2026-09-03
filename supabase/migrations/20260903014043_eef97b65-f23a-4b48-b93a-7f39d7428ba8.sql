CREATE TABLE public.streak_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  milestone_day INTEGER NOT NULL,
  streak_length INTEGER NOT NULL DEFAULT 0,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen_at TIMESTAMPTZ,
  UNIQUE (user_id, milestone_day)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.streak_milestones TO authenticated;
GRANT ALL ON public.streak_milestones TO service_role;

ALTER TABLE public.streak_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own streak milestones"
ON public.streak_milestones FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_streak_milestones_user ON public.streak_milestones(user_id);