-- Add anonymous session identity column
ALTER TABLE public.funnel_events ADD COLUMN IF NOT EXISTS anon_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_funnel_events_anon_session ON public.funnel_events(anon_session_id, created_at DESC);

-- Consolidate insert policies into one
DROP POLICY IF EXISTS "Users can insert their own funnel events" ON public.funnel_events;
DROP POLICY IF EXISTS "Anyone can insert anonymous funnel events" ON public.funnel_events;
DROP POLICY IF EXISTS "insert_funnel_events" ON public.funnel_events;

CREATE POLICY "insert_funnel_events" ON public.funnel_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL)
    OR (auth.uid() = user_id)
  );