-- Public lookup of a community's display name by invite code.
-- Invite codes are unguessable tokens, so this is safe to expose.
-- Returns NULL if the code does not match any community.
CREATE OR REPLACE FUNCTION public.lookup_community_by_invite(_invite_code TEXT)
RETURNS TABLE(id UUID, name TEXT, type TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, type
  FROM public.pastoral_communities
  WHERE invite_code = _invite_code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_community_by_invite(TEXT) TO anon, authenticated;