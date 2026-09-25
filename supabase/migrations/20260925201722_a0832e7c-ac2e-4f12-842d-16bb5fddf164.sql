CREATE TABLE public.muse_connector_settings (id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), enabled boolean NOT NULL DEFAULT true, updated_at timestamptz DEFAULT now());
GRANT ALL ON public.muse_connector_settings TO service_role;
ALTER TABLE public.muse_connector_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.muse_connector_settings (id, enabled) VALUES (1, true);
CREATE TABLE public.muse_verse_calls (id bigserial PRIMARY KEY, theme text, called_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.muse_verse_calls TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.muse_verse_calls_id_seq TO service_role;
ALTER TABLE public.muse_verse_calls ENABLE ROW LEVEL SECURITY;