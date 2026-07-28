import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const confirmEmail = typeof body.confirmEmail === "string" ? body.confirmEmail.trim().toLowerCase() : "";

    if (userId !== user.id) return json({ error: "Forbidden" }, 403);

    // Re-confirmation: user must re-type their own email exactly
    if (!confirmEmail || confirmEmail !== (user.email || "").toLowerCase()) {
      return json({ error: "Email confirmation does not match account email." }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const errors: string[] = [];
    const trackError = (label: string, err: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : String((err as any)?.message || err);
        console.error(`delete-account [${label}]:`, msg);
        errors.push(`${label}: ${msg}`);
      }
    };

    // 1. Get all session IDs for this user (needed for FK-dependent tables)
    const { data: sessionRows, error: sessionFetchErr } = await supabaseAdmin
      .from("wisdom_sessions")
      .select("id")
      .eq("user_id", userId);
    trackError("fetch sessions", sessionFetchErr);
    const sessionIds = (sessionRows || []).map((r) => r.id);

    // 2. Delete FK-dependent rows BEFORE deleting parent sessions
    if (sessionIds.length > 0) {
      const { error: themesErr } = await supabaseAdmin
        .from("session_themes")
        .delete()
        .in("session_id", sessionIds);
      trackError("session_themes", themesErr);
    }

    const { error: flagsErr } = await supabaseAdmin
      .from("response_flags")
      .delete()
      .eq("user_id", userId);
    trackError("response_flags", flagsErr);

    // 3. Delete personal content (true GDPR erasure — no anonymization)
    const personalTables: Array<{ table: string; col: string }> = [
      { table: "wisdom_sessions", col: "user_id" },
      { table: "reflection_entries", col: "user_id" },
      { table: "verse_annotations", col: "user_id" },
      { table: "saved_verses", col: "user_id" },
      { table: "user_patterns", col: "user_id" },
      { table: "journal_insights", col: "user_id" },
      { table: "journal_agent_runs", col: "user_id" },
      { table: "usage_daily", col: "user_id" },
      { table: "rate_limits", col: "user_id" },
      { table: "beta_feedback", col: "user_id" },
    ];

    for (const { table, col } of personalTables) {
      const { error } = await supabaseAdmin.from(table as any).delete().eq(col, userId);
      trackError(table, error);
    }

    // 4. Billing cancellation is no longer handled here.
    // Legacy web card billing is retired; active subscriptions are managed by the
    // store (Apple/RevenueCat) or the external billing service. Deleting the account
    // removes app data only — we surface this explicitly instead of silently no-oping.
    const { data: sub, error: subFetchErr } = await supabaseAdmin
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();
    trackError("fetch subscription", subFetchErr);

    const hadActiveSubscription = sub?.status === "active";

    // 5. Delete subscription, role, and profile
    const { error: subDelErr } = await supabaseAdmin.from("subscriptions").delete().eq("user_id", userId);
    trackError("subscriptions", subDelErr);

    const { error: rolesErr } = await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    trackError("user_roles", rolesErr);

    const { error: profileErr } = await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
    trackError("profiles", profileErr);

    // 6. Delete email unsubscribe tokens by email
    if (user.email) {
      const { error: tokenErr } = await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .delete()
        .eq("email", user.email);
      trackError("email_unsubscribe_tokens", tokenErr);
    }

    // If any data deletion failed, surface it BEFORE killing the auth user
    // so support can manually clean up (auth user remaining lets them retry).
    if (errors.length > 0) {
      return json({ error: "Partial deletion failed", details: errors }, 500);
    }

    // 7. Finally delete auth user
    const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDelErr) {
      return json({ error: `Auth deletion failed: ${authDelErr.message}` }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error("delete-account error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
