-- 1. Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key  TEXT NOT NULL UNIQUE,
  step          INTEGER NOT NULL CHECK (step IN (0, 1, 2, 3)),
  denomination  TEXT NOT NULL DEFAULT 'default',
  subject       TEXT NOT NULL,
  body          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  version       INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_step_denom
  ON public.email_templates(step, denomination, is_active);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage; service role bypasses RLS automatically
CREATE POLICY "Admins can view email_templates"
  ON public.email_templates FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "Admins can update email_templates"
  ON public.email_templates FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
  WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "Admins can insert email_templates"
  ON public.email_templates FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- 2. Trigger to bump version & updated_at
CREATE OR REPLACE FUNCTION public.update_email_template_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_templates_updated_at ON public.email_templates;
CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_email_template_timestamp();

-- 3. Seed expert-reviewed templates
INSERT INTO public.email_templates (template_key, step, denomination, subject, body) VALUES
(
  'elijah_step_1_default',
  1,
  'default',
  'What your congregation is carrying',
  E'Pastor {{first_name}},\n\nThere''s a gap most pastors feel but rarely talk about — you''re responsible for the spiritual wellbeing of your congregation, and most weeks you only know what they''re willing to share on Sunday.\n\nI built DABAR because I wanted something that could close that gap. It''s a daily scripture reflection practice for congregations. Your people bring their questions to Scripture each day. You see — anonymously, aggregated — what themes your congregation is actually wrestling with that week. And DABAR helps you draft a pastoral word for Sunday grounded in those themes.\n\nI''d love for you to try it with your congregation, free for 90 days. No credit card, no obligation.\n\ndabarbible.com/pastor-access\n\n— Mike\n\nP.S. "He tends his flock like a shepherd: He gathers the lambs in his arms." — Isaiah 40:11'
),
(
  'elijah_step_1_catholic',
  1,
  'catholic',
  'A daily practice for your parish',
  E'Dear Father {{first_name}},\n\nThere''s a gap most parish priests feel but rarely talk about — you''re responsible for the spiritual formation of your community, and most weeks you only know what your parishioners are willing to bring to confession or spiritual direction.\n\nI built DABAR as a daily scripture reflection practice — rooted in the tradition of lectio divina — that your parishioners can bring their questions to daily. You see, anonymously and aggregated, what your community is carrying spiritually each week, and DABAR helps you prepare a word grounded in those themes.\n\nI''d welcome you to try it with your parish for 90 days, completely free.\n\ndabarbible.com/pastor-access\n\n— Mike\n\nP.S. "Your word is a lamp to my feet and a light to my path." — Psalm 119:105'
),
(
  'elijah_step_1_anglican',
  1,
  'anglican',
  'What your congregation is carrying',
  E'Dear {{pastor_name}},\n\nThere''s a gap most clergy feel but rarely name — you hold responsibility for the spiritual lives of your congregation, and most weeks you only know what they bring to you directly.\n\nI built DABAR as a daily scripture reflection practice that complements the rhythm of the Daily Office. Your congregation brings their questions to Scripture each day. You see — anonymously, aggregated — what themes your people are wrestling with that week, and DABAR helps you prepare a word grounded in those themes.\n\nI''d be glad for you to try it with your congregation for 90 days, with no cost or obligation.\n\ndabarbible.com/pastor-access\n\n— Mike\n\nP.S. "He tends his flock like a shepherd: He gathers the lambs in his arms." — Isaiah 40:11'
),
(
  'elijah_step_2_default',
  2,
  'default',
  'The question nobody brings to you',
  E'Pastor {{first_name}},\n\nI''ve been thinking about this since I wrote to you last week.\n\nThe questions a congregation brings on Sunday are not usually the questions they''re actually carrying. The grief, the doubt, the fear — those stay private. DABAR gives people a place to bring those questions to Scripture without having to say them out loud to anyone.\n\nWhat pastors tell me they value most is not the technology. It''s finally knowing that someone in their flock who''s been quiet for months has been wrestling with grief for six weeks.\n\nThe offer is still open — 90 days free.\n\ndabarbible.com/pastor-access\n\n— Mike'
),
(
  'elijah_step_2_catholic',
  2,
  'catholic',
  'What your parishioners carry in silence',
  E'Dear Father {{first_name}},\n\nI''ve been thinking about this since I wrote to you last week.\n\nThe questions a parish brings to Mass are not usually the questions they''re actually carrying. The grief, the doubt, the fear — those stay private, or they come to you one at a time in the confessional or through spiritual direction. DABAR gives your parishioners a place to bring those questions to Scripture in their own time.\n\nWhat clergy tell me they value most is not the technology. It''s the window it opens into what their community is carrying spiritually — week by week, theme by theme.\n\nThe offer is still open — 90 days free.\n\ndabarbible.com/pastor-access\n\n— Mike'
),
(
  'elijah_step_2_anglican',
  2,
  'anglican',
  'The questions your congregation carries quietly',
  E'Dear {{pastor_name}},\n\nI''ve been thinking about this since I last wrote.\n\nThe questions a congregation brings on Sunday are rarely the ones they''re actually carrying through the week. The grief, the doubt, the uncertainty — those stay private. DABAR gives people a place to bring those questions to Scripture in their own time.\n\nWhat clergy tell me they value most is the window it opens — knowing that someone in their congregation who has seemed distant has been sitting with a question about suffering for three weeks.\n\nThe offer remains open — 90 days free, no obligation.\n\ndabarbible.com/pastor-access\n\n— Mike'
),
(
  'elijah_step_3_default',
  3,
  'default',
  'One thing that surprised me',
  E'Pastor {{first_name}},\n\nI won''t ask anything of you in this note.\n\nI just wanted to share something that surprised me in building DABAR: the question that comes up most often across all our congregations isn''t grief or doubt or marriage. It''s purpose. "What am I here for?" — asked in a hundred different ways, by people of every age.\n\nI thought you might find that interesting.\n\nThe pastoral access offer stands whenever it''s right. No pressure, no follow-up after this.\n\n— Mike'
),
(
  'elijah_step_3_catholic',
  3,
  'catholic',
  'Something I didn''t expect',
  E'Dear Father {{first_name}},\n\nI won''t ask anything of you in this note.\n\nI wanted to share something that surprised me in building DABAR: the question that surfaces most often across all our communities isn''t grief or doubt or vocation in the formal sense. It''s purpose. "What am I here for?" — in a hundred different phrasings, from young adults and elderly parishioners alike.\n\nI thought you might find that worth knowing.\n\nThe pastoral access offer stands whenever it''s right. No further correspondence after this.\n\n— Mike'
),
(
  'pastoral_access_approved',
  0,
  'default',
  'Your DABAR pastoral access is ready',
  E'Dear {{pastor_name}},\n\nWelcome. Your pastoral access to DABAR is confirmed.\n\nYou can set up your congregation at dabarbible.com/pastor — it takes about five minutes. Your congregation can join via a simple invite link that DABAR generates for you. They don''t need to know anything about the technology; they just bring their questions to Scripture each day.\n\nYou''ll receive your congregation''s weekly spiritual pulse each Saturday morning — a quiet summary of what themes your people have been exploring, and a draft pastoral word you can edit and send.\n\nIf anything feels off theologically, there''s a flag button on every AI response. I take those seriously.\n\nI''m glad you''re here.\n\n— Mike\ndabarbible.com\n\nP.S. "I am the good shepherd; I know my sheep and my sheep know me." — John 10:14'
)
ON CONFLICT (template_key) DO UPDATE SET
  subject    = EXCLUDED.subject,
  body       = EXCLUDED.body,
  updated_at = now();