import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterVideosPayload {
  week_start: string;
  verse_ref: string;
  verse_text: string;
  social_url: string;
  whatsapp_url: string;
  pastoral_url: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response(
      JSON.stringify({ error: 'Server misconfigured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let payload: RegisterVideosPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { week_start, verse_ref, verse_text, social_url, whatsapp_url, pastoral_url } = payload;

  if (!week_start || !verse_ref || !verse_text || !social_url || !whatsapp_url || !pastoral_url) {
    return new Response(
      JSON.stringify({
        error:
          'Missing required fields: week_start, verse_ref, verse_text, social_url, whatsapp_url, pastoral_url',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(week_start)) {
    return new Response(
      JSON.stringify({ error: 'week_start must be in YYYY-MM-DD format' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const records = [
    {
      video_type: 'social',
      week_start,
      verse_ref,
      verse_text,
      public_url: social_url,
      storage_path: `social/${week_start}.mp4`,
      render_status: 'complete',
    },
    {
      video_type: 'whatsapp_card',
      week_start,
      verse_ref,
      verse_text,
      public_url: whatsapp_url,
      storage_path: `whatsapp/${week_start}.mp4`,
      render_status: 'complete',
    },
    {
      video_type: 'pastoral_trust',
      week_start,
      verse_ref: null as string | null,
      verse_text: null as string | null,
      public_url: pastoral_url,
      storage_path: 'pastoral/latest.mp4',
      render_status: 'complete',
    },
  ];

  const { error } = await supabase
    .from('generated_videos')
    .upsert(records, { onConflict: 'video_type,week_start' });

  if (error) {
    console.error('[register-videos] Upsert failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  console.log(`[register-videos] Registered 3 videos for week ${week_start} — ${verse_ref}`);

  return new Response(
    JSON.stringify({
      success: true,
      week_start,
      verse_ref,
      registered: ['social', 'whatsapp_card', 'pastoral_trust'],
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});