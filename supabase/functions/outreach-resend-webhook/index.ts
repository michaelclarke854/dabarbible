import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifySvixSignature } from '../_shared/verify-svix.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-signature, svix-timestamp',
};

// ── New: admin inbox forwarding (added alongside the pastoral-reply pipeline below) ──
// Mail to this address is NOT a pastoral outreach reply — skip classification entirely
// and just forward the real message to Mike's real inbox.
const ADMIN_INBOUND_ADDRESS = 'admin@inbound.dabarbible.com';
const ADMIN_FORWARD_TO = 'michaelclarke854@gmail.com';
const ADMIN_FORWARD_FROM = 'DABAR <mike@dabarbible.com>';

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

// email.received webhooks only carry metadata (from/to/subject/email_id) — the body
// has to be fetched separately via the Received Emails API.
async function fetchFullReceivedEmail(emailId: string, resendKey: string) {
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${resendKey}` },
  });
  if (!res.ok) throw new Error(`fetch_full_email_failed:${res.status}:${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function forwardAdminEmail(
  emailId: string,
  resendKey: string | undefined,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (!resendKey) {
    console.error('[admin-forward] RESEND_API_KEY missing');
    return new Response('Server misconfigured', { status: 500, headers: corsHeaders });
  }

  try {
    const full = await fetchFullReceivedEmail(emailId, resendKey);
    const from = String(full.from ?? 'unknown sender');
    const to = Array.isArray(full.to) ? full.to.join(', ') : String(full.to ?? '');
    const subject = String(full.subject ?? '(no subject)');
    const bodyHtml = (full.html as string) ?? `<pre>${escapeHtml(String(full.text ?? '(no content)'))}</pre>`;

    const forwardHtml = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1a1a">
<p style="font-size:13px;color:#666;margin:0 0 4px 0">Forwarded from ${ADMIN_INBOUND_ADDRESS}</p>
<p style="font-size:13px;color:#666;margin:0 0 16px 0">From: ${escapeHtml(from)} &nbsp;·&nbsp; To: ${escapeHtml(to)}</p>
<hr style="border:none;border-top:1px solid #e5e5e5;margin:0 0 16px 0" />
${bodyHtml}
</div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: ADMIN_FORWARD_FROM,
        to: ADMIN_FORWARD_TO,
        reply_to: from,
        subject: `Fwd: ${subject}`,
        html: forwardHtml,
      }),
    });

    if (!res.ok) {
      console.error('[admin-forward] forward send failed:', await res.text());
      return new Response('Forward failed', { status: 502, headers: corsHeaders });
    }

    return new Response('Forwarded', { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('[admin-forward] error:', err);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // ── Startup assertions ──────────────────────────────────────────────────────
  const supabaseUrl    = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey      = Deno.env.get('RESEND_API_KEY');
  const lovableKey     = Deno.env.get('LOVABLE_API_KEY');
  const anthropicKey   = Deno.env.get('ANTHROPIC_API_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response('Server misconfigured', { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── Read raw body once (needed for both signature verification and parsing) ──
  const rawBody = await req.text();

  // ── Svix signature verification — fails closed if secret not set ────────────
  const verification = await verifySvixSignature(req, rawBody);
  if (!verification.ok) {
    console.warn(`[outreach-resend-webhook] Rejected: ${verification.reason}`);
    return new Response(verification.reason, {
      status: verification.status,
      headers: corsHeaders,
    });
  }

  // ── Parse event ─────────────────────────────────────────────────────────────
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  const eventType = String(event.type ?? '');
  const data = (event.data ?? {}) as Record<string, unknown>;

  console.log(`[outreach-resend-webhook] Processing event: ${eventType}`);

  // ── Route by event type ─────────────────────────────────────────────────────

  if ([
    'email.delivered',
    'email.opened',
    'email.clicked',
    'email.bounced',
    'email.complained',
  ].includes(eventType)) {
    return await handleDeliveryEvent(supabase, eventType, data, corsHeaders);
  }

  if (eventType === 'email.received') {
    const toField = data.to;
    const toList = (Array.isArray(toField) ? toField : [toField]).map((t) => String(t ?? '').toLowerCase());

    if (toList.includes(ADMIN_INBOUND_ADDRESS)) {
      const emailId = String(data.email_id ?? '');
      if (!emailId) return new Response('No email_id', { status: 400, headers: corsHeaders });
      return await forwardAdminEmail(emailId, resendKey, corsHeaders);
    }

    return await handleInboundReply(
      supabase, data, resendKey, lovableKey, anthropicKey, corsHeaders,
    );
  }

  console.log(`[outreach-resend-webhook] Ignoring unknown event type: ${eventType}`);
  return new Response('OK', { status: 200, headers: corsHeaders });
});

// ══════════════════════════════════════════════════════════════════════════════
// DELIVERY TRACKING
// ══════════════════════════════════════════════════════════════════════════════

async function handleDeliveryEvent(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  data: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const resendId = String(data.email_id ?? data.message_id ?? data.id ?? '');

  if (!resendId) {
    console.warn('[delivery] No message ID in event data');
    return new Response('No message ID', { status: 400, headers: corsHeaders });
  }

  const now = new Date().toISOString();

  const statusMap: Record<string, string> = {
    'email.delivered':  'delivered',
    'email.opened':     'opened',
    'email.clicked':    'clicked',
    'email.bounced':    'bounced',
    'email.complained': 'bounced',
  };

  const newStatus = statusMap[eventType];

  const updateData: Record<string, string> = { status: newStatus };
  if (eventType === 'email.delivered') updateData.delivered_at = now;
  if (eventType === 'email.opened')    updateData.opened_at    = now;
  if (eventType === 'email.clicked')   updateData.clicked_at   = now;

  await supabase
    .from('outreach_email_log')
    .update(updateData)
    .eq('resend_id', resendId);

  if (eventType === 'email.bounced' || eventType === 'email.complained') {
    const { data: logRow } = await supabase
      .from('outreach_email_log')
      .select('lead_id')
      .eq('resend_id', resendId)
      .maybeSingle();

    if (logRow?.lead_id) {
      await supabase
        .from('pastor_leads')
        .update({ status: 'bounced', suppressed: true })
        .eq('id', logRow.lead_id);

      console.log(`[delivery] Suppressed lead ${logRow.lead_id} due to ${eventType}`);
    }
  }

  return new Response('OK', { status: 200, headers: corsHeaders });
}

// ══════════════════════════════════════════════════════════════════════════════
// INBOUND REPLY HANDLER
// ══════════════════════════════════════════════════════════════════════════════

async function handleInboundReply(
  supabase: ReturnType<typeof createClient>,
  data: Record<string, unknown>,
  resendKey: string | undefined,
  lovableKey: string | undefined,
  anthropicKey: string | undefined,
  corsHeaders: Record<string, string>,
): Promise<Response> {

  const fromRaw     = (data.from ?? '') as string;
  const fromEmail   = fromRaw.includes('<')
    ? fromRaw.match(/<([^>]+)>/u)?.[1]?.toLowerCase().trim() ?? fromRaw.toLowerCase().trim()
    : fromRaw.toLowerCase().trim();
  const fromName    = fromRaw.includes('<')
    ? fromRaw.split('<')[0].trim()
    : '';
  const subject     = String(data.subject ?? '');
  const rawBodyText = String(data.text ?? data.html ?? '').substring(0, 500);

  if (!fromEmail) {
    return new Response('No sender email', { status: 400, headers: corsHeaders });
  }

  const { data: lead } = await supabase
    .from('pastor_leads')
    .select('*')
    .eq('email', fromEmail)
    .maybeSingle();

  const lowerBody = rawBodyText.toLowerCase();
  const lowerSubject = subject.toLowerCase();
  let intent: string;

  if (
    /\b(unsubscribe|opt.?out|remove me|stop emailing|don'?t email|do not email)\b/.test(lowerBody) ||
    /\b(unsubscribe|remove)\b/.test(lowerSubject)
  ) {
    intent = 'opt_out';
  } else {
    intent = await classifyIntent(rawBodyText, subject, lovableKey, anthropicKey);
  }

  console.log(`[inbound] From: ${fromEmail} | Intent: ${intent}`);

  const { data: replyRow } = await supabase
    .from('outreach_reply_log')
    .insert({
      lead_id:      lead?.id ?? null,
      from_email:   fromEmail,
      from_name:    fromName,
      subject,
      body_preview: rawBodyText,
      intent,
      processed:    false,
    })
    .select('id')
    .single();

  // ── OPT OUT ───────────────────────────────────────────────────────────────
  if (intent === 'opt_out') {
    if (lead) {
      await supabase
        .from('pastor_leads')
        .update({ status: 'opted_out', suppressed: true })
        .eq('id', lead.id);
    }

    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Mike at DABAR <mike@dabarbible.com>',
          to:   fromEmail,
          subject: "You've been unsubscribed",
          text: "You've been removed from DABAR outreach emails. You won't hear from us again.\n\nIf this was a mistake, reply to this email.\n\nMike\nDABAR · dabarbible.com",
        }),
      });
    }

    if (replyRow?.id) {
      await supabase.from('outreach_reply_log')
        .update({ processed: true }).eq('id', replyRow.id);
    }

    return new Response('Opt-out processed', { status: 200, headers: corsHeaders });
  }

  // ── INTERESTED or QUESTION ────────────────────────────────────────────────
  if (lead && (intent === 'interested' || intent === 'question')) {
    await supabase
      .from('pastor_leads')
      .update({ status: 'replied', reply_received_at: new Date().toISOString() })
      .eq('id', lead.id);

    const reply = await generateReply(
      lead as Record<string, string>,
      rawBodyText,
      intent,
      lovableKey,
      anthropicKey,
    );

    if (reply && resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Mike at DABAR <mike@dabarbible.com>',
          to:   fromEmail,
          subject: subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`,
          text: reply,
        }),
      });

      if (replyRow?.id) {
        await supabase.from('outreach_reply_log')
          .update({ agent_response_sent: true, processed: true })
          .eq('id', replyRow.id);
      }
    }

    return new Response('Reply sent', { status: 200, headers: corsHeaders });
  }

  // ── NOT NOW ───────────────────────────────────────────────────────────────
  if (lead && intent === 'not_now') {
    const reEnableDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    await supabase
      .from('pastor_leads')
      .update({
        suppressed:     true,
        internal_notes: `Replied "not now" — re-enable after ${reEnableDate}`,
      })
      .eq('id', lead.id);
  }

  if (replyRow?.id) {
    await supabase.from('outreach_reply_log')
      .update({ processed: true }).eq('id', replyRow.id);
  }

  return new Response('Processed', { status: 200, headers: corsHeaders });
}

// ══════════════════════════════════════════════════════════════════════════════
// AI HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const VALID_INTENTS = [
  'interested', 'question', 'not_now',
  'opt_out', 'out_of_office', 'other',
];

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
- interested: they want to know more or try DABAR
- question: they have a specific question about DABAR
- not_now: they say not the right time, too busy, maybe later
- opt_out: they say stop, unsubscribe, remove, no thanks permanently
- out_of_office: automated away message
- other: anything else

Output one word only.`;

  try {
    if (anthropicKey) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 10,
          temperature: 0,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const word = (d.content?.[0]?.text?.trim().toLowerCase() ?? '')
          .replace(/[^a-z_]/g, '');
        if (VALID_INTENTS.includes(word)) return word;
      }
    }

    if (lovableKey) {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 10,
          temperature: 0,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const word = (d.choices?.[0]?.message?.content?.trim().toLowerCase() ?? '')
          .replace(/[^a-z_]/g, '');
        if (VALID_INTENTS.includes(word)) return word;
      }
    }
  } catch (err) {
    console.error('[classify] Intent classification failed:', err);
  }

  return 'other';
}

