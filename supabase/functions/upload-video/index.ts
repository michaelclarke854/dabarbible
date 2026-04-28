import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-video-type, x-week-start, x-verse-ref, x-verse-text',
  'Access-Control-Expose-Headers': 'content-type',
};

const BUCKET = 'dabar-videos';

type VideoType = 'social' | 'whatsapp_card' | 'pastoral_trust';

function storagePathFor(type: VideoType, weekStart: string): string {
  switch (type) {
    case 'social':
      return `social/${weekStart}.mp4`;
    case 'whatsapp_card':
      return `whatsapp/${weekStart}.mp4`;
    case 'pastoral_trust':
      return 'pastoral/latest.mp4';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const cronSecret = Deno.env.get('CRON_SECRET');

  if (!supabaseUrl || !serviceRoleKey || !cronSecret) {
    console.error('FATAL: Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CRON_SECRET');
    return new Response(
      JSON.stringify({ error: 'Server misconfigured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Auth: bearer CRON_SECRET
  const authHeader = req.headers.get('Authorization') ?? '';
  const presented = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!presented || presented !== cronSecret) {
    console.warn('[upload-video] Unauthorized');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Metadata via headers (so the body is the raw mp4 bytes)
  const videoType = (req.headers.get('x-video-type') ?? '').toLowerCase() as VideoType;
  const weekStart = req.headers.get('x-week-start') ?? '';
  const verseRef = req.headers.get('x-verse-ref') ?? '';
  const verseText = req.headers.get('x-verse-text') ?? '';

  if (!['social', 'whatsapp_card', 'pastoral_trust'].includes(videoType)) {
    return new Response(
      JSON.stringify({ error: 'x-video-type must be social, whatsapp_card, or pastoral_trust' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return new Response(
      JSON.stringify({ error: 'x-week-start must be YYYY-MM-DD' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (videoType !== 'pastoral_trust' && (!verseRef || !verseText)) {
    return new Response(
      JSON.stringify({ error: 'x-verse-ref and x-verse-text required for social/whatsapp_card' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.byteLength === 0) {
    return new Response(
      JSON.stringify({ error: 'Empty body — expected raw MP4 bytes' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (bytes.byteLength > 100 * 1024 * 1024) {
    return new Response(
      JSON.stringify({ error: 'File exceeds 100MB limit' }),
      { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const path = storagePathFor(videoType, weekStart);

  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'video/mp4',
    upsert: true,
  });
  if (uploadErr) {
    console.error('[upload-video] Storage upload failed:', uploadErr);
    return new Response(
      JSON.stringify({ error: `Upload failed: ${uploadErr.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const record = {
    video_type: videoType,
    week_start: weekStart,
    verse_ref: videoType === 'pastoral_trust' ? null : verseRef,
    verse_text: videoType === 'pastoral_trust' ? null : verseText,
    storage_path: path,
    public_url: publicUrl,
    render_status: 'complete',
    error_message: null as string | null,
  };

  const { error: dbErr } = await supabase
    .from('generated_videos')
    .upsert(record, { onConflict: 'video_type,week_start' });

  if (dbErr) {
    console.error('[upload-video] DB upsert failed:', dbErr);
    return new Response(
      JSON.stringify({ error: `DB write failed: ${dbErr.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  console.log(`[upload-video] ${videoType} ${weekStart} uploaded (${bytes.byteLength} bytes) -> ${path}`);

  return new Response(
    JSON.stringify({
      success: true,
      video_type: videoType,
      week_start: weekStart,
      storage_path: path,
      public_url: publicUrl,
      bytes: bytes.byteLength,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});