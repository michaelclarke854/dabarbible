-- Create user_patterns table
CREATE TABLE public.user_patterns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  theme text NOT NULL CHECK (theme IN ('anxiety','purpose','relationships','grief','identity','decisions','family','work','faith')),
  occurrence integer NOT NULL DEFAULT 1,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, theme)
);

ALTER TABLE public.user_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own patterns"
  ON public.user_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own patterns"
  ON public.user_patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patterns"
  ON public.user_patterns FOR UPDATE
  USING (auth.uid() = user_id);

-- Create session_themes table
CREATE TABLE public.session_themes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.wisdom_sessions(id) ON DELETE CASCADE,
  theme text NOT NULL,
  confidence float NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1)
);

ALTER TABLE public.session_themes ENABLE ROW LEVEL SECURITY;

-- Users can view session_themes for their own sessions
CREATE POLICY "Users can view their own session themes"
  ON public.session_themes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wisdom_sessions ws
      WHERE ws.id = session_id AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own session themes"
  ON public.session_themes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wisdom_sessions ws
      WHERE ws.id = session_id AND ws.user_id = auth.uid()
    )
  );

-- Index for fast pattern lookups
CREATE INDEX idx_user_patterns_user_id ON public.user_patterns(user_id);
CREATE INDEX idx_session_themes_session_id ON public.session_themes(session_id);