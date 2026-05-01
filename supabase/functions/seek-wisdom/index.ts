import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { streamChatWithFallback, chatWithFallback } from "../_shared/ai-with-fallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Crisis keyword lists ──────────────────

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

// Youth-only extras (from original)
const YOUTH_EXTRA_KEYWORDS = [
  "loneliness", "lonely", "worthless", "worthlessness", "hopeless", "hopelessness",
  "not belonging", "don't belong", "dont belong", "no one cares", "nobody cares",
  "i don't matter", "i dont matter",
];

const THEOLOGICAL_FALSE_POSITIVES = [
  "rapture", "heaven", "end times", "second coming", "eternity",
  "glorified", "resurrection", "eschatology", "tribulation", "millennium",
];

// ── Intent personalisation context (module-level constant) ──────────────────
// Defined outside the handler so it is constructed once at module load,
// not on every invocation.
const INTENT_CONTEXT: Record<string, { registered: string; firstSession: string }> = {
  grief: {
    registered: `USER INTENT CONTEXT — GRIEF: This user is grieving or processing loss. Lead with lament before hope. The Mirror section must reflect their pain honestly before moving to Scripture — never rush toward reassurance or silver linings. Let the darkness be named. The Threshold question should honour the grief, not resolve it.`,
    firstSession: `USER INTENT CONTEXT — GRIEF (first session): This user is grieving. Open with exceptional gentleness. The Mirror should simply reflect that they are carrying something heavy and that bringing it here is an act of courage. Do not rush to scripture or wisdom — let them feel heard first.`,
  },
  doubt: {
    registered: `USER INTENT CONTEXT — DOUBT: This user is wrestling with doubt or hard questions. Honour the intellectual and spiritual weight of their question. Do not soothe or offer premature resolution — engage with honesty. The Mirror should reflect the wrestling itself. The Threshold question should sit in the tension and invite deeper inquiry, not close it.`,
    firstSession: `USER INTENT CONTEXT — DOUBT (first session): This user is exploring doubt. Open with warmth and intellectual respect — let them know hard questions are welcome here. The Mirror should be light and inviting, not heavy. Save the full engagement for subsequent sessions.`,
  },
  direction: {
    registered: `USER INTENT CONTEXT — DIRECTION: This user needs discernment for a significant decision. The Mirror should reflect the weight of the decision they are carrying. The Wisdom section should focus on discernment frameworks from Scripture. The Threshold question must point toward a concrete next step, a question to bring to prayer, or a person to consult.`,
    firstSession: `USER INTENT CONTEXT — DIRECTION (first session): This user faces a decision. Open with acknowledgement that bringing big decisions to Scripture is itself an act of faith. The Threshold question should be simple and grounding.`,
  },
  habit: {
    registered: `USER INTENT CONTEXT — HABIT: This user wants to grow in faith through daily practice. Use a devotional, formation-focused register. The Wisdom section should be practical and actionable — not just explanatory. The Threshold question should build toward a daily practice, a repeatable act, or a specific commitment.`,
    firstSession: `USER INTENT CONTEXT — HABIT (first session): This user wants daily growth. Welcome them warmly. Keep the first response encouraging and accessible — build confidence before depth.`,
  },
  crisis: {
    registered: `USER INTENT CONTEXT — CRISIS: This user identified as being in a dark place. Crisis detection is already active and will route as appropriate. If the message passes crisis detection, respond with extraordinary gentleness. Never project emotions or assume the extent of their pain — follow their words precisely. The Threshold question should be a single, simple, grounding question.`,
    firstSession: `USER INTENT CONTEXT — CRISIS (first session): This user is in a dark place. Respond with maximum care. If crisis detection has cleared the message, open with simple, warm acknowledgement. One step at a time.`,
  },
  curious: {
    registered: `USER INTENT CONTEXT — CURIOUS: This user is exploring faith, possibly without a strong prior tradition. Use an inviting, non-threatening register. Avoid assumed knowledge of Christian vocabulary or tradition. The Threshold question should invite further exploration — curious, open-ended, welcoming rather than challenging.`,
    firstSession: `USER INTENT CONTEXT — CURIOUS (first session): This user is new to exploring faith. Make the first response exceptionally welcoming. Avoid theology-dense language. The goal is to make them want to come back.`,
  },
};
// ─────────────────────────────────────────────────────────────────────────────

