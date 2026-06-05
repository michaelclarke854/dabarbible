CREATE TABLE public.verse_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'post_response_prompt',
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX verse_subscribers_email_lower_idx ON public.verse_subscribers (lower(email));

GRANT INSERT ON public.verse_subscribers TO anon, authenticated;
GRANT ALL ON public.verse_subscribers TO service_role;

ALTER TABLE public.verse_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to verse"
ON public.verse_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Service role can read"
ON public.verse_subscribers
FOR SELECT
TO service_role
USING (true);