async function generateReply(
  lead: Record<string, string>,
  replyBody: string,
  intent: string,
  lovableKey: string | undefined,
  anthropicKey: string | undefined,
): Promise<string | null> {
  const systemPrompt = `You write warm, personal reply emails from Mike (founder of DABAR) to pastors who have responded to outreach.

DABAR is a daily Biblical reflection app for congregations. Pastors get a free Community tier — their congregation reflects on scripture daily, DABAR shows the pastor their congregation's spiritual pulse weekly, and generates a draft pastoral message based on those themes.

Pastoral access link: https://dabarbible.com/pastor-access

TONE: Warm, genuine, unhurried. Like a real reply from a founder who cares about ministry. Short — under 100 words. One clear next step: the pastoral access link. No sales language. Plain text only.`;

  const userContent = `Pastor ${lead.pastor_name} at ${lead.church_name} has replied.
Their intent: ${intent}
Their message: "${replyBody.substring(0, 300)}"

Write a warm personal reply. If interested → welcome them and share the pastoral access link. If they have a question → answer it briefly and share the link. Keep it under 100 words. Plain text only.`;

  try {
    if (anthropicKey) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 300,
          temperature: 0.5,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
        }),
      });
      if (res.ok) {
        const d = await res.json();
        return d.content?.[0]?.text?.trim() ?? null;
      }
    }

    if (lovableKey) {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userContent },
          ],
          max_tokens: 300,
          temperature: 0.5,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        return d.choices?.[0]?.message?.content?.trim() ?? null;
      }
    }
  } catch (err) {
    console.error('[reply] Reply generation failed:', err);
  }

  return null;
}
