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

    // Parse [SCRIPTURE] blocks
    const scriptureBlocks: { reference: string; text: string }[] = [];
    const scriptureRegex = /\[SCRIPTURE\]\s*\nreference:\s*(.+)\ntext:\s*(.+)\n\[\/SCRIPTURE\]/g;
    let match;
    while ((match = scriptureRegex.exec(fullText)) !== null) {
      scriptureBlocks.push({ reference: match[1].trim(), text: match[2].trim() });
    }
    const scriptures = scriptureBlocks.map((s) => s.reference);

    // Remove [SCRIPTURE] blocks from response text for clean storage, but keep inline
    const responseText = fullText.trim();

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
