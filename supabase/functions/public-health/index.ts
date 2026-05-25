import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let dbHealthy = false;
  let dbLatencyMs = 0;
  try {
    const t = Date.now();
    await supabase.from("profiles").select("id").limit(1);
    dbLatencyMs = Date.now() - t;
    dbHealthy = true;
  } catch {}
  return new Response(
    JSON.stringify({
      product: "dabar",
      status: dbHealthy ? "healthy" : "degraded",
      db_healthy: dbHealthy,
      db_latency_ms: dbLatencyMs,
      checked_at: new Date().toISOString(),
    }),
    {
      status: dbHealthy ? 200 : 503,
      headers: { "Content-Type": "application/json", ...CORS },
    }
  );
});