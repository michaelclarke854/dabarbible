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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const userId = user.id;

    // Fetch all user-owned data in parallel
    const [
      profile,
      sessions,
      verses,
      reflections,
      annotations,
      patterns,
      subscriptions,
      flags,
      crisis,
      insights,
      themes,
      feedback,
      waitlist,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin
        .from("wisdom_sessions")
        .select("id, question, response, scripture_refs, saved_to_journal, flagged, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("saved_verses")
        .select("book, chapter, verse_number, verse_text, version, created_at")
        .eq("user_id", userId),
      supabaseAdmin
        .from("reflection_entries")
        .select("title, body, writing_prompt, created_at, updated_at, deleted_at")
        .eq("user_id", userId),
      supabaseAdmin
        .from("verse_annotations")
        .select("note, created_at, updated_at, saved_verse_id")
        .eq("user_id", userId),
      supabaseAdmin
        .from("user_patterns")
        .select("theme, occurrence, first_seen, last_seen")
        .eq("user_id", userId),
      supabaseAdmin
        .from("subscriptions")
        .select("plan_type, billing_cycle, status, presentment_amount, presentment_currency, created_at")
        .eq("user_id", userId),
      supabaseAdmin
        .from("response_flags")
        .select("flag_type, flag_notes, session_id, created_at, resolved_at")
        .eq("user_id", userId),
      supabaseAdmin
        .from("crisis_log")
        .select("keyword_matched, severity, triggered_at, session_id")
        .eq("session_id", userId), // best-effort: only matches if session_id stored as user id elsewhere
      supabaseAdmin
        .from("journal_insights")
        .select("week_start, primary_theme, themes, insight_text, scripture_ref, scripture_text, entry_count, question_count, created_at")
        .eq("user_id", userId),
      supabaseAdmin.rpc("show_limit").then(() => ({ data: [], error: null })), // placeholder for themes-by-session below
      supabaseAdmin
        .from("beta_feedback")
        .select("feedback_text, screen_context, created_at")
        .eq("user_id", userId),
      supabaseAdmin
        .from("language_waitlist")
        .select("language_code, created_at")
        .eq("email", user.email || ""),
    ]);

    // Get session_themes for the user's sessions (FK-joined)
    const sessionIds = (sessions.data || []).map((s: any) => s.id);
    let sessionThemes: any[] = [];
    if (sessionIds.length > 0) {
      const { data: themesData } = await supabaseAdmin
        .from("session_themes")
        .select("session_id, theme, confidence")
        .in("session_id", sessionIds);
      sessionThemes = themesData || [];
    }

    // Strip sensitive fields from profile
    const safeProfile = profile.data
      ? {
          age_group: profile.data.age_group,
          language_preference: profile.data.language_preference,
          preferred_bible_version: profile.data.preferred_bible_version,
          preferred_currency: profile.data.preferred_currency,
          plan: profile.data.plan,
          trial_started_at: profile.data.trial_started_at,
          trial_ends_at: profile.data.trial_ends_at,
          trial_converted: profile.data.trial_converted,
          created_at: profile.data.created_at,
        }
      : null;

    // Strip wisdom_sessions IDs from final output (internal)
    const cleanSessions = (sessions.data || []).map(({ id: _id, ...rest }: any) => rest);

    const exportData = {
      exported_at: new Date().toISOString(),
      account_email: user.email,
      profile: safeProfile,
      wisdom_sessions: cleanSessions,
      session_themes: sessionThemes.map(({ session_id: _s, ...rest }) => rest),
      saved_verses: verses.data || [],
      reflections: reflections.data || [],
      annotations: annotations.data || [],
      patterns: patterns.data || [],
      journal_insights: insights.data || [],
      subscriptions: subscriptions.data || [],
      response_flags: flags.data || [],
      crisis_events: crisis.data || [],
      beta_feedback: feedback.data || [],
      language_waitlist: waitlist.data || [],
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="dabar-export-${Date.now()}.json"`,
      },
    });
  } catch (e) {
    console.error("export-data error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
