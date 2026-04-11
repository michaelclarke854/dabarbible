import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Price IDs from Stripe
const PRICE_MAP: Record<string, Record<string, string>> = {
  personal: {
    monthly: "price_1TL42uEGixGZ7aNIrHGLw1MZ",
    annual: "price_1TL42wEGixGZ7aNILBZ1H2tk",
  },
  personal_student: {
    monthly: "price_1TL42yEGixGZ7aNIucix1x42",
  },
  family: {
    monthly: "price_1TL42zEGixGZ7aNI48OQpeRo",
    annual: "price_1TL430EGixGZ7aNIYTOBUomg",
  },
  community: {
    monthly: "price_1TL431EGixGZ7aNIiFgz6a5n",
  },
  gift: {
    annual: "price_1TL434EGixGZ7aNIvRSJ4qEX",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const { planKey, cycle, userId, email, isStudent, returnUrl } = await req.json();

    if (!planKey || !userId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine price
    let effectiveKey = planKey;
    if (planKey === "personal" && isStudent) effectiveKey = "personal_student";

    const cyclePrices = PRICE_MAP[effectiveKey];
    if (!cyclePrices) {
      return new Response(
        JSON.stringify({ error: "Invalid plan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const priceId = cyclePrices[cycle || "monthly"];
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Invalid billing cycle for this plan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnUrl || "https://id-preview--8e7d044d-f62f-415b-8598-56950d45a22e.lovable.app"}/?checkout=success`,
      cancel_url: `${returnUrl || "https://id-preview--8e7d044d-f62f-415b-8598-56950d45a22e.lovable.app"}/pricing`,
      metadata: {
        user_id: userId,
        plan_type: planKey,
        billing_cycle: cycle || "monthly",
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("create-checkout error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