// ── Hard question detection ──────────────────

const HARD_QUESTION_SIGNALS = [
  /punishing me/i,
  /why did god let/i,
  /stopped believing/i,
  /where was god/i,
  /too broken/i,
  /good people suffer/i,
  /prayer.*change/i,
];

// ── Crisis detection ──────────────────

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
    if (lower.includes(kw)) {
      matchedKeyword = kw;
      break;
    }
  }

  if (!matchedKeyword) return { detected: false, severity: null, keyword: null };

  // Check for theological false positives
  const hasFalsePositive = THEOLOGICAL_FALSE_POSITIVES.some(fp => lower.includes(fp));
  const severity = hasFalsePositive ? "watch" : "crisis";

  return { detected: true, severity, keyword: matchedKeyword };
}

// ── Crisis prompt injection ──────────────────

const CRISIS_PROMPT_ADDENDUM = `
A crisis keyword was detected in this message. Before giving your normal response, open with a single warm sentence that directly acknowledges what the person expressed — use their own words or theme. Do not be clinical. Do not jump straight to resources. Speak as a compassionate pastor would. Then after your normal response close with this block exactly:

---
You don't have to carry this alone.
• 988 Suicide & Crisis Lifeline — call or text 988
• Crisis Text Line — text HOME to 741741
• You matter. Help is available right now.
---`;

// ── Theme detection ──────────────────

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

// ── Pattern context ──────────────────

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
        return `This person has carried the weight of [${p.theme}] for some time now — it has surfaced repeatedly over ${daysSince} days.`;
      }
      if (p.occurrence >= 3) {
        return `The theme of [${p.theme}] has returned again. Speak to the recurring nature of this struggle with tenderness.`;
      }
      return `[${p.theme}] has appeared before. Be aware this is not the first time they've brought this forward.`;
    });
  if (lines.length === 0) return "";
  return `\n\nUSER PATTERN CONTEXT:\n${lines.join("\n")}`;
}

// ── System prompt ──────────────────

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
  KJV: { name: "King James Version", instruction: "Your sole scriptural source is the King James Version (KJV) of the Bible." },
  RV1960: { name: "Reina Valera 1960", instruction: "Tu única fuente escritural es la Reina Valera 1960. Cita los versículos exactamente como aparecen en esa versión." },
  ARA: { name: "Almeida Revista e Atualizada", instruction: "Sua única fonte escritural é a Almeida Revista e Atualizada (ARA). Cite os versículos exatamente como aparecem nessa versão." },
};

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: "Respond entirely in English.",
  es: "Responde completamente en español. Usa un tono poético y reverente similar al castellano clásico.",
  pt: "Responda completamente em português. Use um tom poético e reverente.",
  ko: "전체 응답을 한국어로 작성하세요. 경건하고 시적인 어조를 사용하세요.",
  fr: "Répondez entièrement en français. Utilisez un ton poétique et révérencieux.",
};

function getSystemPrompt(
  ageGroup: string | null, patternContext: string,
  language: string = "en", scriptureVersion: string = "KJV",
  crisisSeverity: "crisis" | "watch" | null = null
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

  let result = prompt + layer + patternContext + `\n\n${langInstruction}`;

  // For crisis-level events, inject the warm response addendum
  if (crisisSeverity === "crisis") {
    result += CRISIS_PROMPT_ADDENDUM;
  }

  return result;
}

// ── Rate limiting ──────────────────

