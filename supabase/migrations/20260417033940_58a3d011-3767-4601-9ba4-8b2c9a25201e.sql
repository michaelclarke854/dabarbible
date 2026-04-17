-- Response flags table
CREATE TABLE IF NOT EXISTS public.response_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.wisdom_sessions(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  flag_notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.response_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can flag their own sessions"
ON public.response_flags
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.wisdom_sessions ws
    WHERE ws.id = response_flags.session_id
      AND ws.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all flags"
ON public.response_flags
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE INDEX idx_response_flags_session ON public.response_flags(session_id);
CREATE INDEX idx_response_flags_created ON public.response_flags(created_at DESC);

-- Pastoral inquiries table
CREATE TABLE IF NOT EXISTS public.pastoral_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  church_name TEXT NOT NULL,
  email TEXT NOT NULL,
  congregation_size TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pastoral_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a pastoral inquiry"
ON public.pastoral_inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view pastoral inquiries"
ON public.pastoral_inquiries
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE INDEX idx_pastoral_inquiries_created ON public.pastoral_inquiries(created_at DESC);