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

const RC_WEBHOOK_TOKEN = Deno.env.get("RC_WEBHOOK_TOKEN") ?? "";

const ENTITLING = new Set([
  "INITIAL_PURCHASE",
  "SUBSCRIBED",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "NON_RENEWING_PURCHASE",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (!RC_WEBHOOK_TOKEN || auth !== RC_WEBHOOK_TOKEN) {
    console.warn("revenuecat-webhook: rejected request", {
      hasToken: !!RC_WEBHOOK_TOKEN,
      authPresent: !!auth,
      ua: req.headers.get("user-agent"),
    });
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const event = (payload?.event ?? null) as Record<string, any> | null;
  if (!event?.type) {
    return new Response(JSON.stringify({ error: "Missing event" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventType = String(event.type);
  const appUserId = event.app_user_id ? String(event.app_user_id) : null;
  const productId = event.product_id ? String(event.product_id) : null;
  const environment = String(event.environment ?? "PRODUCTION").toUpperCase();
  const expirationAt = event.expiration_at_ms
    ? new Date(Number(event.expiration_at_ms)).toISOString()
    : null;
  const eventId = event.id ? String(event.id) : null;

  // 1. Always record the raw event first.
  const { data: logRow, error: logError } = await supabase
    .from("revenuecat_events")
    .upsert(
      {
        event_id: eventId,
        event_type: eventType,
        app_user_id: appUserId,
        product_id: productId,
        environment,
        expiration_at: expirationAt,
        raw: payload as never,
        processed: false,
        error_message: null,
      },
      { onConflict: "event_id" },
    )
    .select("id")
    .maybeSingle();

  if (logError) console.error("revenuecat-webhook: event log failed", logError);

  const finish = async (processed: boolean, errorMessage?: string, note?: string) => {
    if (logRow?.id) {
      await supabase
        .from("revenuecat_events")
        .update({ processed, error_message: errorMessage ?? null })
        .eq("id", logRow.id);
    }
    return new Response(JSON.stringify({ ok: true, note: note ?? null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  // 2. Sandbox events are stored but never grant web entitlement.
  if (environment !== "PRODUCTION") {
    return await finish(true, undefined, "sandbox event stored only");
  }

  if (!appUserId || !UUID_RE.test(appUserId)) {
    return await finish(false, `app_user_id is not a Supabase user id: ${appUserId}`);
  }

  const nowIso = new Date().toISOString();
  const base = {
    user_id: appUserId,
    provider: "revenuecat",
    revenuecat_user_id: appUserId,
    revenuecat_entitlement: event.entitlement_id ?? "premium",
    apple_product_id: productId,
    environment: environment.toLowerCase(),
    last_webhook_event_id: eventId,
    updated_at: nowIso,
  };

  try {
    if (ENTITLING.has(eventType)) {
      const { error } = await supabase.from("subscriptions").upsert(
        {
          ...base,
          status: "active",
          plan_type: "personal",
          tier: "personal",
          current_period_end: expirationAt,
          cancel_at_period_end: false,
        },
        { onConflict: "user_id,provider" },
      );
      if (error) throw error;
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ plan: "personal", role: "personal" })
        .eq("user_id", appUserId);
      if (pErr) throw pErr;
    } else if (eventType === "CANCELLATION") {
      // Cancellation = auto-renew off (or revoked); access lasts until expiration.
      const revoked = String(event.cancel_reason ?? "") === "CUSTOMER_SUPPORT";
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: revoked ? "expired" : "cancelled",
          cancel_at_period_end: true,
          updated_at: nowIso,
        })
        .eq("user_id", appUserId)
        .eq("provider", "revenuecat");
      if (error) throw error;
      if (revoked) {
        const { error: pErr } = await supabase
          .from("profiles")
          .update({ plan: "free", role: "free" })
          .eq("user_id", appUserId);
        if (pErr) throw pErr;
      }
    } else if (eventType === "EXPIRATION") {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "expired", updated_at: nowIso })
        .eq("user_id", appUserId)
        .eq("provider", "revenuecat");
      if (error) throw error;
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ plan: "free", role: "free" })
        .eq("user_id", appUserId);
      if (pErr) throw pErr;
    } else if (eventType === "BILLING_ISSUE") {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "past_due", updated_at: nowIso })
        .eq("user_id", appUserId)
        .eq("provider", "revenuecat");
      if (error) throw error;
    } else {
      return await finish(true, undefined, `unhandled event type ${eventType}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("revenuecat-webhook: entitlement update failed", eventType, appUserId, msg);
    // Still 200 so RevenueCat does not retry forever.
    return await finish(false, msg);
  }

  return await finish(true);
});
