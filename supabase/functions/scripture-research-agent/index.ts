import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Crisis keyword lists (synced with seek-wisdom) ──
const CLINICAL_CRISIS_KEYWORDS = [
  "i want to kill myself", "i want to die", "suicidal", "end my life",
  "take my life", "i can't go on", "i don't want to be here anymore",
  "nobody would miss me", "i have no reason to live",
  "i just want it to end", "i want to disappear",
];

const SPIRITUAL_CRISIS_KEYWORDS = [
  "god has abandoned me", "i have no reason to pray",
  "i feel completely alone", "i have no hope left",
  "god doesn't hear me", "my faith is gone", "i feel forsaken",
  "there is no point anymore", "i am beyond saving",
  "god has given up on me", "i am too broken to be loved",
  "i cannot be forgiven",
];

const ALL_CRISIS_KEYWORDS = [...CLINICAL_CRISIS_KEYWORDS, ...SPIRITUAL_CRISIS_KEYWORDS];

const YOUTH_EXTRA_KEYWORDS = [
  "loneliness", "lonely", "worthless", "worthlessness", "hopeless", "hopelessness",
  "not belonging", "don't belong", "dont belong", "no one cares", "nobody cares",
  "i don't matter", "i dont matter",
];

const THEOLOGICAL_FALSE_POSITIVES = [
  "rapture", "heaven", "end times", "second coming", "eternity",
  "glorified", "resurrection", "eschatology", "tribulation", "millennium",
];

interface CrisisResult {
  detected: boolean;
  severity: "crisis" | "watch" | null;
  keyword: string | null;
}

function detectCrisis(text: string, ageGroup: string | null): CrisisResult {
  const lower = text.toLowerCase();
  const keywords = ageGroup === "youth" || ageGroup === "young_adult"
    ? [...ALL_CRISIS_KEYWORDS, ...YOUTH_EXTRA_KEYWORDS]
    : ALL_CRISIS_KEYWORDS;

  let matchedKeyword: string | null = null;
  for (const kw of keywords) {
    if (lower.includes(kw)) { matchedKeyword = kw; break; }
  }
  if (!matchedKeyword) return { detected: false, severity: null, keyword: null };

  const hasFalsePositive = THEOLOGICAL_FALSE_POSITIVES.some(fp => lower.includes(fp));
  return { detected: true, severity: hasFalsePositive ? "watch" : "crisis", keyword: matchedKeyword };
}

const CRISIS_PROMPT_ADDENDUM = `
A crisis keyword was detected in this message. Before giving your normal response, open with a single warm sentence that directly acknowledges what the person expressed — use their own words or theme. Do not be clinical. Do not jump straight to resources. Speak as a compassionate pastor would. Then after your normal response close with this block exactly:

---
You don't have to carry this alone.
• 988 Suicide & Crisis Lifeline — call or text 988
• Crisis Text Line — text HOME to 741741
• You matter. Help is available right now.
---
`;

// ── Rate limits (same as seek-wisdom) ──
const RATE_LIMITS: Record<string, number> = {
  free: 10, personal: 30, beta: 30, admin: 100, super_admin: 100, default: 15,
};
const RATE_WINDOW_MS = 60 * 60 * 1000;

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>, userId: string, role: string
): Promise<{ allowed: boolean }> {
  const limit = RATE_LIMITS[role] || RATE_LIMITS.default;
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { data } = await supabase
    .from("rate_limits").select("id, request_count, window_start")
    .eq("user_id", userId).eq("endpoint", "seek-wisdom")
    .gte("window_start", windowStart).order("window_start", { ascending: false })
    .limit(1).single();

  if (data) {
    if (data.request_count >= limit) return { allowed: false };
    await supabase.from("rate_limits").update({ request_count: data.request_count + 1 }).eq("id", data.id);
    return { allowed: true };
  }
  await supabase.from("rate_limits").insert({ user_id: userId, endpoint: "seek-wisdom", request_count: 1 });
  return { allowed: true };
}

