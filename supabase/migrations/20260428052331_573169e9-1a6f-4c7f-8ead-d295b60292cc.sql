-- generated_videos table
CREATE TABLE IF NOT EXISTS public.generated_videos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_type       TEXT NOT NULL CHECK (video_type IN ('social', 'pastoral_trust', 'whatsapp_card')),
  week_start       DATE NOT NULL,
  verse_ref        TEXT,
  verse_text       TEXT,
  reflection_theme TEXT,
  storage_path     TEXT,
  public_url       TEXT,
  render_status    TEXT NOT NULL DEFAULT 'pending'
                   CHECK (render_status IN ('pending', 'rendering', 'complete', 'failed')),
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(video_type, week_start)
);

CREATE INDEX IF NOT EXISTS idx_generated_videos_type_status
  ON public.generated_videos(video_type, render_status, week_start DESC);

ALTER TABLE public.generated_videos ENABLE ROW LEVEL SECURITY;

-- Admins read all
CREATE POLICY "admin_all_videos"
  ON public.generated_videos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

-- Authenticated users read completed whatsapp cards
CREATE POLICY "members_read_completed_whatsapp"
  ON public.generated_videos FOR SELECT TO authenticated
  USING (
    video_type = 'whatsapp_card'
    AND render_status = 'complete'
  );

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dabar-videos',
  'dabar-videos',
  true,
  104857600,
  ARRAY['video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Public read for video objects
DROP POLICY IF EXISTS "public_video_read" ON storage.objects;
CREATE POLICY "public_video_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'dabar-videos');

-- Authenticated write (service role bypasses RLS; this covers any future authenticated upload paths)
DROP POLICY IF EXISTS "service_role_video_write" ON storage.objects;
CREATE POLICY "service_role_video_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dabar-videos');