const RATE_LIMITS: Record<string, number> = {
  free: 10, personal: 30, beta: 30, admin: 100, super_admin: 100, default: 15,
};
const RATE_WINDOW_MS = 60 * 60 * 1000;

// deno-lint-ignore no-explicit-any
async function checkRateLimit(
  supabase: any, userId: string, role: string
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = RATE_LIMITS[role] || RATE_LIMITS.default;
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();

  const { data } = await supabase
    .from("rate_limits").select("id, request_count, window_start")
    .eq("user_id", userId).eq("endpoint", "seek-wisdom")
    .gte("window_start", windowStart)
    .order("window_start", { ascending: false }).limit(1).single();

  if (data) {
    if (data.request_count >= limit) return { allowed: false, remaining: 0 };
    await supabase.from("rate_limits").update({ request_count: data.request_count + 1 }).eq("id", data.id);
    return { allowed: true, remaining: limit - data.request_count - 1 };
  }

  await supabase.from("rate_limits").insert({ user_id: userId, endpoint: "seek-wisdom", request_count: 1 });
  return { allowed: true, remaining: limit - 1 };
}

// ── Admin email alert ──────────────────

// deno-lint-ignore no-explicit-any
async function sendCrisisAdminEmail(supabase: any, keyword: string) {
  try {
    const { data: config } = await supabase
      .from("app_config").select("value").eq("key", "admin_email").single();
    if (!config?.value) return;

    const time = new Date().toISOString();
    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: config.value,
        subject: "DABAR: Crisis keyword detected",
        html: `<p>A crisis-level keyword was triggered at ${time}.</p><p>No user identity is stored. Please review your Crisis Log.</p>`,
        purpose: "transactional",
      },
    });
  } catch (err) {
    console.error("Failed to send crisis admin email:", err);
  }
}

