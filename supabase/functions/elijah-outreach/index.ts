import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOOTER = `\n\n—\nMike Clarke\nFounder, DABAR · dabarbible.com\n\nDABAR · 71-75 Shelton Street, Covent Garden, London WC2H 9JQ, United Kingdom\nUnsubscribe: reply with "unsubscribe" and you'll be removed immediately.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!supabaseUrl || !serviceRoleKey || !resendKey) {
    console.error("FATAL: Missing required env vars in elijah-outreach");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ARIA owns DaBar's outreach strategy. Each run we REPORT our recent deliverability to ARIA
  // (so ARIA's directive engine can throttle/pause on real bounces) and PULL the current directive
  // back in the same call. Fail-safe: any error falls back to local outreach_config.
  let ariaDirective: any = null;
  try {
    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: total30 } = await supabase
      .from("outreach_email_log")
      .select("*", { count: "exact", head: true })
      .gte("sent_at", windowStart);
    const { count: bounced30 } = await supabase
      .from("outreach_email_log")
      .select("*", { count: "exact", head: true })
      .eq("status", "bounced")
      .gte("sent_at", windowStart);
    const dr = await fetch("https://bhuprrzltfnthyjvweoc.supabase.co/functions/v1/aria-product-directive", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ingest-token": Deno.env.get("ARIA_HEALTH_TOKEN") ?? "" },
      body: JSON.stringify({
        product_id: "dabar",
        source: "elijah-outreach",
        health: { window_days: 30, total_sends: total30 ?? 0, hard_bounces: bounced30 ?? 0 },
      }),
    });
    if (dr.ok) ariaDirective = (await dr.json()).directive ?? null;
  } catch (_) { /* non-fatal — local outreach_config remains authoritative */ }

  // Circuit breaker
  const { data: pausedConfig } = await supabase
    .from("outreach_config")
    .select("value")
    .eq("key", "sending_paused")
    .single();

  const pausedVal = pausedConfig?.value;
  if (pausedVal === true || pausedVal === "true") {
    console.log("Sending paused — circuit breaker active");
    return new Response(JSON.stringify({ skipped: "sending_paused" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (ariaDirective?.sending_paused === true) {
    console.log("Sending paused by ARIA directive");
    return new Response(JSON.stringify({ skipped: "aria_directive_paused" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Daily send limit
  const { data: limitConfig } = await supabase
    .from("outreach_config")
    .select("value")
    .eq("key", "daily_send_limit")
    .single();

  const dailyLimit = Number(ariaDirective?.daily_send_limit ?? limitConfig?.value ?? 50);
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count: todaySends } = await supabase
    .from("outreach_email_log")
    .select("*", { count: "exact", head: true })
    .gte("sent_at", todayStart.toISOString());

  if ((todaySends ?? 0) >= dailyLimit) {
    console.log(`Daily send limit reached (${todaySends}/${dailyLimit})`);
    return new Response(JSON.stringify({ skipped: "daily_limit_reached" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cadenceDays = Number(ariaDirective?.cadence_days ?? 7);
  const sevenDaysAgo = new Date(Date.now() - cadenceDays * 24 * 60 * 60 * 1000).toISOString();

  let leadsQuery = supabase
    .from("pastor_leads")
    .select("*")
    .eq("suppressed", false)
    .in("status", ["pending", "sent", "delivered"])
    .or(`initial_sent_at.is.null,last_contacted_at.lt.${sevenDaysAgo}`)
    .not("country_code", "is", null)
    .order("created_at", { ascending: true })
    .limit(10);

  const targetCountries = ariaDirective?.targeting?.countries;
  if (Array.isArray(targetCountries) && targetCountries.length > 0) {
    leadsQuery = leadsQuery.in("country_code", targetCountries);
  }
  const targetDenominations = ariaDirective?.targeting?.denominations;
  if (Array.isArray(targetDenominations) && targetDenominations.length > 0) {
    leadsQuery = leadsQuery.in("denomination", targetDenominations);
  }

  const { data: leads, error: leadsErr } = await leadsQuery;

  if (leadsErr) {
    console.error("Failed to load leads:", leadsErr);
    return new Response(JSON.stringify({ error: "Failed to load leads" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!leads || leads.length === 0) {
    return new Response(JSON.stringify({ processed: 0, message: "No leads due" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let failed = 0;

  for (const lead of leads) {
    try {
      const { count: priorSends } = await supabase
        .from("outreach_email_log")
        .select("*", { count: "exact", head: true })
        .eq("lead_id", lead.id);

      const step = (priorSends ?? 0) + 1;

      if (step > Number(ariaDirective?.max_steps ?? 3)) {
        await supabase.from("pastor_leads").update({ suppressed: true }).eq("id", lead.id);
        continue;
      }

      const email = await generateEmail(lead, step, supabase, lovableKey, anthropicKey, ariaDirective?.messaging_angle);
      if (!email) {
        failed++;
        continue;
      }

      const fullBody = email.body + FOOTER;

      const sendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Mike at DABAR <mike@dabarbible.com>",
          to: lead.email,
          subject: email.subject,
          text: fullBody,
          headers: {
            "List-Unsubscribe": "<mailto:unsubscribe@dabarbible.com?subject=unsubscribe>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });

      if (!sendRes.ok) {
        const errBody = await sendRes.text();
        console.error(`Failed to send to ${lead.email} (${sendRes.status}):`, errBody);
        if (sendRes.status === 422) {
          await supabase
            .from("pastor_leads")
            .update({ status: "bounced", suppressed: true })
            .eq("id", lead.id);
        }
        failed++;
        continue;
      }

      const sendData = await sendRes.json();

      await supabase.from("outreach_email_log").insert({
        lead_id: lead.id,
        sequence_step: step,
        subject: email.subject,
        body_preview: email.body.substring(0, 200),
        resend_id: sendData.id,
        status: "sent",
      });

      const now = new Date().toISOString();
      await supabase
        .from("pastor_leads")
        .update({
          status: step === 1 ? "sent" : "delivered",
          initial_sent_at: lead.initial_sent_at ?? now,
          last_contacted_at: now,
        })
        .eq("id", lead.id);

      sent++;
    } catch (err) {
      console.error(`Error processing lead ${lead.id}:`, err);
      failed++;
    }
  }

  console.log(`ELIJAH run complete: ${sent} sent, ${failed} failed`);
  return new Response(JSON.stringify({ sent, failed }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// ── Email generation ─────────────────────────────────

const DENOM_CONTEXT: Record<string, string> = {
  evangelical: "Use scripture-forward language. Reference daily devotional practice.",
  baptist: "Emphasise scripture authority and personal faith journey.",
  methodist: "Reference Wesleyan themes of sanctification and spiritual formation.",
  pentecostal: "Warm, Spirit-led language. Reference prayer and hearing from God.",
  catholic: "Reference lectio divina, Ignatian contemplation, spiritual direction.",
  anglican: "Reference the Daily Office, contemplative prayer tradition.",
  presbyterian: "Emphasise scripture, Reformed spirituality, covenant community.",
  other: "Warm, broadly evangelical language. Focus on scripture and prayer.",
};

const STEP_CONTEXT: Record<number, string> = {
  1: "First contact — warm introduction. Goal: curiosity + free trial offer.",
  2: "Follow-up — they received the first email. No reply yet. Goal: gentle re-engagement, different angle.",
  3: "Final touch — close the loop graciously. Goal: low-pressure last invitation.",
};

function applyMergeFields(
  text: string,
  lead: Record<string, any>,
  firstName: string,
): string {
  return text
    .replace(/\{\{pastor_name\}\}/g, lead.pastor_name ?? "Pastor")
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{church_name\}\}/g, lead.church_name ?? "your church")
    .replace(/\{\{denomination\}\}/g, lead.denomination ?? "");
}

async function generateEmail(
  lead: Record<string, any>,
  step: number,
  supabase: ReturnType<typeof createClient>,
  lovableKey: string | undefined,
  anthropicKey: string | undefined,
  messagingAngle?: string,
): Promise<{ subject: string; body: string } | null> {
  const denomination = ((lead.denomination as string) ?? "default").toLowerCase();

  // Try denomination-specific template first; fall back to default for this step.
  // Sort by denomination ASC so non-default sorts before "default" only when matched explicitly.
  // Safer: query both candidates and pick the non-default if present.
  const { data: templates } = await supabase
    .from("email_templates")
    .select("subject, body, denomination")
    .eq("step", step)
    .eq("is_active", true)
    .in("denomination", [denomination, "default"]);

  const template =
    templates?.find((t: any) => t.denomination === denomination) ??
    templates?.find((t: any) => t.denomination === "default");

  if (template) {
    const firstName =
      (lead.pastor_name as string)?.split(" ")[0] ?? lead.pastor_name ?? "Pastor";
    return {
      subject: applyMergeFields(template.subject, lead, firstName),
      body: applyMergeFields(template.body, lead, firstName),
    };
  }

  console.warn(
    `No template found for step ${step} denomination ${denomination} — falling back to AI`,
  );
  return await generateEmailViaAI(lead, step, lovableKey, anthropicKey, messagingAngle);
}

async function generateEmailViaAI(
  lead: Record<string, any>,
  step: number,
  lovableKey: string | undefined,
  anthropicKey: string | undefined,
  messagingAngle?: string,
): Promise<{ subject: string; body: string } | null> {
  const denom = (lead.denomination as string) ?? "other";
  const denomContext = DENOM_CONTEXT[denom] ?? DENOM_CONTEXT.other;
  const stepContext = STEP_CONTEXT[step] ?? "Follow-up";

  let systemPrompt = `You write short, warm, personal outreach emails from Mike (founder of DABAR) to pastors.