// ── Bible proxy fetch ──
async function fetchScripture(supabaseUrl: string, query: string, testament: string): Promise<{ ref: string; text: string }[]> {
  try {
    const ref = encodeURIComponent(query);
    const res = await fetch(`${supabaseUrl}/functions/v1/bible-proxy?ref=${ref}&translation=kjv`);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.verses && Array.isArray(data.verses)) {
      return data.verses.slice(0, 3).map((v: any) => ({
        ref: `${v.book_name} ${v.chapter}:${v.verse}`,
        text: v.text?.trim() || "",
      }));
    }
    if (data.text) {
      return [{ ref: data.reference || query, text: data.text.trim() }];
    }
    return [];
  } catch {
    return [];
  }
}

// ── Tool definition for Call 1 ──
const SEARCH_SCRIPTURE_TOOL = {
  type: "function" as const,
  function: {
    name: "search_scripture",
    description: "Find Bible verses for a spiritual theme or question.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "A Bible reference or topical search query" },
        testament: { type: "string", enum: ["old", "new", "both"] },
        max_results: { type: "number", description: "Max verses to return (1-3)" },
      },
      required: ["query", "testament", "max_results"],
    },
  },
};

const TOOL_SYSTEM = `You are a biblical research assistant. When given a question, use the search_scripture tool to find the most relevant Bible passage. Be precise — provide a specific book/chapter/verse reference.`;

