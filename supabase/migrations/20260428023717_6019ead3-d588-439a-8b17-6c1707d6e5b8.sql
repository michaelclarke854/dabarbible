-- ── 1.1 reflection_category on wisdom_sessions ──
ALTER TABLE public.wisdom_sessions
  ADD COLUMN IF NOT EXISTS reflection_category TEXT DEFAULT 'general';

-- Use trigger-based validation (CHECK constraints can't be ALTERed cleanly later)
CREATE OR REPLACE FUNCTION public.validate_reflection_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reflection_category IS NOT NULL AND NEW.reflection_category NOT IN (
    'grief_and_loss', 'anxiety_and_fear', 'doubt_and_faith',
    'relationships', 'purpose_and_calling', 'forgiveness',
    'suffering_and_theodicy', 'spiritual_growth', 'identity',
    'sin_and_repentance', 'gratitude_and_joy', 'general', 'crisis_escalated'
  ) THEN
    RAISE EXCEPTION 'Invalid reflection_category: %', NEW.reflection_category;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_reflection_category ON public.wisdom_sessions;
CREATE TRIGGER trg_validate_reflection_category
  BEFORE INSERT OR UPDATE OF reflection_category ON public.wisdom_sessions
  FOR EACH ROW EXECUTE FUNCTION public.validate_reflection_category();

CREATE INDEX IF NOT EXISTS idx_wisdom_sessions_user_created
  ON public.wisdom_sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wisdom_sessions_category
  ON public.wisdom_sessions(reflection_category, created_at DESC);

-- ── 1.7 onboarding + seat cap on pastoral_communities ──
ALTER TABLE public.pastoral_communities
  ADD COLUMN IF NOT EXISTS seat_cap INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS first_member_joined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_broadcast_sent_at TIMESTAMPTZ;

-- ── 1.5 join_source on pastoral_community_members ──
ALTER TABLE public.pastoral_community_members
  ADD COLUMN IF NOT EXISTS join_source TEXT NOT NULL DEFAULT 'link';

CREATE OR REPLACE FUNCTION public.validate_join_source()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.join_source NOT IN ('link', 'bulletin', 'text', 'email', 'social', 'direct') THEN
    RAISE EXCEPTION 'Invalid join_source: %', NEW.join_source;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_join_source ON public.pastoral_community_members;
CREATE TRIGGER trg_validate_join_source
  BEFORE INSERT OR UPDATE OF join_source ON public.pastoral_community_members
  FOR EACH ROW EXECUTE FUNCTION public.validate_join_source();

-- ── 1.2 congregation_pulse ──
CREATE TABLE IF NOT EXISTS public.congregation_pulse (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id             UUID NOT NULL REFERENCES public.pastoral_communities(id) ON DELETE CASCADE,
  week_start               DATE NOT NULL,
  struggling               INTEGER NOT NULL DEFAULT 0,
  searching                INTEGER NOT NULL DEFAULT 0,
  grateful                 INTEGER NOT NULL DEFAULT 0,
  top_categories           JSONB,
  ai_draft                 TEXT,
  ai_verses                JSONB,
  ai_word_count            INTEGER,
  email_sent_to_pastor     BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent_at            TIMESTAMPTZ,
  broadcast_sent           BOOLEAN NOT NULL DEFAULT FALSE,
  broadcast_sent_at        TIMESTAMPTZ,
  had_activity             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_pulse_community_week
  ON public.congregation_pulse(community_id, week_start DESC);

ALTER TABLE public.congregation_pulse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pastor_reads_own_pulse" ON public.congregation_pulse;
CREATE POLICY "pastor_reads_own_pulse"
  ON public.congregation_pulse FOR SELECT TO authenticated
  USING (is_pastor_of_community(community_id, auth.uid()));

-- ── 1.3 pastoral_threshold_alerts ──
CREATE TABLE IF NOT EXISTS public.pastoral_threshold_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id    UUID NOT NULL REFERENCES public.pastoral_communities(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL,
  signal_count    INTEGER NOT NULL DEFAULT 3,
  alert_type      TEXT NOT NULL DEFAULT 'persistent_struggling',
  status          TEXT NOT NULL DEFAULT 'pending',
  revealed_at     TIMESTAMPTZ,
  contacted_at    TIMESTAMPTZ,
  email_sent      BOOLEAN NOT NULL DEFAULT FALSE,
  nudge_sent      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, member_id, status)
);

CREATE OR REPLACE FUNCTION public.validate_threshold_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.alert_type NOT IN ('persistent_struggling', 'crisis_escalation') THEN
    RAISE EXCEPTION 'Invalid alert_type: %', NEW.alert_type;
  END IF;
  IF NEW.status NOT IN ('pending', 'revealed', 'contacted', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_threshold_alert ON public.pastoral_threshold_alerts;
CREATE TRIGGER trg_validate_threshold_alert
  BEFORE INSERT OR UPDATE ON public.pastoral_threshold_alerts
  FOR EACH ROW EXECUTE FUNCTION public.validate_threshold_alert();

CREATE INDEX IF NOT EXISTS idx_threshold_alerts_community
  ON public.pastoral_threshold_alerts(community_id, status, created_at DESC);

ALTER TABLE public.pastoral_threshold_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pastor_reads_own_alerts" ON public.pastoral_threshold_alerts;
CREATE POLICY "pastor_reads_own_alerts"
  ON public.pastoral_threshold_alerts FOR SELECT TO authenticated
  USING (is_pastor_of_community(community_id, auth.uid()));

DROP POLICY IF EXISTS "pastor_updates_own_alerts" ON public.pastoral_threshold_alerts;
CREATE POLICY "pastor_updates_own_alerts"
  ON public.pastoral_threshold_alerts FOR UPDATE TO authenticated
  USING (is_pastor_of_community(community_id, auth.uid()))
  WITH CHECK (is_pastor_of_community(community_id, auth.uid()));

-- ── pastoral_checkin_requests (new) ──
CREATE TABLE IF NOT EXISTS public.pastoral_checkin_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id    UUID NOT NULL REFERENCES public.pastoral_communities(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL,
  trigger_type    TEXT NOT NULL DEFAULT 'post_reflection',
  mood_signal     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.validate_checkin_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.mood_signal NOT IN ('struggling', 'searching', 'grateful') THEN
    RAISE EXCEPTION 'Invalid mood_signal: %', NEW.mood_signal;
  END IF;
  IF NEW.trigger_type NOT IN ('post_reflection', 'manual') THEN
    RAISE EXCEPTION 'Invalid trigger_type: %', NEW.trigger_type;
  END IF;
  IF NEW.status NOT IN ('pending', 'acknowledged', 'resolved') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_checkin_request ON public.pastoral_checkin_requests;
CREATE TRIGGER trg_validate_checkin_request
  BEFORE INSERT OR UPDATE ON public.pastoral_checkin_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_checkin_request();

CREATE INDEX IF NOT EXISTS idx_checkin_community_requested
  ON public.pastoral_checkin_requests(community_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkin_member
  ON public.pastoral_checkin_requests(member_id, requested_at DESC);

ALTER TABLE public.pastoral_checkin_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_inserts_own_checkin" ON public.pastoral_checkin_requests;
CREATE POLICY "member_inserts_own_checkin"
  ON public.pastoral_checkin_requests FOR INSERT TO authenticated
  WITH CHECK (
    member_id = auth.uid()
    AND is_member_of_community(community_id, auth.uid())
  );

DROP POLICY IF EXISTS "member_reads_own_checkin" ON public.pastoral_checkin_requests;
CREATE POLICY "member_reads_own_checkin"
  ON public.pastoral_checkin_requests FOR SELECT TO authenticated
  USING (member_id = auth.uid());

DROP POLICY IF EXISTS "pastor_reads_community_checkins" ON public.pastoral_checkin_requests;
CREATE POLICY "pastor_reads_community_checkins"
  ON public.pastoral_checkin_requests FOR SELECT TO authenticated
  USING (is_pastor_of_community(community_id, auth.uid()));

DROP POLICY IF EXISTS "pastor_updates_community_checkins" ON public.pastoral_checkin_requests;
CREATE POLICY "pastor_updates_community_checkins"
  ON public.pastoral_checkin_requests FOR UPDATE TO authenticated
  USING (is_pastor_of_community(community_id, auth.uid()))
  WITH CHECK (is_pastor_of_community(community_id, auth.uid()));

-- ── pastoral_announcements (new) ──
CREATE TABLE IF NOT EXISTS public.pastoral_announcements (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id       UUID NOT NULL REFERENCES public.pastoral_communities(id) ON DELETE CASCADE,
  pastor_id          UUID NOT NULL,
  pulse_id           UUID REFERENCES public.congregation_pulse(id) ON DELETE SET NULL,
  message_body       TEXT NOT NULL,
  scripture_refs     TEXT[] NOT NULL DEFAULT '{}',
  recipient_count    INTEGER NOT NULL DEFAULT 0,
  delivered_count    INTEGER NOT NULL DEFAULT 0,
  sent_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_community
  ON public.pastoral_announcements(community_id, sent_at DESC);

ALTER TABLE public.pastoral_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pastor_manages_own_announcements" ON public.pastoral_announcements;
CREATE POLICY "pastor_manages_own_announcements"
  ON public.pastoral_announcements FOR ALL TO authenticated
  USING (pastor_id = auth.uid() AND is_pastor_of_community(community_id, auth.uid()))
  WITH CHECK (pastor_id = auth.uid() AND is_pastor_of_community(community_id, auth.uid()));

DROP POLICY IF EXISTS "members_read_community_announcements" ON public.pastoral_announcements;
CREATE POLICY "members_read_community_announcements"
  ON public.pastoral_announcements FOR SELECT TO authenticated
  USING (is_member_of_community(community_id, auth.uid()));