// ── Main handler ──────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const ageGroup = typeof body.ageGroup === "string" ? body.ageGroup : null;

    // SECURITY: derive userId from JWT, never trust body. Anonymous if no auth header
    // OR if the bearer is the publishable anon key (role === "anon").
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      let isAnonKey = false;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        isAnonKey = payload?.role === "anon";
      } catch {
        // not a JWT — treat as guest (no userId)
        isAnonKey = true;
      }
      if (!isAnonKey) {
        const anonClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: userData, error: userErr } = await anonClient.auth.getUser();
        if (userErr || !userData.user) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        userId = userData.user.id;
      }
    }
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
    let onboardingIntentKey: string | null = null;

    if (userId) {
      const [profileResult, patternsResult] = await Promise.all([
        supabase.from("profiles").select("age_group, language_preference, role, plan, trial_ends_at, onboarding_intent_key").eq("user_id", userId).single(),
        supabase.from("user_patterns").select("theme, occurrence, first_seen").eq("user_id", userId),
      ]);
      if (profileResult.data?.age_group) validatedAgeGroup = profileResult.data.age_group;
      if (profileResult.data?.role) userRole = profileResult.data.role;
      if (patternsResult.data) userPatterns = patternsResult.data;
      onboardingIntentKey = (profileResult.data as any)?.onboarding_intent_key || null;

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
        .from("rate_limits_anonymous").select("count").eq("key", windowKey).single();
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

    // ── Crisis detection ──
    const crisisResult = detectCrisis(question, validatedAgeGroup);

    if (crisisResult.detected && crisisResult.keyword) {
      // Log to crisis_log (no user identity, no message content)
      const logPromise = supabase.from("crisis_log").insert({
        keyword_matched: crisisResult.keyword,
        severity: crisisResult.severity,
        session_id: null, // will update after session is created
      });

      if (crisisResult.severity === "crisis") {
        // Set pending_checkin on user profile
        if (userId) {
          await supabase.from("profiles").update({ pending_checkin: true } as any).eq("user_id", userId);
        }
        // Send admin email alert (fire and forget)
        sendCrisisAdminEmail(supabase, crisisResult.keyword);
      }

      await logPromise;
    }

    const patternContext = buildPatternContext(userPatterns);

    // ── Intent personalisation ───────────────────────────────────────────────────
    // Determine if this is the user's first session
    let sessionCount = 0;
    if (userId) {
      const { count } = await supabase
        .from("wisdom_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      sessionCount = count ?? 0;
    }
    const isFirstSession = sessionCount === 0;

    const intentEntry = onboardingIntentKey ? INTENT_CONTEXT[onboardingIntentKey] : null;
    const intentBlock = intentEntry
      ? `\n\n${isFirstSession ? intentEntry.firstSession : intentEntry.registered}`
      : '';
    // ─────────────────────────────────────────────────────────────────────────────

    // ── Hard question context ──
    const isHardQuestion = HARD_QUESTION_SIGNALS.some(p => p.test(question));
    const hardQuestionContext = isHardQuestion
      ? `\nThis is a "hard question" — one without a clean theological answer. Do NOT give a tidy resolution. Do NOT quote three verses and wrap it up. Acknowledge the genuine tension. Use the Threshold step to open a door, not close one. The user needs to be heard more than they need to be answered.`
      : "";

    const systemPrompt = getSystemPrompt(validatedAgeGroup, patternContext, safeLang, safeVersion, crisisResult.severity)
      + intentBlock + hardQuestionContext;

    // ── Streaming AI call: Claude first, Lovable AI as fallback ──
    const streamResult = await streamChatWithFallback({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      fallbackModel: "google/gemini-2.5-flash",
      maxTokens: 1200,
    });

    if ("status" in streamResult) {
      if (streamResult.status === 429) {
        return new Response(
          JSON.stringify({ error: "The voice needs a moment of rest. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (streamResult.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway error:", streamResult.status);
      throw new Error("Failed to receive wisdom");
    }
    console.log(`Wisdom stream provider: ${streamResult.provider}`);

    let fullText = "";
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const reader = streamResult.stream.getReader();
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
                if (text) { fullText += text; controller.enqueue(encoder.encode(text)); }
              } catch { /* skip malformed */ }
            }
          }

          if (buffer.trim()) {
            const trimmed = buffer.trim();
            if (trimmed.startsWith("data: ") && trimmed.slice(6) !== "[DONE]") {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const text = parsed.choices?.[0]?.delta?.content ?? "";
                if (text) { fullText += text; controller.enqueue(encoder.encode(text)); }
              } catch { /* skip */ }
            }
          }

          controller.close();

          // ── Post-processing ──
          const responseText = fullText.trim();
          const scriptureBlocks: { reference: string; text: string }[] = [];
          const scriptureRegex = /\[SCRIPTURE\]\s*\nreference:\s*(.+)\ntext:\s*(.+)\n\[\/SCRIPTURE\]/g;
          let match;
          while ((match = scriptureRegex.exec(responseText)) !== null) {
            scriptureBlocks.push({ reference: match[1].trim(), text: match[2].trim() });
          }
          const scriptures = scriptureBlocks.map((s) => s.reference);

          const sessionId = await logSession(supabase, userId, question, responseText, scriptures);

          // Update crisis_log with session_id
          if (crisisResult.detected && crisisResult.keyword && sessionId) {
            await supabase.from("crisis_log")
              .update({ session_id: sessionId })
              .eq("keyword_matched", crisisResult.keyword)
              .is("session_id", null)
              .order("triggered_at", { ascending: false })
              .limit(1);
          }

          // Fire-and-forget category classification — never awaited, never blocks
          classifyAndStoreCategory(
            supabase,
            sessionId,
            userId,
            question,
            crisisResult.detected,
          );

          if (userId && sessionId) {
            const detectedThemes = detectThemes(question + " " + responseText);
            if (detectedThemes.length > 0) {
              await supabase.from("session_themes").insert(
                detectedThemes.map((t) => ({
                  session_id: sessionId, theme: t.theme, confidence: t.confidence,
                }))
              );

              await Promise.all(detectedThemes.map(async (t) => {
                const { data: existing } = await supabase
                  .from("user_patterns").select("id, occurrence")
                  .eq("user_id", userId).eq("theme", t.theme).single();

                if (existing) {
                  await supabase.from("user_patterns")
                    .update({ occurrence: existing.occurrence + 1, last_seen: new Date().toISOString() })
                    .eq("id", existing.id);
                } else {
                  await supabase.from("user_patterns").insert({
                    user_id: userId, theme: t.theme, occurrence: 1,
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
        "Access-Control-Expose-Headers": "X-Crisis-Severity, X-Intent-Key",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "X-Crisis-Severity": crisisResult.severity || "",
        "X-Intent-Key": onboardingIntentKey || "",
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
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string | null, question: string,
  response: string, scriptures: string[]
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("wisdom_sessions")
      .insert({ user_id: userId || null, question, response, scripture_refs: scriptures })
      .select("id").single();
    return data?.id || null;
  } catch (err) {
    console.error("Failed to log session:", err);
    return null;
  }
}

// ── Reflection category classification (fire-and-forget) ──
// Only runs for authenticated community members on non-crisis sessions.
// Stores result on wisdom_sessions.reflection_category. Silent failure on any error.

const VALID_CATEGORIES = [
  "grief_and_loss", "anxiety_and_fear", "doubt_and_faith",
  "relationships", "purpose_and_calling", "forgiveness",
  "suffering_and_theodicy", "spiritual_growth", "identity",
  "sin_and_repentance", "gratitude_and_joy", "general",
] as const;

const CLASSIFY_SYSTEM_PROMPT = `You classify spiritual reflection questions into one of exactly 12 pastoral categories. You MUST call the classify_reflection tool with exactly one of these categories:

grief_and_loss | anxiety_and_fear | doubt_and_faith | relationships | purpose_and_calling | forgiveness | suffering_and_theodicy | spiritual_growth | identity | sin_and_repentance | gratitude_and_joy | general

Choose the single best fit. If unclear, use "general".`;

async function classifyAndStoreCategory(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  sessionId: string | null,
  userId: string | null,
  question: string,
  crisisDetected: boolean,
): Promise<void> {
  try {
    if (!sessionId) return;

    // If a crisis was detected, mark the category and exit — never aggregate into pulse.
    if (crisisDetected) {
      await supabase
        .from("wisdom_sessions")
        .update({ reflection_category: "crisis_escalated" })
        .eq("id", sessionId);
      return;
    }

    // Cost guard: only classify for authenticated community members.
    if (!userId) return;
    const { data: membership } = await supabase
      .from("pastoral_community_members")
      .select("community_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) return;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
          { role: "user", content: `Classify this reflection question: "${question.substring(0, 300)}"` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_reflection",
            description: "Assign exactly one pastoral category to the reflection question.",
            parameters: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  enum: [...VALID_CATEGORIES],
                  description: "The single best-fit pastoral category.",
                },
              },
              required: ["category"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_reflection" } },
      }),
    });

    if (!aiRes.ok) {
      console.error(`Category classification gateway error ${aiRes.status}`);
      return;
    }

    const payload = await aiRes.json();
    const toolCall = payload?.choices?.[0]?.message?.tool_calls?.[0];
    let category = "general";
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        if (typeof args.category === "string" && (VALID_CATEGORIES as readonly string[]).includes(args.category)) {
          category = args.category;
        }
      } catch {
        category = "general";
      }
    }

    await supabase
      .from("wisdom_sessions")
      .update({ reflection_category: category })
      .eq("id", sessionId);
  } catch (err) {
    // Classification failure must never surface to the user
    console.error("Category classification failed (non-fatal):", err);
  }
}
