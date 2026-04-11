
-- Saved verses table
CREATE TABLE public.saved_verses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  verse_text TEXT NOT NULL,
  session_id UUID REFERENCES public.wisdom_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_verses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved verses"
  ON public.saved_verses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved verses"
  ON public.saved_verses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved verses"
  ON public.saved_verses FOR DELETE
  USING (auth.uid() = user_id);

-- Verse annotations table
CREATE TABLE public.verse_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  saved_verse_id UUID NOT NULL REFERENCES public.saved_verses(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.verse_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own annotations"
  ON public.verse_annotations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own annotations"
  ON public.verse_annotations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own annotations"
  ON public.verse_annotations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own annotations"
  ON public.verse_annotations FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_verse_annotations_updated_at
  BEFORE UPDATE ON public.verse_annotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
