-- Fix 1: Scope video read to community members only
DROP POLICY IF EXISTS "members_read_completed_whatsapp" ON public.generated_videos;

CREATE POLICY "members_read_completed_whatsapp" ON public.generated_videos
  FOR SELECT TO authenticated
  USING (
    video_type = 'whatsapp_card'
    AND render_status = 'complete'
    AND EXISTS (
      SELECT 1 FROM pastoral_community_members pcm
      WHERE pcm.user_id = auth.uid()
    )
  );

-- Fix 2: Restrict video storage uploads to service_role only
DROP POLICY IF EXISTS "service_role_video_write" ON storage.objects;

CREATE POLICY "service_role_video_write" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'dabar-videos'
    AND auth.role() = 'service_role'
  );