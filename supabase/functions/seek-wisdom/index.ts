import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  response:
    "This burden is heavier than words. Please reach out to someone who can truly be with you: call or text 988 (Suicide & Crisis Lifeline) or speak with a pastor or counselor today.",
  scriptures: [],
};

const ALL_THEMES = [
  "anxiety", "purpose", "relationships", "grief",
  "identity", "decisions", "family", "work", "faith",
] as const;

const THEME_KEYWORDS: Record<string, string[]> = {
  anxiety: ["anxious", "anxiety", "worried", "worry", "fear", "afraid", "nervous", "panic", "stress", "stressed", "overwhelm", "restless", "dread", "uneasy"],
  purpose: ["purpose", "meaning", "calling", "direction", "why am i", "point of life", "destiny", "mission", "significance", "path"],
  relationships: ["relationship", "marriage", "friend", "friendship", "partner", "spouse", "dating", "love", "trust", "betrayal", "conflict", "forgiveness"],
  grief: ["grief", "loss", "death", "died", "mourning", "miss them", "miss him", "miss her", "passing", "gone", "funeral", "bereavement"],
  identity: ["identity", "who am i", "self-worth", "worth", "belong", "belonging", "confidence", "insecure", "shame", "enough"],
  decisions: ["decision", "decide", "choice", "choose", "right path", "wrong choice", "uncertain", "crossroads", "option", "should i"],
  family: ["family", "parent", "mother", "father", "child", "children", "sibling", "brother", "sister", "son", "daughter", "parenting"],
  work: ["work", "job", "career", "boss", "coworker", "workplace", "employment", "fired", "promotion", "burnout", "vocation"],
  faith: ["faith", "doubt", "believe", "prayer", "pray", "god", "church", "spiritual", "worship", "scripture", "bible", "sin"],
};

function detectThemes(text: string): { theme: string; confidence: number }[] {
  const lower = text.toLowerCase();
  const results: { theme: string; confidence: number }[] = [];
  for (const theme of ALL_THEMES) {
    const keywords = THEME_KEYWORDS[theme];
    let hits = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) hits++;
    }
    if (hits > 0) {
      const confidence = Math.min(hits / 3, 1.0);
      results.push({ theme, confidence: Math.round(confidence * 100) / 100 });
    }
  }
  return results.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

