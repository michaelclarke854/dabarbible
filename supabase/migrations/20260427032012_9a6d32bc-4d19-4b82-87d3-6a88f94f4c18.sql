-- 1. Add a unique, rotatable share token to each draft
ALTER TABLE public.pastor_message_drafts
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE
    DEFAULT encode(gen_random_bytes(24), 'hex');

-- Backfill any existing drafts that don't have a token
UPDATE public.pastor_message_drafts
SET share_token = encode(gen_random_bytes(24), 'hex')
WHERE share_token IS NULL;

-- 2. Public lookup function: returns only the safe, view-only fields
-- Tokens are 48-char hex (24 bytes of entropy) so they're unguessable.
CREATE OR REPLACE FUNCTION public.lookup_draft_by_share_token(_share_token TEXT)
RETURNS TABLE(
  title TEXT,
  theme TEXT,
  outline TEXT,
  scripture_refs TEXT[],
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT title, theme, outline, scripture_refs, created_at
  FROM public.pastor_message_drafts
  WHERE share_token = _share_token
    AND status != 'archived'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_draft_by_share_token(TEXT) TO anon, authenticated;