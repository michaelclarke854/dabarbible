CREATE TABLE public.guest_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  title text,
  church text,
  location text,
  bio text NOT NULL,
  photo_url text,
  website_url text,
  instagram_url text,
  youtube_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.guest_contributors TO anon;
GRANT SELECT ON public.guest_contributors TO authenticated;
GRANT ALL ON public.guest_contributors TO service_role;

ALTER TABLE public.guest_contributors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active contributors"
  ON public.guest_contributors FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage contributors"
  ON public.guest_contributors FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.guest_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id uuid NOT NULL REFERENCES public.guest_contributors(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  scripture_ref text NOT NULL,
  scripture_text text NOT NULL,
  title text NOT NULL,
  prompt_body text NOT NULL,
  pastoral_note text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contributor_id, week_start)
);

CREATE INDEX idx_guest_prompts_week ON public.guest_prompts (week_start DESC);

GRANT SELECT ON public.guest_prompts TO anon;
GRANT SELECT ON public.guest_prompts TO authenticated;
GRANT ALL ON public.guest_prompts TO service_role;

ALTER TABLE public.guest_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published prompts"
  ON public.guest_prompts FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can manage prompts"
  ON public.guest_prompts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_guest_contributors_updated_at
  BEFORE UPDATE ON public.guest_contributors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guest_prompts_updated_at
  BEFORE UPDATE ON public.guest_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();