DABAR is a daily Biblical reflection app — members ask any spiritual question and receive scripture-grounded responses. Pastors can lead a Community of up to 50 congregation members, see their congregation's spiritual pulse weekly, and send a pastoral word that DABAR helps draft.

TONE RULES — non-negotiable:
- Warm and personal, like a letter from a fellow believer — NOT a sales email
- Never use: "AI-powered", "cutting-edge", "revolutionize", "supercharge", or any tech/startup language
- Never imply DABAR replaces the pastor — it supports their ministry
- Never pressure or create urgency — faith communities distrust it immediately
- One clear, gentle CTA: try it free for 30 days at https://dabarbible.com/pastor-access
- Under 120 words total
- Plain text only — no bullet points, no bold, no headers
- End with a scripture-adjacent closing that fits the denomination

PROHIBITED phrases: "game-changer", "unlock", "leverage", "synergy", "AI tool", "platform", "users", "convert"

Output ONLY valid JSON with fields: subject (under 50 chars), body (plain text, under 120 words). No markdown, no code fences.`;

  if (typeof messagingAngle === "string" && messagingAngle.length > 0) {
    systemPrompt += `\n\nARIA STRATEGY DIRECTIVE (follow this angle): ${messagingAngle}`;
  }

  const userContent = `Write step ${step} of 3 outreach email to:
