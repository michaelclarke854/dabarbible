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

    const [profile, sessions, verses, reflections, annotations, patterns] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("user_id", userId).single(),
      supabaseAdmin.from("wisdom_sessions").select("question, response, scripture_refs, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      supabaseAdmin.from("saved_verses").select("book, chapter, verse_number, verse_text, version, created_at").eq("user_id", userId),
      supabaseAdmin.from("reflection_entries").select("title, body, writing_prompt, created_at").eq("user_id", userId).is("deleted_at", null),
      supabaseAdmin.from("verse_annotations").select("note, created_at, saved_verse_id").eq("user_id", userId),
      supabaseAdmin.from("user_patterns").select("theme, occurrence, first_seen, last_seen").eq("user_id", userId),
    ]);

    // Strip sensitive fields from profile
    const safeProfile = profile.data ? {
      age_group: profile.data.age_group,
      language_preference: profile.data.language_preference,
      preferred_bible_version: profile.data.preferred_bible_version,
      plan: profile.data.plan,
      created_at: profile.data.created_at,
    } : null;

    const exportData = {
      exported_at: new Date().toISOString(),
      profile: safeProfile,
      wisdom_sessions: sessions.data || [],
      saved_verses: verses.data || [],
      reflections: reflections.data || [],
      annotations: annotations.data || [],
      patterns: patterns.data || [],
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
