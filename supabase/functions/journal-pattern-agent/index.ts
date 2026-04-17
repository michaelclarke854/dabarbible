import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const sunday = new Date(now.setDate(diff));
  return sunday.toISOString().split("T")[0];
}

function relativeWeek(dateStr: string, now = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 7) return "this week";
  if (days <= 14) return "last week";
  if (days <= 21) return "2 weeks ago";
  return "3+ weeks ago";
}

function dedup<T>(items: T[], key: keyof T): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const sig = String(item[key]).trim().slice(0, 40).toLowerCase();
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

const JOURNAL_SYSTEM = `You are a spiritual pattern analyst. Identify themes across journal entries and questions. Respond ONLY with valid JSON. No preamble. No markdown fences.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // SECURITY: allow either authenticated user (operating on self) OR cron secret from Vault (any user)
    const body = await req.json().catch(() => ({}));
    const bodyUserId = typeof body.userId === "string" ? body.userId : null;
    const providedSecret = req.headers.get("x-cron-secret");

    // Build service-role client first so we can read the cron secret from Vault
    const adminClient = createClient(supabaseUrl, supabaseKey);

    let cronAuthenticated = false;
    if (providedSecret) {
      const { data: vaultSecret } = await adminClient.rpc("get_cron_shared_secret");
      if (vaultSecret && providedSecret === vaultSecret) {
        cronAuthenticated = true;
      }
    }

    let userId: string | null = null;
    if (cronAuthenticated && bodyUserId) {
      userId = bodyUserId;
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await anonClient.auth.getUser();
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      userId = userData.user.id;
    }

    const supabase = adminClient;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const weekStart = getWeekStart();

    // ── Check for existing insight this week ──
    const { data: existing } = await supabase
      .from("journal_insights")
      .select("id")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ userId, status: "already_exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── PART A: Eligibility check (HEAD queries only) ──
    const [{ count: entryCount }, { count: questionCount }] = await Promise.all([
      supabase.from("reflection_entries").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("wisdom_sessions").select("*", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    if ((entryCount ?? 0) + (questionCount ?? 0) < 5) {
      await logRun(supabase, userId, weekStart, "skipped", "too_few_sources");
      return new Response(JSON.stringify({ userId, status: "skipped" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── PART B: Parallel content fetch ──
    const [{ data: entries }, { data: questions }] = await Promise.all([
      supabase.from("reflection_entries")
        .select("body, created_at")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("wisdom_sessions")
        .select("question, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    const uniqueEntries = dedup(entries ?? [], "body");
    const uniqueQuestions = dedup(questions ?? [], "question");

    if (uniqueEntries.length + uniqueQuestions.length < 3) {
      await logRun(supabase, userId, weekStart, "skipped", "insufficient_unique_content");
      return new Response(JSON.stringify({ userId, status: "skipped" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── PART C: Token-efficient prompt ──
    const now = new Date();
    const entryLines = uniqueEntries.slice(0, 12).map((e, i) =>
      `J${i + 1} [${relativeWeek(e.created_at, now)}]: ${e.body.slice(0, 180)}`
    ).join("\n");

    const questionLines = uniqueQuestions.slice(0, 10).map((q, i) =>
      `Q${i + 1} [${relativeWeek(q.created_at, now)}]: ${q.question.slice(0, 120)}`
    ).join("\n");

    const userMessage = `Analyse these reflections. Entries (J) and questions asked (Q):
${entryLines}
${questionLines ? "\n" + questionLines : ""}

Return ONLY this JSON (no other text):
{
  "themes": ["max 3 short phrases"],
  "primaryTheme": "one phrase",
  "insightText": "2 sentences max, warm, specific to what you actually saw",
  "scriptureRef": "Book Ch:V",
  "scriptureText": "verse text only"
}`;

    // ── PART D: Single API call ──
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 400,
        temperature: 0.3,
        messages: [
          { role: "system", content: JOURNAL_SYSTEM },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI call failed:", aiRes.status, errText);
      await logRun(supabase, userId, weekStart, "error", `AI ${aiRes.status}`);
      return new Response(JSON.stringify({ userId, status: "error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "";

    // ── PART E: Robust JSON parsing ──
    let parsed: any;
    try {
      const clean = rawContent.trim().replace(/^```json\n?|\n?```$/g, "").trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      await logRun(supabase, userId, weekStart, "error", `JSON parse failed: ${(e as Error).message}`);
      return new Response(JSON.stringify({ userId, status: "error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!parsed.insightText || !parsed.primaryTheme) {
      await logRun(supabase, userId, weekStart, "error", "missing required fields");
      return new Response(JSON.stringify({ userId, status: "error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── PART F: Insert + log in parallel ──
    await Promise.all([
      supabase.from("journal_insights").insert({
        user_id: userId,
        week_start: weekStart,
        themes: parsed.themes ?? [],
        primary_theme: parsed.primaryTheme,
        insight_text: parsed.insightText,
        scripture_ref: parsed.scriptureRef ?? null,
        scripture_text: parsed.scriptureText ?? null,
        entry_count: uniqueEntries.length,
        question_count: uniqueQuestions.length,
      }),
      logRun(supabase, userId, weekStart, "success", null, {
        entries_read: uniqueEntries.length,
        questions_read: uniqueQuestions.length,
        themes_found: parsed.themes,
        duration_ms: Date.now() - start,
      }),
    ]);

    return new Response(JSON.stringify({
      userId,
      status: "success",
      insight: parsed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("journal-pattern-agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function logRun(
  supabase: ReturnType<typeof createClient>,
  userId: string, weekStart: string, status: string,
  errorMessage: string | null, metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from("journal_agent_runs").insert({
      user_id: userId, week_start: weekStart, status,
      error_message: errorMessage, metadata: metadata ?? null,
    });
  } catch (err) {
    console.error("Failed to log agent run:", err);
  }
}