Pastor: ${lead.pastor_name}
Church: ${lead.church_name}
Denomination: ${denom}
Country: ${lead.country_code}
Language: ${lead.language}
Church size: ${lead.church_size ?? "medium"}

Denominational context to reflect: ${denomContext}
Step context: ${stepContext}

For step 1: reference their specific church/denomination context naturally.
For step 2: acknowledge they may be busy, come from a completely different angle.
For step 3: close the loop graciously — no hard sell, leave door open.`;

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
          max_tokens: 400,
          temperature: 0.6,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text?.trim() ?? "";
        const parsed = parseEmailJSON(text);
        if (parsed) return parsed;
      } else if (![402, 429, 401, 403].includes(res.status)) {
        console.warn(`Claude returned ${res.status}, falling back`);
      } else {
        console.warn(`Claude returned ${res.status} — falling back to Lovable AI`);
      }
    }

    if (!lovableKey) {
      console.error("No Lovable AI key for fallback");
      return null;
    }

    const fallbackRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 400,
        temperature: 0.6,
      }),
    });

    if (!fallbackRes.ok) {
      console.error("Lovable AI fallback failed:", fallbackRes.status);
      return null;
    }

    const fallbackData = await fallbackRes.json();
    const fallbackText = fallbackData.choices?.[0]?.message?.content?.trim() ?? "";
    return parseEmailJSON(fallbackText);
  } catch (err) {
    console.error("Email generation failed:", err);
    return null;
  }
}

function parseEmailJSON(text: string): { subject: string; body: string } | null {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (typeof parsed.subject === "string" && typeof parsed.body === "string") {
      return { subject: parsed.subject.substring(0, 80), body: parsed.body };
    }
    return null;
  } catch {
    console.error("Failed to parse email JSON:", text.substring(0, 200));
    return null;
  }
}