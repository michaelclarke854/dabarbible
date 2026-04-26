import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error('FATAL: Missing required Supabase env vars');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: CORS });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  }

  const { data: { user }, error: authErr } = await createClient(
    supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } }
  ).auth.getUser();

  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  }

  // Verify admin role (profiles.user_id, role in 'admin' or 'super_admin')
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileErr || !profile || !['admin', 'super_admin'].includes((profile as { role: string }).role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS });
  }

  try {
    const { data: daily, error: dailyErr } = await supabaseAdmin
      .from('admin_true_engagement')
      .select('day, total_anon_sessions, engaged_sessions, engagement_rate_pct')
      .limit(30);

    if (dailyErr) throw new Error(`View query failed: ${dailyErr.message}`);

    const rows = (daily ?? []) as Array<{
      day: string;
      total_anon_sessions: number;
      engaged_sessions: number;
      engagement_rate_pct: number;
    }>;

    const recent7 = rows.slice(0, 7);
    const prior7 = rows.slice(7, 14);

    const sumSessions = (arr: typeof rows) => arr.reduce((s, r) => s + (r.total_anon_sessions ?? 0), 0);
    const sumEngaged = (arr: typeof rows) => arr.reduce((s, r) => s + (r.engaged_sessions ?? 0), 0);

    const total_7d = sumSessions(recent7);
    const engaged_7d = sumEngaged(recent7);
    const rate_7d = total_7d > 0 ? Math.round((engaged_7d / total_7d) * 1000) / 10 : 0;

    const prior_total = sumSessions(prior7);
    const prior_engaged = sumEngaged(prior7);
    const rate_prior7 = prior_total > 0 ? Math.round((prior_engaged / prior_total) * 1000) / 10 : null;

    const delta_7d = rate_prior7 !== null ? Math.round((rate_7d - rate_prior7) * 10) / 10 : null;

    return new Response(JSON.stringify({
      summary: { total_7d, engaged_7d, rate_7d, delta_7d, rate_prior7 },
      daily: rows,
    }), { status: 200, headers: CORS });
  } catch (err) {
    console.error('admin-engagement error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: CORS });
  }
});
