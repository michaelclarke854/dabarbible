import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const REVENUECAT_AUTH = Deno.env.get("REVENUECAT_WEBHOOK_AUTH") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Shared-secret auth — RevenueCat sends the configured Authorization header verbatim.
  if (!REVENUECAT_AUTH || req.headers.get("authorization") !== REVENUECAT_AUTH) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const event = payload?.event;
  if (!event?.id || !event?.type || !event?.app_user_id) {
    return new Response("Invalid payload", { status: 400, headers: corsHeaders });
  }

  // Idempotency check
  const { data: existing } = await supabase
    .from("processed_webhook_events")
    .select("event_id")
    .eq("event_id", event.id)
    .maybeSingle();

  if (existing) {
    return new Response("Already processed", { status: 200, headers: corsHeaders });
  }

  const userId = event.app_user_id as string;
  const nowIso = new Date().toISOString();
  const base = {
    user_id: userId,
    provider: "revenuecat" as const,
    revenuecat_user_id: userId,
    revenuecat_entitlement: event.entitlement_id ?? "premium",
    apple_product_id: event.product_id ?? null,
    environment: ((event.environment ?? "PRODUCTION") as string).toLowerCase(),
    last_webhook_event_id: event.id,
    updated_at: nowIso,
  };

  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION": {
      await supabase.from("subscriptions").upsert(
        {
          ...base,
          status: "active",
          plan_type: "personal",
          tier: "personal",
          current_period_end: event.expiration_at_ms
            ? new Date(event.expiration_at_ms).toISOString()
            : null,
          cancel_at_period_end: false,
        },
        { onConflict: "user_id,provider" },
      );
      // Promote profile to a premium role so hasFullAccess returns true.
      await supabase
        .from("profiles")
        .update({ plan: "personal", role: "personal" })
        .eq("user_id", userId);
      break;
    }
    case "CANCELLATION":
      await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancel_at_period_end: true,
          updated_at: nowIso,
        })
        .eq("user_id", userId)
        .eq("provider", "revenuecat");
      break;
    case "EXPIRATION":
      await supabase
        .from("subscriptions")
        .update({ status: "expired", updated_at: nowIso })
        .eq("user_id", userId)
        .eq("provider", "revenuecat");
      // Demote profile back to free so paywall re-engages.
      await supabase
        .from("profiles")
        .update({ plan: "free", role: "free" })
        .eq("user_id", userId);
      break;
    case "BILLING_ISSUE":
      await supabase
        .from("subscriptions")
        .update({ status: "past_due", updated_at: nowIso })
        .eq("user_id", userId)
        .eq("provider", "revenuecat");
      break;
    default:
      console.log("Unhandled RevenueCat event type:", event.type);
  }

  await supabase.from("processed_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
    provider: "revenuecat",
  });

  return new Response("OK", { status: 200, headers: corsHeaders });
});