import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REVIEWER_EMAIL = "reviewer@dabarbible.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expected = Deno.env.get("REVIEWER_BYPASS_CODE");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!expected || !supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!code || code !== expected) {
      // Generic error to avoid leaking validity
      return new Response(
        JSON.stringify({ error: "Invalid code" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Ensure reviewer user exists with the bypass code as the password.
    // Look up by listing — getUserByEmail isn't available; iterate first page.
    let reviewerId: string | null = null;
    {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (error) throw error;
      const found = data.users.find((u) => u.email?.toLowerCase() === REVIEWER_EMAIL);
      if (found) reviewerId = found.id;
    }

    if (!reviewerId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: REVIEWER_EMAIL,
        password: code,
        email_confirm: true,
        user_metadata: { age_group: "adult", reviewer: true },
      });
      if (createErr) throw createErr;
      reviewerId = created.user!.id;
    } else {
      // Ensure email is confirmed. Avoid re-setting the password here because
      // Supabase rejects known-weak passwords via updateUserById even though
      // they were accepted at create time.
      const { error: updErr } = await admin.auth.admin.updateUserById(reviewerId, {
        email_confirm: true,
      });
      if (updErr) throw updErr;
    }

    // Apple App Review (iOS build 81): no IAP sold in-app yet.
    // Reviewer should land in an ACTIVE 30-day trial so the full app
    // experience is reachable without a paywall.
    try {
      const trialStartedAt = new Date().toISOString();
      const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await admin
        .from("profiles")
        .update({
          role: "trial",
          plan: "trial",
          trial_started_at: trialStartedAt,
          trial_ends_at: trialEndsAt,
          trial_converted: false,
        })
        .eq("user_id", reviewerId);
      await admin.from("subscriptions").upsert(
        {
          user_id: reviewerId,
          provider: "reviewer",
          status: "active",
          plan_type: "trial",
          tier: "trial",
          current_period_end: trialEndsAt,
          environment: "production",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" },
      );
    } catch (entitleErr) {
      console.warn("reviewer-signin: active-trial setup failed (non-fatal):", entitleErr);
    }

    // Sign in with the password to mint a session for the client
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
      email: REVIEWER_EMAIL,
      password: code,
    });
    if (signInErr || !signInData.session) {
      throw signInErr ?? new Error("Failed to mint session");
    }

    return new Response(
      JSON.stringify({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("reviewer-signin error:", err);
    return new Response(
      JSON.stringify({ error: "Sign-in failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});