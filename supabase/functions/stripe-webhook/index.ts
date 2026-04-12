import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const PROTECTED_ROLES = ["super_admin", "admin", "beta", "suspended"];

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

    // Idempotency check
    const eventId = event.id;
    const { data: existing } = await supabase
      .from("processed_webhook_events")
      .select("event_id")
      .eq("event_id", eventId)
      .single();

    if (existing) {
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
        const plan = c.key.replace("stripe_price_", "");
        if (c.value) PLAN_MAP[c.value] = plan;
      }
    }

    const handleSubscriptionChange = async (subscription: Stripe.Subscription, deleted = false) => {
      const customerId = subscription.customer as string;

      // Look up user by stripe customer ID in subscriptions table
      const { data: subRecord } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .single();

      let userId = subRecord?.user_id;

      if (!userId) {
        // Try to find by customer email
        const customer = await stripe.customers.retrieve(customerId);
        if ("email" in customer && customer.email) {
          console.log("Could not find user for subscription:", subscription.id);
          return;
        }
        return;
      }

      // Get current profile role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, plan")
        .eq("user_id", userId)
        .single();

      if (!profile) return;

      if (PROTECTED_ROLES.includes(profile.role)) {
        if (deleted) {
          await supabase.from("profiles").update({ plan: "free" }).eq("user_id", userId);
          await supabase.from("subscriptions")
            .update({ status: "cancelled", plan_type: "free" })
            .eq("stripe_subscription_id", subscription.id);
        } else {
          const priceId = subscription.items.data[0]?.price?.id;
          const newPlan = PLAN_MAP[priceId] || "personal";
          await supabase.from("profiles").update({ plan: newPlan, trial_converted: true }).eq("user_id", userId);
          await supabase.from("subscriptions")
            .update({ plan_type: newPlan, status: "active" })
            .eq("stripe_subscription_id", subscription.id);
        }
        return;
      }

      if (deleted) {
        await supabase.from("profiles").update({ plan: "free", role: "free" }).eq("user_id", userId);
        await supabase.from("subscriptions")
          .update({ status: "cancelled", plan_type: "free", billing_cycle: null })
          .eq("stripe_subscription_id", subscription.id);
      } else {
        const priceId = subscription.items.data[0]?.price?.id;
        const newPlan = PLAN_MAP[priceId] || "personal";
        let newRole = "personal";
        if (newPlan === "personal") newRole = "personal";

        await supabase.from("profiles").update({
          plan: newPlan,
          role: newRole,
          trial_converted: true,
        }).eq("user_id", userId);
        await supabase.from("subscriptions")
          .update({
            plan_type: newPlan,
            status: "active",
            stripe_subscription_id: subscription.id,
          })
          .eq("user_id", userId);
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
            .single();

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

        if (userId && planType) {
          // Store stripe customer ID on profile
          if (session.customer) {
            await supabase.from("profiles")
              .update({ stripe_customer_id: session.customer as string })
              .eq("user_id", userId);
          }

          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("user_id", userId)
            .single();

          if (existingSub) {
            await supabase.from("subscriptions")
              .update({
                plan_type: planType,
                billing_cycle: billingCycle,
                status: "active",
                stripe_subscription_id: session.subscription as string,
              })
              .eq("id", existingSub.id);
          } else {
            await supabase.from("subscriptions").insert({
              user_id: userId,
              plan_type: planType,
              billing_cycle: billingCycle,
              status: "active",
              stripe_subscription_id: session.subscription as string,
            });
          }

          // Update profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("user_id", userId)
            .single();

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
        }
        break;
      }
    }

    // Record as processed
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
