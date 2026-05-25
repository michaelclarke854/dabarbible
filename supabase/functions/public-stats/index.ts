import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const JARVIS_API_KEY = Deno.env.get("JARVIS_API_KEY") ?? "";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-api-key",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { "Content-Type": "application/json", ...CORS },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!JARVIS_API_KEY || req.headers.get("x-api-key") !== JARVIS_API_KEY)
    return json({ error: "Unauthorized" }, 401);
  try {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
    const [u, n, nw, subs, trial, ws, wt, ref, q] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("plan", "trial"),
      supabase.from("wisdom_sessions").select("*", { count: "exact", head: true }),
      supabase.from("wisdom_sessions").select("*", { count: "exact", head: true }).gte("created_at", today),
      supabase.from("reflection_entries").select("*", { count: "exact", head: true }),
      supabase.from("funnel_events").select("*", { count: "exact", head: true }).eq("event_name", "guest_question_asked").gte("created_at", today),
    ]);
    const { count: ww } = await supabase.from("wisdom_sessions").select("*", { count: "exact", head: true }).gte("created_at", weekAgo);
    const activeSubs = subs.count ?? 0;
    return json({
      product: "dabar",
      pulled_at: new Date().toISOString(),
      health: { status: "healthy", db_reachable: true },
      users: {
        total: u.count ?? 0,
        new_today: n.count ?? 0,
        new_this_week: nw.count ?? 0,
        on_trial: trial.count ?? 0,
        subscribed: activeSubs,
      },
      revenue: {
        mrr_cents: activeSubs * 999,
        mrr_dollars: parseFloat((activeSubs * 9.99).toFixed(2)),
        active_subs: activeSubs,
      },
      engagement: {
        total_wisdom_sessions: ws.count ?? 0,
        sessions_today: wt.count ?? 0,
        sessions_this_week: ww ?? 0,
        total_reflections: ref.count ?? 0,
        questions_asked_today: q.count ?? 0,
      },
    });
  } catch (err) {
    return json({ error: "Internal server error", detail: String(err) }, 500);
  }
});