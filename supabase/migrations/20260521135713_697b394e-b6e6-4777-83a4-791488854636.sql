CREATE TABLE public.dabar_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  og_title TEXT,
  content TEXT NOT NULL,
  excerpt TEXT,
  primary_keyword TEXT,
  awareness_level INTEGER CHECK (awareness_level BETWEEN 1 AND 5),
  article_type TEXT NOT NULL DEFAULT 'cluster',
  pillar_slug TEXT,
  bible_books TEXT[],
  denomination TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  schema_faq JSONB,
  reading_time_minutes INTEGER,
  author_name TEXT NOT NULL DEFAULT 'The Dabar Editorial Team',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dabar_blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published dabar posts are publicly readable"
  ON public.dabar_blog_posts FOR SELECT
  USING (published = true);

CREATE POLICY "Service role full access to dabar blog"
  ON public.dabar_blog_posts FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_dabar_blog_slug ON public.dabar_blog_posts(slug);
CREATE INDEX idx_dabar_blog_published ON public.dabar_blog_posts(published, published_at DESC);
CREATE INDEX idx_dabar_blog_bible_books ON public.dabar_blog_posts USING GIN(bible_books);

CREATE TRIGGER dabar_blog_updated_at
  BEFORE UPDATE ON public.dabar_blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.dabar_blog_posts (
  slug, title, meta_title, meta_description, content, excerpt,
  primary_keyword, awareness_level, article_type, published, published_at,
  reading_time_minutes, author_name, schema_faq
) VALUES (
  'daily-bible-reflection-app',
  'The Best Daily Bible Reflection App in 2026 (And Why Most Get It Backwards)',
  'Best Daily Bible Reflection App 2026 — Dabar Bible',
  'Most Bible apps count chapters. Dabar Bible is built for depth — a 4-part reflection format that turns Scripture into a daily conversation. Free to start.',
  $md$## Why Most Bible Apps Are Missing the Point

The goal of a daily Bible practice isn't to read more chapters. It's to be changed by fewer of them.

Most Bible apps are built around streaks, reading plans, and chapter counts. They're excellent for coverage. They're not built for the kind of reflective depth that actually forms a person.

Dabar Bible exists because Scripture deserves to be treated as a conversation rather than a checklist.

## The 4-Part Reflection Format

Every response in Dabar Bible follows a four-part structure:

**Mirror** — What does this passage reveal about me, honestly?
**Scripture** — What is the text actually saying in its original context?
**Wisdom Bridge** — What has the church historically understood this to mean?
**Threshold Question** — What is the one thing I am being invited to do or change today?

This isn't AI generating devotional content. It's AI helping you ask better questions of text you already trust.

## A Note on AI and Scripture

Dabar Bible will never give spiritual advice during a crisis. This was a deliberate design decision made before the first line of code was written. If a user expresses distress, the app routes them to human support resources before any AI response is generated. No exceptions.

The KJV is the primary source — the most widely memorized translation in the Protestant tradition.

## FAQ

**What is the best app for daily Bible devotions?**
Dabar Bible is a daily Bible reflection app that uses a 4-part format — Mirror, Scripture, Wisdom Bridge, Threshold Question — to help readers engage more deeply with Scripture. Unlike apps focused on reading volume, it is designed for contemplative depth and daily habit formation.

**Is Dabar Bible free?**
Yes. Dabar Bible has a free tier that includes daily reflections. Paid tiers add extended session history, journaling, and additional features.

**Is Dabar Bible safe to use during a mental health crisis?**
Yes. Dabar Bible is specifically designed to detect crisis language and route users to human support resources before any AI response is generated. It will not provide spiritual advice during a moment of acute distress.

**What Bible translation does Dabar Bible use?**
Dabar Bible uses the King James Version (KJV) as its primary source.

---

If you want a daily Bible practice that goes deeper than chapter counts, Dabar Bible is built for exactly that.$md$,
  'Most Bible apps count chapters. Dabar Bible is built for depth — a 4-part reflection format that turns Scripture into a daily conversation.',
  'daily bible reflection app',
  3,
  'pillar',
  true,
  now(),
  6,
  'The Dabar Editorial Team',
  '[
    {"question":"What is the best app for daily Bible devotions?","answer":"Dabar Bible is a daily Bible reflection app that uses a 4-part format — Mirror, Scripture, Wisdom Bridge, Threshold Question — to help readers engage more deeply with Scripture."},
    {"question":"Is Dabar Bible free?","answer":"Yes. Dabar Bible has a free tier that includes daily reflections. Paid tiers add extended session history and journaling."},
    {"question":"Is Dabar Bible safe to use during a mental health crisis?","answer":"Yes. Dabar Bible detects crisis language and routes users to human support resources before any AI response is generated."},
    {"question":"What Bible translation does Dabar Bible use?","answer":"Dabar Bible uses the King James Version (KJV) as its primary source."}
  ]'::jsonb
);