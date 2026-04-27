-- ============================================================================
-- BLOCK 1: Pastor Dashboard schema
-- FKs reference profiles.user_id (which mirrors auth.users.id) for RLS simplicity
-- ============================================================================

-- 1.1 Pastoral communities
CREATE TABLE IF NOT EXISTS public.pastoral_communities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'church',
  pastor_id    UUID NOT NULL,
  invite_code  TEXT UNIQUE NOT NULL
               DEFAULT substring(md5(random()::text || clock_timestamp()::text), 1, 8),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pastoral_communities_type_check
    CHECK (type IN ('church','sunday_school','small_group','religious_school','other'))
);

CREATE INDEX IF NOT EXISTS idx_pastoral_communities_pastor
  ON public.pastoral_communities(pastor_id);
CREATE INDEX IF NOT EXISTS idx_pastoral_communities_invite
  ON public.pastoral_communities(invite_code);

CREATE TRIGGER trg_pastoral_communities_updated_at
  BEFORE UPDATE ON public.pastoral_communities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1.2 Pastoral community members
CREATE TABLE IF NOT EXISTS public.pastoral_community_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id  UUID NOT NULL REFERENCES public.pastoral_communities(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pcm_community ON public.pastoral_community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_pcm_user      ON public.pastoral_community_members(user_id);

-- 1.3 Pastor message drafts
CREATE TABLE IF NOT EXISTS public.pastor_message_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pastor_id       UUID NOT NULL,
  community_id    UUID NOT NULL REFERENCES public.pastoral_communities(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  theme           TEXT NOT NULL,
  question_count  INTEGER NOT NULL DEFAULT 0,
  outline         TEXT NOT NULL,
  scripture_refs  TEXT[] NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'draft',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pastor_message_drafts_status_check
    CHECK (status IN ('draft','saved','archived'))
);

CREATE INDEX IF NOT EXISTS idx_pmd_pastor    ON public.pastor_message_drafts(pastor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pmd_community ON public.pastor_message_drafts(community_id);

CREATE TRIGGER trg_pastor_message_drafts_updated_at
  BEFORE UPDATE ON public.pastor_message_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1.4 Profile additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_pastor             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pastoral_community_id UUID
    REFERENCES public.pastoral_communities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_is_pastor
  ON public.profiles(is_pastor) WHERE is_pastor = true;
CREATE INDEX IF NOT EXISTS idx_profiles_pastoral_community
  ON public.profiles(pastoral_community_id);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.pastoral_communities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastoral_community_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastor_message_drafts        ENABLE ROW LEVEL SECURITY;

-- Helper: SECURITY DEFINER check to avoid recursion between
-- pastoral_communities and pastoral_community_members
CREATE OR REPLACE FUNCTION public.is_pastor_of_community(_community_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pastoral_communities
    WHERE id = _community_id AND pastor_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_community(_community_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pastoral_community_members
    WHERE community_id = _community_id AND user_id = _user_id
  );
$$;

-- pastoral_communities policies
CREATE POLICY "Pastors manage own community"
  ON public.pastoral_communities FOR ALL TO authenticated
  USING (pastor_id = auth.uid())
  WITH CHECK (pastor_id = auth.uid());

CREATE POLICY "Members can read their community"
  ON public.pastoral_communities FOR SELECT TO authenticated
  USING (public.is_member_of_community(id, auth.uid()));

-- pastoral_community_members policies
CREATE POLICY "Users manage own membership"
  ON public.pastoral_community_members FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Pastors read their community members"
  ON public.pastoral_community_members FOR SELECT TO authenticated
  USING (public.is_pastor_of_community(community_id, auth.uid()));

-- pastor_message_drafts policies
CREATE POLICY "Pastors manage own drafts"
  ON public.pastor_message_drafts FOR ALL TO authenticated
  USING (pastor_id = auth.uid())
  WITH CHECK (pastor_id = auth.uid());

-- ============================================================================
-- Aggregated themes view — service_role only, never client-readable
-- ============================================================================

CREATE OR REPLACE VIEW public.pastoral_community_themes
WITH (security_invoker = true) AS
SELECT
  pcm.community_id,
  COALESCE(st.theme, 'other')                AS theme,
  COUNT(DISTINCT ws.id)::integer             AS question_count,
  DATE_TRUNC('month', ws.created_at)::date   AS month,
  MAX(ws.created_at)                         AS last_question_at
FROM public.pastoral_community_members pcm
JOIN public.wisdom_sessions ws
  ON ws.user_id = pcm.user_id
  AND ws.created_at >= NOW() - INTERVAL '90 days'
LEFT JOIN public.session_themes st
  ON st.session_id = ws.id
  AND st.confidence >= 0.6
WHERE ws.flagged = false
GROUP BY pcm.community_id, COALESCE(st.theme, 'other'), DATE_TRUNC('month', ws.created_at);

REVOKE ALL ON public.pastoral_community_themes FROM anon, authenticated, public;
GRANT SELECT ON public.pastoral_community_themes TO service_role;