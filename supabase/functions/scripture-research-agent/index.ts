import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Crisis keywords (reused from seek-wisdom) ──
const ADULT_CRISIS_KEYWORDS = [
  "suicide", "self-harm", "kill myself", "hurt myself", "end my life",
  "don't want to live", "dont want to live", "want to die",
];
const YOUTH_CRISIS_KEYWORDS = [
  ...ADULT_CRISIS_KEYWORDS,
  "loneliness", "lonely", "worthless", "worthlessness", "hopeless", "hopelessness",
  "not belonging", "don't belong", "dont belong", "no one cares", "nobody cares",
  "i don't matter", "i dont matter",
];
const CRISIS_RESPONSE = {
  response: "This burden is heavier than words. Please reach out to someone who can truly be with you: call or text 988 (Suicide & Crisis Lifeline) or speak with a pastor or counselor today.",
  scriptures: [],
};

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
    const crisisKeywords = (validatedAgeGroup === "youth" || validatedAgeGroup === "young_adult") ? YOUTH_CRISIS_KEYWORDS : ADULT_CRISIS_KEYWORDS;
    const lowerQ = question.toLowerCase();
    for (const kw of crisisKeywords) {
      if (lowerQ.includes(kw)) {
        await logSession(supabase, userId, question, CRISIS_RESPONSE.response, []);
        return new Response(JSON.stringify(CRISIS_RESPONSE),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
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

    const call2Res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 450,
        stream: true,
        messages: [
          { role: "system", content: SYNTHESIS_SYSTEM },
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

          // ── Post-stream: log session ──
          const scriptureRefs = verses.map(v => v.ref);
          await logSession(supabase, userId, question, fullText.trim(), scriptureRefs);
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
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

async function logSession(
  supabase: ReturnType<typeof createClient>,
  userId: string | null, question: string, response: string, scriptures: string[]
): Promise<void> {
  try {
    await supabase.from("wisdom_sessions").insert({
      user_id: userId || null, question, response, scripture_refs: scriptures,
    });
  } catch (err) {
    console.error("Failed to log session:", err);
  }
}