function buildPatternContext(patterns: { theme: string; occurrence: number; first_seen: string }[]): string {
  if (!patterns || patterns.length === 0) return "";

  const lines = patterns
    .filter((p) => p.occurrence >= 2)
    .sort((a, b) => b.occurrence - a.occurrence)
    .slice(0, 3)
    .map((p) => {
      const daysSince = Math.floor(
        (Date.now() - new Date(p.first_seen).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (p.occurrence >= 5) {
        return `This person has carried the weight of [${p.theme}] for some time now — it has surfaced repeatedly over ${daysSince} days. In your Mirror, acknowledge the long-carried nature of this burden without referencing numbers or counts.`;
      }
      if (p.occurrence >= 3) {
        return `The theme of [${p.theme}] has returned again. Speak to the recurring nature of this struggle with tenderness — they keep coming back to this.`;
      }
      return `[${p.theme}] has appeared before. Be aware this is not the first time they've brought this forward.`;
    });

  if (lines.length === 0) return "";
  return `\n\nUSER PATTERN CONTEXT:\n${lines.join("\n")}`;
}

const BASE_SYSTEM_PROMPT = `You are the unified voice of biblical wisdom — drawing from the teachings of the prophets (Moses, Isaiah, Elijah, Daniel, Jeremiah), the disciples (Peter, Paul, John, James), and Jesus. You do not roleplay as a single figure. You speak as a chorus of scripture, distilling ancient wisdom for a modern person's real daily challenge. Your sole scriptural source is the King James Version (KJV) of the Bible.

RESPONSE STRUCTURE — follow this pattern for every response:

1. THE MIRROR: Open with one sentence that names what the person is truly carrying — the deeper fear, longing, or tension beneath their question. Not a restatement of their words. The thing underneath.

2. THE SCRIPTURE: Cite one to three KJV verses that illuminate this moment. For each scripture, provide BOTH the reference and the complete verse text exactly as written in the KJV. Format each scripture block exactly like this:

[SCRIPTURE]
reference: Philippians 4:13
text: I can do all things through Christ which strengtheneth me.
[/SCRIPTURE]

After each scripture block, in one to two sentences show precisely how this verse speaks into their specific situation — not the topic generally, but their moment. Then continue to THE WISDOM BRIDGE.

3. THE WISDOM BRIDGE: Two to three sentences connecting the ancient word to their modern reality. Acknowledge the weight of what they are carrying before offering any light. Never rush to resolution. Never minimize.

4. THE THRESHOLD QUESTION: Close with a single question so specific to this person and this moment that it could not have been written for anyone else. This question does not require an answer typed into the app. It requires the person to go inward. This is the gift.

WHAT THE RESPONSE MUST NEVER DO:

- Never offer false comfort or rush to resolution
- Never give a generic closing ("Trust in God's plan", "Have faith", "You are not alone") without it being earned by what came before
- Never use the scripture as a proof-text — use it as a window
- Never write a closing question that could apply to any person asking any question
- Never give medical, legal, or financial advice

Use the language and cadence of the KJV — its beauty and weight are part of the authority. Point the person toward their own discernment — you illuminate, you do not command.

If the question involves self-harm, crisis, or mental health emergency, respond ONLY with:
"This burden is heavier than words. Please reach out to someone who can truly be with you: call or text 988 (Suicide & Crisis Lifeline) or speak with a pastor or counselor today."

IMPORTANT: Use the [SCRIPTURE]...[/SCRIPTURE] block format described above for ALL scripture citations. Do NOT list scriptures separately at the end.`;

const YOUTH_LAYER = `

ADDITIONAL CONTEXT: The person asking is aged 13–22. Follow these instructions with absolute fidelity:

- Recognize that this person may be navigating identity, belonging, anxiety, academic pressure, family conflict, or questions about their own worth — name these with extra care and precision in your response.

- Explicitly affirm their capacity to find their own way — never be paternalistic, never sound like a parent or teacher.

- Any question or invitation you offer must be genuinely curious, not corrective — you are not guiding them toward a predetermined answer.

- Every response must include at least one gentle encouragement toward a trusted human — a parent, youth pastor, counselor, or friend — woven naturally into the response, never as a disclaimer or afterthought.

- Never minimize adolescent or young adult pain by contextualizing it as "just a phase" or "you'll understand when you're older" — the pain is real now. Honor it fully.

- If the question touches on worthlessness, hopelessness, isolation, or not belonging, treat it with the same gravity as a crisis — respond with the crisis routing message.`;

const AGE_LAYERS: Record<string, string> = {
  youth: YOUTH_LAYER,
  young_adult: YOUTH_LAYER,
  adult: `\n\nADDITIONAL CONTEXT: The person asking is an adult (23+). Speak with the full weight and depth of scriptural wisdom. You may engage with more complex theological dimensions when the question warrants it.`,
};

const SCRIPTURE_VERSIONS: Record<string, { name: string; instruction: string }> = {
  KJV: {
    name: "King James Version",
    instruction: "Your sole scriptural source is the King James Version (KJV) of the Bible.",
  },
  RV1960: {
    name: "Reina Valera 1960",
    instruction: "Tu única fuente escritural es la Reina Valera 1960. Cita los versículos exactamente como aparecen en esa versión.",
  },
  ARA: {
    name: "Almeida Revista e Atualizada",
    instruction: "Sua única fonte escritural é a Almeida Revista e Atualizada (ARA). Cite os versículos exatamente como aparecem nessa versão.",
  },
};

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: "Respond entirely in English.",
  es: "Responde completamente en español. Usa un tono poético y reverente similar al castellano clásico.",
  pt: "Responda completamente em português. Use um tom poético e reverente.",
  ko: "전체 응답을 한국어로 작성하세요. 경건하고 시적인 어조를 사용하세요.",
  fr: "Répondez entièrement en français. Utilisez un ton poétique et révérencieux.",
};

function getSystemPrompt(
  ageGroup: string | null,
  patternContext: string,
  language: string = "en",
  scriptureVersion: string = "KJV"
): string {
  const layer = ageGroup && AGE_LAYERS[ageGroup] ? AGE_LAYERS[ageGroup] : AGE_LAYERS["adult"];
  const langInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS["en"];
  const versionConfig = SCRIPTURE_VERSIONS[scriptureVersion] || SCRIPTURE_VERSIONS["KJV"];
  
  let prompt = BASE_SYSTEM_PROMPT;
  if (scriptureVersion !== "KJV") {
    prompt = prompt.replace(
      "Your sole scriptural source is the King James Version (KJV) of the Bible.",
      versionConfig.instruction
    );
    prompt = prompt.replace(
      "Use the language and cadence of the KJV — its beauty and weight are part of the authority.",
      `Use the language and cadence of the ${versionConfig.name} — its beauty and weight are part of the authority.`
    );
  }
  
  return prompt + layer + patternContext + `\n\n${langInstruction}`;
}

function getCrisisKeywords(ageGroup: string | null): string[] {
  if (ageGroup === "youth" || ageGroup === "young_adult") {
    return YOUTH_CRISIS_KEYWORDS;
  }
  return ADULT_CRISIS_KEYWORDS;
}

const RATE_LIMITS: Record<string, number> = {
  free: 10,
  personal: 30,
  beta: 30,
  admin: 100,
  super_admin: 100,
  default: 15,
};

const RATE_WINDOW_MS = 60 * 60 * 1000;

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  role: string
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = RATE_LIMITS[role] || RATE_LIMITS.default;
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();

  const { data } = await supabase
    .from("rate_limits")
    .select("id, request_count, window_start")
    .eq("user_id", userId)
    .eq("endpoint", "seek-wisdom")
    .gte("window_start", windowStart)
    .order("window_start", { ascending: false })
    .limit(1)
    .single();

  if (data) {
    if (data.request_count >= limit) {
      return { allowed: false, remaining: 0 };
    }
    await supabase
      .from("rate_limits")
      .update({ request_count: data.request_count + 1 })
      .eq("id", data.id);
    return { allowed: true, remaining: limit - data.request_count - 1 };
  }

  await supabase.from("rate_limits").insert({
    user_id: userId,
    endpoint: "seek-wisdom",
    request_count: 1,
  });
  return { allowed: true, remaining: limit - 1 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const userId = typeof body.userId === "string" ? body.userId : null;
    const ageGroup = typeof body.ageGroup === "string" ? body.ageGroup : null;
    const language = typeof body.language === "string" ? body.language : "en";
    const scriptureVersion = typeof body.scriptureVersion === "string" ? body.scriptureVersion : "KJV";

    if (!question || question.length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide a question." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (question.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Question is too long. Please keep it under 2000 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ALLOWED_LANGUAGES = ["en", "es", "pt", "ko", "fr"];
    const ALLOWED_VERSIONS = ["KJV", "RV1960", "ARA"];
    const safeLang = ALLOWED_LANGUAGES.includes(language) ? language : "en";
    const safeVersion = ALLOWED_VERSIONS.includes(scriptureVersion) ? scriptureVersion : "KJV";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let validatedAgeGroup = ageGroup || null;
    let userPatterns: { theme: string; occurrence: number; first_seen: string }[] = [];
    let userRole = "free";

    if (userId) {
      const [profileResult, patternsResult] = await Promise.all([
        supabase.from("profiles").select("age_group, language_preference, role, plan, trial_ends_at").eq("user_id", userId).single(),
        supabase.from("user_patterns").select("theme, occurrence, first_seen").eq("user_id", userId),
      ]);
      if (profileResult.data?.age_group) {
        validatedAgeGroup = profileResult.data.age_group;
      }
      if (profileResult.data?.role) {
        userRole = profileResult.data.role;
      }
      if (patternsResult.data) {
        userPatterns = patternsResult.data;
      }

      if (profileResult.data?.plan === "trial" && profileResult.data?.trial_ends_at) {
        const trialEnd = new Date(profileResult.data.trial_ends_at);
        if (trialEnd < new Date()) {
          return new Response(
            JSON.stringify({ error: "trial_expired", message: "Your trial has ended. Please upgrade to continue." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { allowed } = await checkRateLimit(supabase, userId, userRole);
      if (!allowed) {
        return new Response(
          JSON.stringify({ error: "You've asked many questions recently. Please wait a while before continuing." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "X-RateLimit-Remaining": "0" } }
        );
      }
    } else {
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      const hourBucket = Math.floor(Date.now() / 3_600_000);
      const windowKey = `anon_${clientIp}_${hourBucket}`;
      const ANON_LIMIT = 10;

      const { data: rateRow } = await supabase
        .from("rate_limits_anonymous")
        .select("count")
        .eq("key", windowKey)
        .single();

      const currentCount = rateRow?.count ?? 0;

      if (currentCount >= ANON_LIMIT) {
        return new Response(
          JSON.stringify({ error: "rate_limited", message: "Please sign up for unlimited access." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("rate_limits_anonymous")
        .upsert({ key: windowKey, count: currentCount + 1, created_at: new Date().toISOString() });
    }

    const crisisKeywords = getCrisisKeywords(validatedAgeGroup);
    const lowerQuestion = question.toLowerCase();
    for (const keyword of crisisKeywords) {
      if (lowerQuestion.includes(keyword)) {
        await logSession(supabase, userId, question, CRISIS_RESPONSE.response, []);
        return new Response(JSON.stringify(CRISIS_RESPONSE), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const patternContext = buildPatternContext(userPatterns);
    const systemPrompt = getSystemPrompt(validatedAgeGroup, patternContext, safeLang, safeVersion);

    // ── Streaming AI call ──
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 1200,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "The voice needs a moment of rest. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("Failed to receive wisdom");
    }

    // Accumulate full text for post-processing
    let fullText = "";
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const reader = aiResponse.body!.getReader();

          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            // Keep the last potentially incomplete line in buffer
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
              } catch {
                // skip malformed chunks
              }
            }
          }

          // Process any remaining buffer
          if (buffer.trim()) {
            const trimmed = buffer.trim();
            if (trimmed.startsWith("data: ") && trimmed.slice(6) !== "[DONE]") {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const text = parsed.choices?.[0]?.delta?.content ?? "";
                if (text) {
                  fullText += text;
                  controller.enqueue(encoder.encode(text));
                }
              } catch { /* skip */ }
            }
          }

          controller.close();

          // ── Post-processing (after stream completes) ──
          const responseText = fullText.trim();
          const scriptureBlocks: { reference: string; text: string }[] = [];
          const scriptureRegex = /\[SCRIPTURE\]\s*\nreference:\s*(.+)\ntext:\s*(.+)\n\[\/SCRIPTURE\]/g;
          let match;
          while ((match = scriptureRegex.exec(responseText)) !== null) {
            scriptureBlocks.push({ reference: match[1].trim(), text: match[2].trim() });
          }
          const scriptures = scriptureBlocks.map((s) => s.reference);

          const sessionId = await logSession(supabase, userId, question, responseText, scriptures);

          if (userId && sessionId) {
            const detectedThemes = detectThemes(question + " " + responseText);
            if (detectedThemes.length > 0) {
              await supabase.from("session_themes").insert(
                detectedThemes.map((t) => ({
                  session_id: sessionId,
                  theme: t.theme,
                  confidence: t.confidence,
                }))
              );

              await Promise.all(detectedThemes.map(async (t) => {
                const { data: existing } = await supabase
                  .from("user_patterns")
                  .select("id, occurrence")
                  .eq("user_id", userId)
                  .eq("theme", t.theme)
                  .single();

                if (existing) {
                  await supabase
                    .from("user_patterns")
                    .update({ occurrence: existing.occurrence + 1, last_seen: new Date().toISOString() })
                    .eq("id", existing.id);
                } else {
                  await supabase.from("user_patterns").insert({
                    user_id: userId,
                    theme: t.theme,
                    occurrence: 1,
                  });
                }
              }));
            }
          }
        } catch (err) {
          console.error("Stream processing error:", err);
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
    console.error("seek-wisdom error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "An unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function logSession(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  question: string,
  response: string,
  scriptures: string[]
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("wisdom_sessions")
      .insert({
        user_id: userId || null,
        question,
        response,
        scripture_refs: scriptures,
      })
      .select("id")
      .single();
    return data?.id || null;
  } catch (err) {
    console.error("Failed to log session:", err);
    return null;
  }
}
