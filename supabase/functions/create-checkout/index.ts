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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // Input validation
    const planKey = typeof body.planKey === "string" ? body.planKey.trim() : "";
    const cycle = typeof body.cycle === "string" ? body.cycle.trim() : "monthly";
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const isStudent = body.isStudent === true;
    const returnUrl = typeof body.returnUrl === "string" ? body.returnUrl.trim() : "";

    if (!planKey || !userId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate cycle
    if (!["monthly", "annual"].includes(cycle)) {
      return new Response(
        JSON.stringify({ error: "Invalid billing cycle" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Derive origin from request headers
    const origin = req.headers.get("origin")
      ?? req.headers.get("referer")?.split("/").slice(0, 3).join("/")
      ?? "https://dabarbible.lovable.app";

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

    // Look up existing Stripe customer from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    const sessionParams: any = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        user_id: userId,
        plan_type: planKey,
        billing_cycle: cycle || "monthly",
      },
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Store customer ID back to profile if newly created
    if (!customerId && session.customer) {
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: session.customer as string })
        .eq("user_id", userId);
    }

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
