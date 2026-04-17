import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // SECURITY: gate behind cron_shared_secret stored in Vault.
    // Reading from Vault means there's no env-var sync to maintain.
    const provided = req.headers.get("x-cron-secret");
    if (!provided) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { data: vaultSecret, error: vaultErr } = await supabase
      .rpc("get_cron_shared_secret");
    if (vaultErr || !vaultSecret) {
      return new Response(
        JSON.stringify({ error: "cron_shared_secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (provided !== vaultSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find all profiles where plan = 'trial' and trial has expired
    const { data: expired, error: fetchError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("plan", "trial")
      .lt("trial_ends_at", new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ downgraded: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = expired.map((p) => p.user_id);

    // Downgrade profiles to free
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ plan: "free", role: "free" })
      .in("user_id", userIds);

    if (updateError) throw updateError;

    // Set expires_at on wisdom_sessions for 90-day retention
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const { error: sessionError } = await supabase
      .from("wisdom_sessions")
      .update({ expires_at: expiresAt })
      .in("user_id", userIds)
      .is("expires_at", null);

    if (sessionError) throw sessionError;

    // Update subscriptions
    const { error: subError } = await supabase
      .from("subscriptions")
      .update({ plan_type: "free" })
      .in("user_id", userIds)
      .eq("plan_type", "trial");

    if (subError) throw subError;

    return new Response(
      JSON.stringify({ downgraded: userIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
