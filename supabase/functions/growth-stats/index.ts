import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const head = { count: "exact" as const, head: true };

    const [profilesTotal, newProfiles, subsTotal, subsActive, newActiveSubs] = await Promise.all([
      supabase.from("profiles").select("*", head),
      supabase.from("profiles").select("*", head).gte("created_at", since),
      supabase.from("subscriptions").select("*", head),
      supabase.from("subscriptions").select("*", head).eq("status", "active"),
      supabase.from("subscriptions").select("*", head).eq("status", "active").gte("created_at", since),
    ]);

    for (const r of [profilesTotal, newProfiles, subsTotal, subsActive, newActiveSubs]) {
      if (r.error) throw new Error(r.error.message);
    }

    return json({
      product: "dabar",
      profiles_total: profilesTotal.count ?? 0,
      new_profiles_7d: newProfiles.count ?? 0,
      subscriptions_total: subsTotal.count ?? 0,
      subscriptions_active: subsActive.count ?? 0,
      new_active_subscriptions_7d: newActiveSubs.count ?? 0,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("growth-stats error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});