import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatWithFallback } from "../_shared/ai-with-fallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mood signal mapping from reflection_category → struggling/searching/grateful
const MOOD_MAP: Record<string, "struggling" | "searching" | "grateful"> = {
  grief_and_loss: "struggling",
  anxiety_and_fear: "struggling",
  suffering_and_theodicy: "struggling",
  sin_and_repentance: "struggling",
  crisis_escalated: "struggling",
  doubt_and_faith: "searching",
  purpose_and_calling: "searching",
  identity: "searching",
  forgiveness: "searching",
  relationships: "searching",
  spiritual_growth: "searching",
  general: "searching",
  gratitude_and_joy: "grateful",
};

function startOfWeek(d = new Date()): string {
  const dt = new Date(d);
  const day = dt.getUTCDay(); // 0=Sun
  const diff = (day + 6) % 7; // back to Monday
  dt.setUTCDate(dt.getUTCDate() - diff);
  dt.setUTCHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !lovableKey) {
    console.error("FATAL: Missing env in pulse-generator");
    return json({ error: "Server misconfigured" }, 500);
  }

  // Auth: require CRON_SECRET header (cron job) OR a valid pastor JWT (manual trigger)
  const headerSecret = req.headers.get("x-cron-secret");
  const isCron = cronSecret && headerSecret === cronSecret;

  // deno-lint-ignore no-explicit-any
  const supabase: any = createClient(supabaseUrl, serviceRoleKey);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }

  let communityIds: string[] = [];

  if (isCron) {
    // Cron path: process all communities
    const { data: communities, error: cErr } = await supabase
      .from("pastoral_communities")
      .select("id");
    if (cErr) {
      console.error("Failed to list communities:", cErr);
      return json({ error: "Could not list communities" }, 500);
    }
    communityIds = (communities ?? []).map((c: { id: string }) => c.id);
  } else {
    // Manual path: validate pastor JWT, scope to their community
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ") || !anonKey) {
      return json({ error: "Authentication required" }, 401);
    }
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await anonClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return json({ error: "Invalid token" }, 401);

    const requested = body.community_id as string | undefined;
    if (!requested) return json({ error: "community_id required" }, 400);

    const { data: comm } = await supabase
      .from("pastoral_communities")
      .select("id")
      .eq("id", requested)
      .eq("pastor_id", userId)
      .single();
    if (!comm) return json({ error: "Not your community" }, 403);
    communityIds = [requested];
  }

  const weekStart = startOfWeek();
  const sinceIso = new Date(weekStart + "T00:00:00Z").toISOString();
  // 7-day window from week_start
  const untilIso = new Date(
    new Date(sinceIso).getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const results: Array<{ community_id: string; pulse_id?: string; skipped?: string }> = [];

  for (const communityId of communityIds) {
    try {
      // Members of this community
      const { data: members } = await supabase
        .from("pastoral_community_members")
        .select("user_id")
        .eq("community_id", communityId);
      const memberIds = (members ?? []).map((m: { user_id: string }) => m.user_id);

      if (memberIds.length === 0) {
        await supabase
          .from("congregation_pulse")
          .upsert(
            {
              community_id: communityId,
              week_start: weekStart,
              had_activity: false,
            },
            { onConflict: "community_id,week_start" },
          );
        results.push({ community_id: communityId, skipped: "no_members" });
        continue;
      }

      // Sessions in window with categories
      const { data: sessions } = await supabase
        .from("wisdom_sessions")
        .select("reflection_category")
        .in("user_id", memberIds)
        .gte("created_at", sinceIso)
        .lt("created_at", untilIso)
        .not("reflection_category", "is", null);

      const rows = (sessions ?? []) as Array<{ reflection_category: string }>;

      if (rows.length === 0) {
        await supabase.from("congregation_pulse").upsert(
          {
            community_id: communityId,
            week_start: weekStart,
            had_activity: false,
          },
          { onConflict: "community_id,week_start" },
        );
        results.push({ community_id: communityId, skipped: "no_activity" });
        continue;
      }

      // Aggregate mood + categories
      let struggling = 0, searching = 0, grateful = 0;
      const catCounts = new Map<string, number>();
      for (const r of rows) {
        const cat = r.reflection_category;
        catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
        const mood = MOOD_MAP[cat] ?? "searching";
        if (mood === "struggling") struggling++;
        else if (mood === "grateful") grateful++;
        else searching++;
      }

      const topCategories = Array.from(catCounts.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Generate pastoral draft via Lovable AI (gemini-2.5-pro)
      const dominant = topCategories[0]?.category ?? "general";
      const moodSummary =
        struggling > searching && struggling > grateful
          ? "Many in your congregation are walking through difficulty"
          : grateful > struggling && grateful > searching
          ? "Your congregation is in a season of gratitude and joy"
          : "Your congregation is searching — wrestling with questions of meaning, identity, and faith";

      const systemPrompt = `You are helping a pastor write a brief, weekly pastoral message to their congregation. Speak with warmth, theological depth, and pastoral care. Ground the message in scripture (KJV). Avoid CBT framing, motivational-speaking language, prosperity gospel, and platitudes. One well-placed insight beats five bullet points.`;

      const userPrompt = `This week's congregational pulse:
- Total reflections: ${rows.length}
- Struggling: ${struggling}, Searching: ${searching}, Grateful: ${grateful}
- ${moodSummary}
- Top themes (in order): ${topCategories.map((t) => `${t.category} (${t.count})`).join(", ")}
- Dominant theme: ${dominant}

Write a single short pastoral message (150-220 words) the pastor can share with their congregation this week. Include 2-3 scripture references in the form "Book Chapter:Verse". Address the dominant theme with pastoral care. End with a brief blessing or invitation. Return only the message text — no headings, no labels.`;

      let aiDraft = "";
      let aiVerses: string[] = [];
      let wordCount = 0;

      try {
        // Claude first, Lovable AI (gemini-2.5-pro) as fallback.
        const aiResult = await chatWithFallback({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          fallbackModel: "google/gemini-2.5-pro",
          maxTokens: 800,
        });

        if (aiResult) {
          console.log(`Pulse provider for ${communityId}: ${aiResult.provider}`);
          aiDraft = aiResult.body.choices?.[0]?.message?.content ?? "";
          aiVerses = [
            ...aiDraft.matchAll(/\b([1-3]?\s?[A-Z][a-z]+)\s+(\d+):(\d+(?:[-–]\d+)?)\b/g),
          ]
            .map((m) => m[0].trim())
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 8);
          wordCount = aiDraft.split(/\s+/).filter(Boolean).length;
        } else {
          console.warn(`AI unavailable (Claude + Lovable both failed) for community ${communityId}`);
        }
      } catch (e) {
        console.error("AI draft error:", e);
      }

      const { data: pulse, error: pulseErr } = await supabase
        .from("congregation_pulse")
        .upsert(
          {
            community_id: communityId,
            week_start: weekStart,
            struggling,
            searching,
            grateful,
            top_categories: topCategories,
            ai_draft: aiDraft || null,
            ai_verses: aiVerses,
            ai_word_count: wordCount,
            had_activity: true,
          },
          { onConflict: "community_id,week_start" },
        )
        .select("id")
        .single();

      if (pulseErr) {
        console.error("Pulse upsert error:", pulseErr);
        results.push({ community_id: communityId, skipped: pulseErr.message });
        continue;
      }

      results.push({ community_id: communityId, pulse_id: pulse?.id });
    } catch (e) {
      console.error(`Pulse generation failed for ${communityId}:`, e);
      results.push({ community_id: communityId, skipped: String(e) });
    }
  }

  return json({ success: true, processed: results.length, results });
});