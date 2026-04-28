import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let payload: Record<string, any>;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid payload", { status: 400, headers: corsHeaders });
  }

  // Resend inbound: payload may be { type, data: {...} } or flat
  const data = payload.data ?? payload;

  const fromEmailRaw =
    data.from?.email ??
    data.from ??
    data.sender ??
    payload.from ??
    "";
  const fromEmail = String(fromEmailRaw).toLowerCase().trim();
  const fromName = data.from?.name ?? data.from_name ?? payload.from_name ?? "";
  const subject = data.subject ?? payload.subject ?? "";
  const rawBody = (data.text ?? data.html ?? payload.text ?? payload.html ?? "") as string;
  const body = String(rawBody).substring(0, 500);

  if (!fromEmail) {
    return new Response("No sender email", { status: 400, headers: corsHeaders });
  }

  const { data: lead } = await supabase
    .from("pastor_leads")
    .select("*")
    .eq("email", fromEmail)
    .maybeSingle();

  // Quick keyword opt-out check before AI call
  const lowerBody = body.toLowerCase();
  let intent: string;
  if (
    /\b(unsubscribe|opt.?out|remove me|stop emailing|don'?t email|do not email)\b/.test(lowerBody) ||
    /\b(unsubscribe|remove)\b/.test(String(subject).toLowerCase())
  ) {
    intent = "opt_out";
  } else {
    intent = await classifyIntent(body, subject, lovableKey, anthropicKey);
  }

  const { data: replyRow } = await supabase
    .from("outreach_reply_log")
    .insert({
      lead_id: lead?.id ?? null,
      from_email: fromEmail,
      from_name: fromName,
      subject,
      body_preview: body,
      intent,
      processed: false,
    })
    .select("id")
    .single();

  // Opt-out: process immediately
  if (intent === "opt_out") {
    if (lead) {
      await supabase
        .from("pastor_leads")
        .update({ status: "opted_out", suppressed: true })
        .eq("id", lead.id);
    }
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Mike at DABAR <mike@dabarbible.com>",
          to: fromEmail,
          subject: "You've been unsubscribed",
          text: `You've been removed from DABAR outreach emails. You won't hear from us again.\n\nIf this was a mistake, reply to this email.\n\nMike\nDABAR · dabarbible.com`,
        }),
      });
    }
    if (replyRow?.id) {
      await supabase
        .from("outreach_reply_log")
        .update({ processed: true })
        .eq("id", replyRow.id);
    }
    return new Response("Opt-out processed", { status: 200, headers: corsHeaders });
  }

  // Interested / question: send warm reply with pastoral access link
  if (lead && (intent === "interested" || intent === "question")) {
    await supabase
      .from("pastor_leads")
      .update({ status: "replied", reply_received_at: new Date().toISOString() })
      .eq("id", lead.id);

    const response = await generateReply(lead, body, intent, lovableKey, anthropicKey);
    if (response && resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Mike at DABAR <mike@dabarbible.com>",
          to: fromEmail,
          subject: subject?.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`,
          text: response,
        }),
      });

      if (replyRow?.id) {
        await supabase
          .from("outreach_reply_log")
          .update({ agent_response_sent: true, processed: true })
          .eq("id", replyRow.id);
      }
      return new Response("Reply sent", { status: 200, headers: corsHeaders });
    }
  }

  // Not now: suppress with note
  if (lead && intent === "not_now") {
    const reEnableDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    await supabase
      .from("pastor_leads")
      .update({
        suppressed: true,
        internal_notes: `Replied "not now" — re-enable after ${reEnableDate}`,
      })
      .eq("id", lead.id);
  }

  if (replyRow?.id) {
    await supabase
      .from("outreach_reply_log")
      .update({ processed: true })
      .eq("id", replyRow.id);
  }

  return new Response("Processed", { status: 200, headers: corsHeaders });
});

const VALID_INTENTS = ["interested", "question", "not_now", "opt_out", "out_of_office", "other"];

async function classifyIntent(
  body: string,
  subject: string,
  lovableKey: string | undefined,
  anthropicKey: string | undefined,
): Promise<string> {
  const prompt = `Classify this email reply intent. Output ONLY one of these words:
interested | question | not_now | opt_out | out_of_office | other

Email subject: "${subject}"
Email body (first 300 chars): "${body.substring(0, 300)}"

Rules:
- interested: they want to know more or try it
- question: they have a specific question about DABAR
- not_now: they say not the right time, too busy, maybe later
- opt_out: they say stop, unsubscribe, remove, no thanks permanently
- out_of_office: automated away message
- other: anything else

Output one word only.`;

  try {
    if (anthropicKey) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 10,
          temperature: 0,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const word = (data.content?.[0]?.text?.trim().toLowerCase() ?? "").replace(/[^a-z_]/g, "");
        if (VALID_INTENTS.includes(word)) return word;
      }
    }

    if (lovableKey) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 10,
          temperature: 0,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const word = (data.choices?.[0]?.message?.content?.trim().toLowerCase() ?? "").replace(/[^a-z_]/g, "");
        if (VALID_INTENTS.includes(word)) return word;
      }
    }
  } catch (err) {
    console.error("Intent classification failed:", err);
  }

  return "other";
}

async function generateReply(
  lead: Record<string, any>,
  replyBody: string,
  intent: string,
  lovableKey: string | undefined,
  anthropicKey: string | undefined,
): Promise<string | null> {
  const systemPrompt = `You write warm, personal reply emails from Mike (founder of DABAR) to pastors who have responded to outreach.

DABAR is a daily Biblical reflection app for congregations. Pastors get a free Community tier — their congregation reflects on scripture daily, DABAR shows the pastor their congregation's spiritual pulse weekly, and generates a draft pastoral message based on those themes.

Pastoral access link: https://dabarbible.com/pastor-access

TONE: Warm, genuine, unhurried. Like a real reply from a founder who cares about ministry. Short — under 100 words. One clear next step: the pastoral access link. No sales language.`;

  const userContent = `Pastor ${lead.pastor_name} at ${lead.church_name} has replied.
Their intent: ${intent}
Their message: "${replyBody.substring(0, 300)}"

Write a warm personal reply. If interested → welcome them and share the pastoral access link. If they have a question → answer it briefly and share the link. Keep it under 100 words. Plain text only.`;

  try {
    if (anthropicKey) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 300,
          temperature: 0.5,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.content?.[0]?.text?.trim() ?? null;
      }
    }

    if (lovableKey) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          max_tokens: 300,
          temperature: 0.5,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() ?? null;
      }
    }
  } catch (err) {
    console.error("Reply generation failed:", err);
  }

  return null;
}