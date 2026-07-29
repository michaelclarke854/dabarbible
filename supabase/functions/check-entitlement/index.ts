import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ENTITLEMENT_ENDPOINT =
  "https://xlwzvfsnnnrcgfmgkqkr.supabase.co/functions/v1/check-entitlement";

const PROTECTED_ROLES = ["super_admin", "admin", "beta", "suspended"];
const KNOWN_TIERS = ["personal", "family", "community"];
const ROLE_FOR_TIER: Record<string, string> = {
  personal: "personal",
  family: "family_owner",
  community: "community_admin",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const secret = Deno.env.get("BILLING_SHARED_SECRET");
  if (!secret) {
    return json(
      { error: "BILLING_SHARED_SECRET is not configured for this project." },
      500,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, 401);
  }

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await anonClient.auth.getUser();
  if (authError || !user || !user.email) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const upstream = await fetch(ENTITLEMENT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-billing-secret": secret,
      },
      body: JSON.stringify({ app_key: "dabarbible", user_ref: user.email }),
    });

    const text = await upstream.text();
    let payload: any;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text || "Entitlement service returned an empty response." };
    }

    if (!upstream.ok) {
      return json(payload, upstream.status);
    }

    // Sync into profiles so AuthContext's hasFullAccess (which reads role/plan
    // from the profiles table) reflects the real Freemius entitlement.
    // We only ever upgrade here — we never downgrade a user just because this
    // check returned inactive, since cancellation/expiry is handled by the
    // relevant webhook (paddle-webhook / revenuecat-webhook), not this sync path.
    let synced = false;
    if (payload?.active) {
      const admin = createClient(supabaseUrl, serviceKey);
      const { data: profile } = await admin
        .from("profiles")
        .select("role, plan")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        const rawPlan = typeof payload.plan === "string" ? payload.plan : "";
        const baseTier = rawPlan.split("_")[0];
        if (KNOWN_TIERS.includes(baseTier)) {
          const isProtected = PROTECTED_ROLES.includes(profile.role);
          const newRole = isProtected ? profile.role : ROLE_FOR_TIER[baseTier];
          const needsUpdate = profile.plan !== baseTier || profile.role !== newRole;
          if (needsUpdate) {
            await admin
              .from("profiles")
              .update({ plan: baseTier, role: newRole, trial_converted: true })
              .eq("user_id", user.id);
            synced = true;
          }
        } else {
          console.log("check-entitlement: unrecognized plan tier from billing service", { rawPlan });
        }
      }
    }

    return json({ ...payload, synced });
  } catch (e) {
    console.error("check-entitlement proxy error:", e);
    return json(
      { error: e instanceof Error ? e.message : "Entitlement service unreachable" },
      502,
    );
  }
});
