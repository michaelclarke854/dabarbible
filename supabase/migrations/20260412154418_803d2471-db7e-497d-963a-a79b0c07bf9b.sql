
-- Journal insights table
CREATE TABLE public.journal_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  themes TEXT[] NOT NULL DEFAULT '{}',
  primary_theme TEXT NOT NULL,
  insight_text TEXT NOT NULL,
  scripture_ref TEXT,
  scripture_text TEXT,
  entry_count INTEGER NOT NULL DEFAULT 0,
  question_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.journal_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights"
  ON public.journal_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_journal_insights_user_id ON public.journal_insights(user_id);

-- Journal agent runs (audit log)
CREATE TABLE public.journal_agent_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.journal_agent_runs FOR ALL
  USING (false);

CREATE INDEX idx_journal_agent_runs_user_week ON public.journal_agent_runs(user_id, week_start);
