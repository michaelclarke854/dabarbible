import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADULT_CRISIS_KEYWORDS = [
  "suicide",
  "self-harm",
  "kill myself",
  "hurt myself",
  "end my life",
  "don't want to live",
  "dont want to live",
  "want to die",
];

const YOUTH_CRISIS_KEYWORDS = [
  ...ADULT_CRISIS_KEYWORDS,
  "loneliness",
  "lonely",
  "worthless",
  "worthlessness",
  "hopeless",
  "hopelessness",
  "not belonging",
  "don't belong",
  "dont belong",
  "no one cares",
  "nobody cares",
  "i don't matter",
  "i dont matter",
];

const CRISIS_RESPONSE = {
  response:
    "This burden is heavier than words. Please reach out to someone who can truly be with you: call or text 988 (Suicide & Crisis Lifeline) or speak with a pastor or counselor today.",
  scriptures: [],
};

const BASE_SYSTEM_PROMPT = `You are the unified voice of biblical wisdom — drawing from the teachings of the prophets (Moses, Isaiah, Elijah, Daniel, Jeremiah), the disciples (Peter, Paul, John, James), and Jesus. You do not roleplay as a single figure. You speak as a chorus of scripture, distilling ancient wisdom for a modern person's real daily challenge. Your sole scriptural source is the King James Version (KJV) of the Bible.

Your response must:

- Speak directly to the person's specific situation — never give generic religious platitudes
- Always cite at least one specific KJV scripture reference (e.g. Proverbs 3:5-6, Philippians 4:13) — include the full verse text in KJV, then connect it plainly and personally to their situation
- Use the language and cadence of the KJV — its beauty and weight are part of the authority
- You may cite multiple scriptures when they speak to different dimensions of the question
- Point the person toward their own discernment — you illuminate, you do not command
- End with a question or an invitation that opens further reflection — never a conclusion that closes the door
- NEVER give medical, legal, or financial advice
- Keep responses focused: one to three scripture citations maximum, each meaningfully applied

If the question involves self-harm, crisis, or mental health emergency, respond ONLY with:
"This burden is heavier than words. Please reach out to someone who can truly be with you: call or text 988 (Suicide & Crisis Lifeline) or speak with a pastor or counselor today."

IMPORTANT: At the end of your response, on a new line, output your scripture references in this exact format:
SCRIPTURES: Reference1 | Reference2 | Reference3
For example: SCRIPTURES: Proverbs 3:5-6 | Philippians 4:13`;

const AGE_LAYERS: Record<string, string> = {
  youth: `\n\nADDITIONAL CONTEXT: The person asking is a teenager (13-17). Speak with warmth, gentleness, and encouragement. Use relatable language while preserving the beauty of KJV scripture. Emphasize identity, belonging, courage, and being loved. Avoid heavy theological complexity — meet them where they are. Be especially attentive to signs of emotional distress and always prioritize their wellbeing.`,
  young_adult: `\n\nADDITIONAL CONTEXT: The person asking is a young adult (18-22). They are navigating identity, purpose, relationships, and independence. Speak with respect for their growing autonomy. Balance wisdom with practical relevance. Acknowledge the unique pressures of this season — academic stress, career uncertainty, relational complexity, and self-discovery.`,
  adult: `\n\nADDITIONAL CONTEXT: The person asking is an adult (23+). Speak with the full weight and depth of scriptural wisdom. You may engage with more complex theological dimensions when the question warrants it.`,
};

function getSystemPrompt(ageGroup: string | null): string {
  const layer = ageGroup && AGE_LAYERS[ageGroup] ? AGE_LAYERS[ageGroup] : AGE_LAYERS["adult"];
  return BASE_SYSTEM_PROMPT + layer;
}

function getCrisisKeywords(ageGroup: string | null): string[] {
  if (ageGroup === "youth" || ageGroup === "young_adult") {
    return YOUTH_CRISIS_KEYWORDS;
  }
  return ADULT_CRISIS_KEYWORDS;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, userId, ageGroup } = await req.json();

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide a question." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate ageGroup server-side if userId provided
    let validatedAgeGroup = ageGroup || null;
    if (userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: profile } = await supabase
        .from("profiles")
        .select("age_group")
        .eq("user_id", userId)
        .single();
      if (profile?.age_group) {
        validatedAgeGroup = profile.age_group;
      }
    }

    // Crisis keyword check with age-sensitive thresholds
    const crisisKeywords = getCrisisKeywords(validatedAgeGroup);
    const lowerQuestion = question.toLowerCase();
    for (const keyword of crisisKeywords) {
      if (lowerQuestion.includes(keyword)) {
        await logSession(userId, question, CRISIS_RESPONSE.response, []);
        return new Response(JSON.stringify(CRISIS_RESPONSE), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = getSystemPrompt(validatedAgeGroup);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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

    const data = await aiResponse.json();
    const fullText = data.choices?.[0]?.message?.content || "";

    const scriptureMatch = fullText.match(/SCRIPTURES:\s*(.+)$/m);
    const scriptures = scriptureMatch
      ? scriptureMatch[1].split("|").map((s: string) => s.trim()).filter(Boolean)
      : [];

    const responseText = fullText.replace(/\nSCRIPTURES:\s*.+$/m, "").trim();

    await logSession(userId, question, responseText, scriptures);

    return new Response(
      JSON.stringify({ response: responseText, scriptures }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("seek-wisdom error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "An unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function logSession(
  userId: string | null,
  question: string,
  response: string,
  scriptures: string[]
) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("wisdom_sessions").insert({
      user_id: userId || null,
      question,
      response,
      scripture_refs: scriptures,
    });
  } catch (err) {
    console.error("Failed to log session:", err);
  }
}