const SYNTHESIS_SYSTEM = `You are DABAR, a warm spiritual companion. Given a question and relevant scripture, write a personal reflection. Rules: speak directly (use "you"), be specific not generic, no lecturing, end with one reflective question. 2-4 short paragraphs.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();

  try {
    const body = await req.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const userId = typeof body.userId === "string" ? body.userId : null;
    const ageGroup = typeof body.ageGroup === "string" ? body.ageGroup : null;

    if (!question || question.length === 0) {
      return new Response(JSON.stringify({ error: "Please provide a question." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (question.length > 2000) {
      return new Response(JSON.stringify({ error: "Question is too long." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ── Auth & profile validation ──
    let validatedAgeGroup = ageGroup;
    let userRole = "free";

    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("age_group, role, plan, trial_ends_at")
        .eq("user_id", userId).single();

      if (profile?.age_group) validatedAgeGroup = profile.age_group;
      if (profile?.role) userRole = profile.role;

      if (profile?.plan === "trial" && profile?.trial_ends_at) {
        if (new Date(profile.trial_ends_at) < new Date()) {
          return new Response(JSON.stringify({ error: "trial_expired", message: "Your trial has ended." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      const { allowed } = await checkRateLimit(supabase, userId, userRole);
      if (!allowed) {
        return new Response(JSON.stringify({ error: "rate_limited", message: "Please wait before asking again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else {
      // Anonymous rate limiting
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      const hourBucket = Math.floor(Date.now() / 3_600_000);
      const windowKey = `anon_${clientIp}_${hourBucket}`;
      const { data: rateRow } = await supabase.from("rate_limits_anonymous").select("count").eq("key", windowKey).single();
      const currentCount = rateRow?.count ?? 0;
      if (currentCount >= 10) {
        return new Response(JSON.stringify({ error: "rate_limited", message: "Please sign up for unlimited access." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("rate_limits_anonymous").upsert({ key: windowKey, count: currentCount + 1, created_at: new Date().toISOString() });
    }

    // ── Crisis check ──
    const crisisResult = detectCrisis(question, validatedAgeGroup);
    if (crisisResult.detected) {
      // Log to crisis_log
      await supabase.from("crisis_log").insert({
        keyword_matched: crisisResult.keyword,
        session_id: null,
        severity: crisisResult.severity,
      });

      if (crisisResult.severity === "crisis") {
        // Set pending_checkin on user profile
        if (userId) {
          await supabase.from("profiles").update({ pending_checkin: true }).eq("user_id", userId);
        }

        // Send admin email alert
        try {
          const { data: adminEmailRow } = await supabase
            .from("app_config").select("value").eq("key", "admin_email").single();
          if (adminEmailRow?.value) {
            const time = new Date().toISOString();
            await supabase.rpc("enqueue_email", {
              queue_name: "email_queue",
              payload: JSON.stringify({
                to: adminEmailRow.value,
                subject: "DABAR: Crisis keyword detected",
                html: `<p>A crisis-level keyword was triggered at ${time}. No user identity is stored. Please review your Crisis Log.</p>`,
              }),
            });
          }
        } catch (e) { console.error("Admin email alert failed:", e); }
      }

      // For watch-level: proceed normally (no prompt injection, no resource card)
      // For crisis-level: inject crisis prompt addendum into synthesis
    }

    // ══════════════════════════════════════════════
    // CALL 1: Theme extraction + scripture tool use
    // ══════════════════════════════════════════════
    let verses: { ref: string; text: string }[] = [];

    try {
      const call1Res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          max_tokens: 300,
          messages: [
            { role: "system", content: TOOL_SYSTEM },
            { role: "user", content: question },
          ],
          tools: [SEARCH_SCRIPTURE_TOOL],
          tool_choice: "auto",
        }),
      });

      if (call1Res.ok) {
        const call1Data = await call1Res.json();
        const toolCall = call1Data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          const args = typeof toolCall.function.arguments === "string"
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;
          verses = await fetchScripture(supabaseUrl, args.query, args.testament || "both");
        }
      }
    } catch (e) {
      console.error("Call 1 failed:", e);
      // Graceful degradation — proceed without verses
    }

    // ══════════════════════════════════════════════
    // CALL 2: Synthesis with streaming
    // ══════════════════════════════════════════════
    const versesContext = verses.length > 0
      ? `\nScripture: ${verses.map(v => `${v.ref}: ${v.text}`).join(" | ")}`
      : "";

    const userMessage = `Question: ${question}${versesContext}`;

    // Inject crisis prompt if crisis-level
    const systemPrompt = (crisisResult.detected && crisisResult.severity === "crisis")
      ? SYNTHESIS_SYSTEM + "\n\n" + CRISIS_PROMPT_ADDENDUM
      : SYNTHESIS_SYSTEM;

    const call2Res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: crisisResult.severity === "crisis" ? 600 : 450,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!call2Res.ok) {
      if (call2Res.status === 429) {
        return new Response(JSON.stringify({ error: "Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("Synthesis call failed");
    }

    // ── Pre-create session row so we can return its ID in headers ──
    const scriptureRefs = verses.map(v => v.ref);
    const sessionId = await createSession(supabase, userId, question, scriptureRefs);

    // ── Stream to client ──
    let fullText = "";
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const reader = call2Res.body!.getReader();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const payload = trimmed.slice(6);
              if (payload === "[DONE]") continue;
              try {
                const parsed = JSON.parse(payload);
                const text = parsed.choices?.[0]?.delta?.content ?? "";
                if (text) {
                  fullText += text;
                  controller.enqueue(encoder.encode(text));
                }
              } catch { /* skip malformed */ }
            }
          }

          // Flush remaining buffer
          if (buffer.trim().startsWith("data: ")) {
            const payload = buffer.trim().slice(6);
            if (payload !== "[DONE]") {
              try {
                const parsed = JSON.parse(payload);
                const text = parsed.choices?.[0]?.delta?.content ?? "";
                if (text) { fullText += text; controller.enqueue(encoder.encode(text)); }
              } catch { /* skip */ }
            }
          }

          controller.close();

          // ── Post-stream: persist response text ──
          if (sessionId) {
            await supabase.from("wisdom_sessions")
              .update({ response: fullText.trim() })
              .eq("id", sessionId);
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        ...corsHeaders,
        "Access-Control-Expose-Headers": "X-Session-Id",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "X-Session-Id": sessionId || "",
      },
    });
  } catch (e) {
    console.error("scripture-research-agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "An unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function createSession(
  supabase: ReturnType<typeof createClient>,
  userId: string | null, question: string, scriptures: string[]
): Promise<string | null> {
  try {
    const { data } = await supabase.from("wisdom_sessions").insert({
      user_id: userId || null, question, response: "", scripture_refs: scriptures,
    }).select("id").single();
    return (data as any)?.id || null;
  } catch (err) {
    console.error("Failed to create session:", err);
    return null;
  }
}
