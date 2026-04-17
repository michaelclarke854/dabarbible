import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const PROTECTED_ROLES = ["super_admin", "admin", "beta", "suspended"];

const log = (step: string, details?: any) => {
  console.log(`[stripe-webhook] ${step}${details ? " " + JSON.stringify(details) : ""}`);
};

serve(async (req) => {
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("FATAL: STRIPE_WEBHOOK_SECRET is not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig!, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    log("Event received", { type: event.type, id: event.id });

    // Idempotency check
    const eventId = event.id;
    const { data: existing } = await supabase
      .from("processed_webhook_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existing) {
      log("Duplicate event, skipping");
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Load plan map from app_config
    const PLAN_MAP: Record<string, string> = {};
    const { data: configData } = await supabase
      .from("app_config")
      .select("key, value")
      .like("key", "stripe_price_%");

    if (configData) {
      for (const c of configData) {
        const plan = c.key.replace("stripe_price_", "").replace(/_(monthly|annual|student)$/, "");
        if (c.value) PLAN_MAP[c.value] = plan;
      }
    }

    // Resolve user_id from a subscription via three fallback strategies
    const resolveUserId = async (subscription: Stripe.Subscription): Promise<string | null> => {
      // 1) by stripe_subscription_id in subscriptions table
      const { data: subRecord } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();
      if (subRecord?.user_id) return subRecord.user_id;

      // 2) by subscription metadata (set in create-checkout)
      const metaUserId = subscription.metadata?.user_id;
      if (metaUserId) return metaUserId;

      // 3) by stripe_customer_id on profile
      const customerId = subscription.customer as string;
      const { data: profileByCustomer } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (profileByCustomer?.user_id) return profileByCustomer.user_id;

      // 4) by customer email → auth.users
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if ("email" in customer && customer.email) {
          const { data: userByEmail } = await supabase.auth.admin.listUsers();
          const match = userByEmail.users.find((u) => u.email === customer.email);
          if (match) return match.id;
        }
      } catch (e) {
        log("Customer lookup failed", { err: String(e) });
      }

      return null;
    };

    const handleSubscriptionChange = async (subscription: Stripe.Subscription, deleted = false) => {
      const userId = await resolveUserId(subscription);
      if (!userId) {
        log("Could not resolve user for subscription", { subscriptionId: subscription.id });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, plan, stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!profile) {
        log("Profile not found", { userId });
        return;
      }

      // Backfill stripe_customer_id if missing
      if (!profile.stripe_customer_id && subscription.customer) {
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: subscription.customer as string })
          .eq("user_id", userId);
      }

      const priceId = subscription.items.data[0]?.price?.id;
      const newPlan = PLAN_MAP[priceId] || "personal";
      const isProtected = PROTECTED_ROLES.includes(profile.role);

      if (deleted) {
        await supabase.from("profiles").update(
          isProtected ? { plan: "free" } : { plan: "free", role: "free" }
        ).eq("user_id", userId);

        // Update subscription row by user_id (works even if stripe_subscription_id wasn't set yet)
        await supabase.from("subscriptions")
          .update({ status: "cancelled", plan_type: "free", billing_cycle: null })
          .eq("user_id", userId);
        log("Subscription deleted", { userId });
      } else {
        const newRole = isProtected ? profile.role : (newPlan === "personal" ? "personal" : profile.role);
        await supabase.from("profiles").update({
          plan: newPlan,
          role: newRole,
          trial_converted: true,
        }).eq("user_id", userId);

        // Upsert subscription row
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        const subUpdate = {
          plan_type: newPlan,
          status: "active",
          stripe_subscription_id: subscription.id,
        };

        if (existingSub) {
          await supabase.from("subscriptions").update(subUpdate).eq("id", existingSub.id);
        } else {
          await supabase.from("subscriptions").insert({ user_id: userId, ...subUpdate });
        }
        log("Subscription activated", { userId, plan: newPlan });
      }
    };

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription, true);
        break;

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const gracePeriod = new Date();
          gracePeriod.setDate(gracePeriod.getDate() + 7);

          const { data: subRecord } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", invoice.subscription as string)
            .maybeSingle();

          if (subRecord?.user_id) {
            await supabase.from("profiles")
              .update({ grace_period_until: gracePeriod.toISOString() })
              .eq("user_id", subRecord.user_id);
          }

          await supabase.from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const planType = session.metadata?.plan_type;
        const billingCycle = session.metadata?.billing_cycle;

        const presentmentCurrency = (session as any).presentment_details?.presentment_currency ?? null;
        const presentmentAmount = (session as any).presentment_details?.presentment_amount ?? null;

        if (userId && planType) {
          if (session.customer) {
            await supabase.from("profiles")
              .update({ stripe_customer_id: session.customer as string })
              .eq("user_id", userId);
          }

          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          const subData = {
            plan_type: planType,
            billing_cycle: billingCycle,
            status: "active",
            stripe_subscription_id: session.subscription as string,
            presentment_currency: presentmentCurrency,
            presentment_amount: presentmentAmount,
          };

          if (existingSub) {
            await supabase.from("subscriptions").update(subData).eq("id", existingSub.id);
          } else {
            await supabase.from("subscriptions").insert({ user_id: userId, ...subData });
          }

          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("user_id", userId)
            .maybeSingle();

          if (profile && !PROTECTED_ROLES.includes(profile.role)) {
            await supabase.from("profiles")
              .update({
                plan: planType,
                role: planType === "personal" ? "personal" : profile.role,
                trial_converted: true,
              })
              .eq("user_id", userId);
          } else if (profile) {
            await supabase.from("profiles")
              .update({ plan: planType, trial_converted: true })
              .eq("user_id", userId);
          }
          log("Checkout completed", { userId, planType });
        } else {
          log("Checkout missing metadata", { sessionId: session.id });
        }
        break;
      }
    }

    await supabase
      .from("processed_webhook_events")
      .insert({ event_id: eventId, event_type: event.type });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stripe-webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500 }
    );
  }
});
