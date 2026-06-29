import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const PROTECTED_ROLES = ["super_admin", "admin", "beta", "suspended"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, paddle-signature",
};

const log = (step: string, details?: unknown) => {
  console.log(`[paddle-webhook] ${step}${details ? " " + JSON.stringify(details) : ""}`);
};

// Constant-time hex compare
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function verifyPaddleSignature(
  rawBody: string,
  header: string | null,
  secret: string,
): Promise<boolean> {
  if (!header) return false;
  // Format: ts=<unix>;h1=<hex>[;h1=<hex>...]
  let ts: string | null = null;
  const sigs: string[] = [];
  for (const part of header.split(";")) {
    const [k, v] = part.split("=");
    if (!k || !v) continue;
    if (k.trim() === "ts") ts = v.trim();
    else if (k.trim() === "h1") sigs.push(v.trim());
  }
  if (!ts || sigs.length === 0) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${ts}:${rawBody}`));
  const computed = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  for (const provided of sigs) {
    if (timingSafeEqualHex(provided.toLowerCase(), computed)) return true;
  }
  return false;
}

type PaddleEvent = {
  event_id?: string;
  event_type?: string;
  data?: Record<string, unknown> & {
    id?: string;
    customer_id?: string;
    custom_data?: Record<string, unknown> | null;
    status?: string;
    items?: Array<{ price?: { id?: string } | null; price_id?: string }>;
    billing_cycle?: { interval?: string } | null;
    subscription_id?: string;
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("PADDLE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      log("FATAL: PADDLE_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const sigHeader = req.headers.get("paddle-signature");
    const ok = await verifyPaddleSignature(rawBody, sigHeader, webhookSecret);
    if (!ok) {
      log("Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: PaddleEvent;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventId = event.event_id;
    const eventType = event.event_type;
    if (!eventId || !eventType) {
      return new Response(JSON.stringify({ error: "Missing event_id/event_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    log("Event received", { type: eventType, id: eventId });

    // Idempotency
    const { data: existing } = await supabase
      .from("processed_webhook_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();
    if (existing) {
      log("Duplicate event, skipping");
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build price→plan map from app_config (strip _monthly/_annual/_student)
    const PLAN_MAP: Record<string, string> = {};
    const CYCLE_MAP: Record<string, "monthly" | "annual"> = {};
    const { data: configData } = await supabase
      .from("app_config")
      .select("key, value")
      .like("key", "paddle_price_%");
    for (const c of configData ?? []) {
      if (!c.value) continue;
      const stripped = c.key.replace("paddle_price_", "");
      const plan = stripped.replace(/_(monthly|annual|student)$/, "");
      PLAN_MAP[c.value] = plan;
      if (stripped.endsWith("_annual")) CYCLE_MAP[c.value] = "annual";
      else CYCLE_MAP[c.value] = "monthly";
    }

    const data = event.data ?? {};
    const customData = (data.custom_data ?? {}) as Record<string, unknown>;
    const customerId = (data.customer_id ?? null) as string | null;
    const paddleSubId = (data.id ?? null) as string | null;
    const firstItem = Array.isArray(data.items) ? data.items[0] : undefined;
    const priceId = (firstItem?.price?.id ?? firstItem?.price_id ?? null) as string | null;

    const resolveUserId = async (): Promise<string | null> => {
      // 1) subscriptions.paddle_subscription_id
      if (paddleSubId) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("paddle_subscription_id", paddleSubId)
          .maybeSingle();
        if (sub?.user_id) return sub.user_id;
      }
      // 2) custom_data.user_id
      const metaUserId = (customData.user_id ?? null) as string | null;
      if (metaUserId) return metaUserId;
      // 3) profiles.paddle_customer_id
      if (customerId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("paddle_customer_id", customerId)
          .maybeSingle();
        if (prof?.user_id) return prof.user_id;
      }
      return null;
    };

    const upsertSubscription = async (
      userId: string,
      plan: string,
      cycle: "monthly" | "annual" | null,
      status: string,
    ) => {
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      const subData: Record<string, unknown> = {
        plan_type: plan,
        status,
        billing_cycle: cycle,
        paddle_subscription_id: paddleSubId,
      };
      if (existingSub) {
        await supabase.from("subscriptions").update(subData).eq("id", existingSub.id);
      } else {
        await supabase.from("subscriptions").insert({ user_id: userId, ...subData });
      }
    };

    const handleActivate = async () => {
      const userId = await resolveUserId();
      if (!userId) {
        log("Could not resolve user", { paddleSubId, customerId });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, plan, paddle_customer_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!profile) {
        log("Profile not found", { userId });
        return;
      }

      if (!profile.paddle_customer_id && customerId) {
        await supabase
          .from("profiles")
          .update({ paddle_customer_id: customerId })
          .eq("user_id", userId);
      }

      const newPlan = (priceId && PLAN_MAP[priceId]) || "personal";
      const cycle = priceId ? CYCLE_MAP[priceId] ?? null : null;
      const isProtected = PROTECTED_ROLES.includes(profile.role);
      const newRole = isProtected
        ? profile.role
        : newPlan === "personal"
          ? "personal"
          : profile.role;

      await supabase
        .from("profiles")
        .update({
          plan: newPlan,
          role: newRole,
          trial_converted: true,
        })
        .eq("user_id", userId);

      await upsertSubscription(userId, newPlan, cycle, "active");
      log("Subscription activated", { userId, plan: newPlan });
    };

    const handleCancel = async () => {
      const userId = await resolveUserId();
      if (!userId) {
        log("Could not resolve user on cancel", { paddleSubId, customerId });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      const isProtected = profile && PROTECTED_ROLES.includes(profile.role);
      await supabase
        .from("profiles")
        .update(isProtected ? { plan: "free" } : { plan: "free", role: "free" })
        .eq("user_id", userId);
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled", plan_type: "free", billing_cycle: null })
        .eq("user_id", userId);
      log("Subscription cancelled", { userId });
    };

    const handlePaymentFailed = async () => {
      const userId = await resolveUserId();
      if (!userId) return;
      const grace = new Date();
      grace.setDate(grace.getDate() + 7);
      await supabase
        .from("profiles")
        .update({ grace_period_until: grace.toISOString() })
        .eq("user_id", userId);
      if (paddleSubId) {
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("paddle_subscription_id", paddleSubId);
      } else {
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("user_id", userId);
      }
      log("Payment failed; grace period set", { userId });
    };

    switch (eventType) {
      case "subscription.activated":
      case "subscription.created":
      case "subscription.updated":
        await handleActivate();
        break;
      case "subscription.canceled":
      case "subscription.cancelled":
        await handleCancel();
        break;
      case "transaction.payment_failed":
        await handlePaymentFailed();
        break;
      default:
        log("Unhandled event type", { eventType });
    }

    await supabase
      .from("processed_webhook_events")
      .insert({ event_id: eventId, event_type: eventType });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paddle-webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});