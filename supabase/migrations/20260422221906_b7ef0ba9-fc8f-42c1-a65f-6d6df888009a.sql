
-- Funnel events for trial / conversion analytics
CREATE TABLE public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_name text NOT NULL,
  screen text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_funnel_events_user_created ON public.funnel_events(user_id, created_at DESC);
CREATE INDEX idx_funnel_events_event_created ON public.funnel_events(event_name, created_at DESC);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert events for themselves
CREATE POLICY "Users can insert their own funnel events"
ON public.funnel_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Anyone (including anon) can insert anonymous events (user_id IS NULL)
CREATE POLICY "Anyone can insert anonymous funnel events"
ON public.funnel_events
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL);

-- Admins can read everything
CREATE POLICY "Admins can view all funnel events"
ON public.funnel_events
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- Users can read their own
CREATE POLICY "Users can view their own funnel events"
ON public.funnel_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
