import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";

    if (userId !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Anonymize wisdom sessions (preserve for aggregate data)
    await supabaseAdmin
      .from("wisdom_sessions")
      .update({ user_id: null })
      .eq("user_id", userId);

    // 2. Hard delete personal content
    await Promise.all([
      supabaseAdmin.from("reflection_entries").delete().eq("user_id", userId),
      supabaseAdmin.from("saved_verses").delete().eq("user_id", userId),
      supabaseAdmin.from("verse_annotations").delete().eq("user_id", userId),
      supabaseAdmin.from("user_patterns").delete().eq("user_id", userId),
      supabaseAdmin.from("session_themes").delete().in(
        "session_id",
        // Delete themes for sessions that belonged to this user (now anonymized)
        []
      ),
      supabaseAdmin.from("usage_daily").delete().eq("user_id", userId),
      supabaseAdmin.from("rate_limits").delete().eq("user_id", userId),
      supabaseAdmin.from("beta_feedback").delete().eq("user_id", userId),
    ]);

    // 3. Cancel Stripe subscription if active
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .single();

    if (sub?.stripe_subscription_id) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        try {
          const { default: Stripe } = await import("https://esm.sh/stripe@17.7.0?target=deno");
          const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
          await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        } catch (e) {
          console.error("Failed to cancel Stripe subscription:", e);
        }
      }
    }

    // 4. Delete subscription and profile records
    await supabaseAdmin.from("subscriptions").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("user_id", userId);

    // 5. Delete auth user
    await supabaseAdmin.auth.admin.deleteUser(userId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-account error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
