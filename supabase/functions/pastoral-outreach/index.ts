import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_BASE = "https://dabarbible.com";

type Lead = {
  id: string;
  name: string;
  email: string;
  church_name?: string | null;
  status: string;
  reply_received?: boolean | null;
};

function unsubLink(email: string) {
  return `${PUBLIC_BASE}/unsubscribe?email=${encodeURIComponent(email)}`;
}

const EMAIL_TEMPLATES = {
  initial_outreach: (lead: Lead) => ({
    subject: "Free tool for your congregation's scripture reflection — honest ask",
    html: `<p>Hi ${lead.name},</p>
<p>I built DABAR (<a href="${PUBLIC_BASE}">dabarbible.com</a>) — a scripture reflection app that helps people bring their hardest questions to the Bible and receive responses grounded in the Word.</p>
<p>I'm reaching out to a small group of pastors before any broader launch. Not selling anything. Looking for honest feedback from someone who knows their flock.</p>
<p>Two things I'm asking:</p>
<ol><li>Try it yourself for 5 minutes — ask it something you'd expect a congregant to ask</li>
<li>Tell me if it's theologically trustworthy enough to recommend</li></ol>
<p>If you want, I can set up your whole congregation with free access. You'd see what themes they're exploring — without seeing individual questions — via a pastor dashboard built for exactly this.</p>
<p>Straight link: <a href="${PUBLIC_BASE}">dabarbible.com</a><br/>
Doctrinal statement: <a href="${PUBLIC_BASE}/doctrine">dabarbible.com/doctrine</a></p>
<p>No pitch deck. No follow-up sequence if you're not interested. Just honest feedback.</p>
<p>Mike Clarke<br/>Founder, DABAR<br/>mike@dabarbible.com</p>
<hr/>
<p style="font-size:12px;color:#666">You're receiving this because I found your church online and thought DABAR might be genuinely useful. To unsubscribe: <a href="${unsubLink(lead.email)}">unsubscribe</a>. DABAR.</p>`,
  }),

  follow_up_1: (lead: Lead) => ({
    subject: "Re: DABAR — quick follow-up",
    html: `<p>Hi ${lead.name},</p>
<p>Following up on my note from last week about DABAR.</p>
<p>One thing I wanted to add: the pastor dashboard shows you the top themes your congregation is exploring in scripture — grief, forgiveness, purpose, doubt — without surfacing individual questions. It's designed to help you see what your flock is sitting with spiritually.</p>
<p>If now isn't a good time, no worries at all. But if you'd like to try it or have a quick conversation, I'm easy to reach.</p>
<p>Mike<br/><a href="${PUBLIC_BASE}">dabarbible.com</a></p>
<hr/>
<p style="font-size:12px;color:#666"><a href="${unsubLink(lead.email)}">Unsubscribe</a></p>`,
  }),

  follow_up_2: (lead: Lead) => ({
    subject: "DABAR — last note",
    html: `<p>Hi ${lead.name},</p>
<p>Last note from me on this.</p>
<p>If DABAR isn't a fit for your congregation right now, completely understood. I'll stop here.</p>
<p>If you ever want to revisit, <a href="${PUBLIC_BASE}">dabarbible.com</a> is always there. The doctrinal statement is at <a href="${PUBLIC_BASE}/doctrine">dabarbible.com/doctrine</a>.</p>
<p>God bless your ministry.</p>
<p>Mike</p>
<hr/>
<p style="font-size:12px;color:#666"><a href="${unsubLink(lead.email)}">Unsubscribe</a></p>`,
  }),
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!RESEND_API_KEY) {
    console.error("FATAL: RESEND_API_KEY not set");
    return json({ error: "Server misconfigured" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "run_cadence";

    // ── ACTION: run_cadence ──────────────────────
    if (action === "run_cadence") {
      const now = new Date().toISOString();

      const { data: dueLeads } = await supabase
        .from("pastoral_leads")
        .select("*")
        .lte("next_contact_at", now)
        .not("status", "in", '("unsubscribed","endorsed","referring","replied")')
        .limit(20);

      const { data: newLeads } = await supabase
        .from("pastoral_leads")
        .select("*")
        .eq("status", "identified")
        .is("last_contacted_at", null)
        .is("next_contact_at", null)
        .limit(10);

      const seen = new Set<string>();
      const toProcess: Lead[] = [];
      for (const l of [...(dueLeads ?? []), ...(newLeads ?? [])]) {
        if (!seen.has(l.id)) {
          seen.add(l.id);
          toProcess.push(l as Lead);
        }
      }

      let sent = 0;

      for (const lead of toProcess) {
        const { data: log } = await supabase
          .from("pastoral_outreach_log")
          .select("email_type")
          .eq("lead_id", lead.id)
          .order("sent_at", { ascending: false });

        const sentTypes = log?.map((l: { email_type: string }) => l.email_type) ?? [];
        let emailType: keyof typeof EMAIL_TEMPLATES;

        if (sentTypes.length === 0) {
          emailType = "initial_outreach";
        } else if (!sentTypes.includes("follow_up_1")) {
          emailType = "follow_up_1";
        } else if (!sentTypes.includes("follow_up_2")) {
          emailType = "follow_up_2";
        } else {
          if (!lead.reply_received) {
            await supabase
              .from("pastoral_leads")
              .update({ status: "unsubscribed", next_contact_at: null })
              .eq("id", lead.id);
          }
          continue;
        }

        const template = EMAIL_TEMPLATES[emailType](lead);

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Mike Clarke <mike@dabarbible.com>",
            to: lead.email,
            subject: template.subject,
            html: template.html,
          }),
        });

        if (!resendRes.ok) {
          console.error(`Resend error for ${lead.email}:`, await resendRes.text());
          continue;
        }

        const resendData = await resendRes.json();

        await supabase.from("pastoral_outreach_log").insert({
          lead_id: lead.id,
          email_type: emailType,
          subject: template.subject,
          resend_id: resendData.id,
        });

        const nextContactDays =
          emailType === "initial_outreach" ? 7 : emailType === "follow_up_1" ? 7 : null;
        const nextContact = nextContactDays
          ? new Date(Date.now() + nextContactDays * 24 * 60 * 60 * 1000).toISOString()
          : null;

        await supabase
          .from("pastoral_leads")
          .update({
            status: emailType === "initial_outreach" ? "emailed" : lead.status,
            last_contacted_at: now,
            next_contact_at: nextContact,
          })
          .eq("id", lead.id);

        sent++;
      }

      return json({ success: true, sent, processed: toProcess.length });
    }

    // ── ACTION: add_lead ──────────────────────
    if (action === "add_lead") {
      const { name, email, church_name, city, state, denomination, church_size } = body;
      if (!name || !email) return json({ error: "name and email required" }, 400);

      const { data, error } = await supabase
        .from("pastoral_leads")
        .insert({
          name,
          email,
          church_name,
          city,
          state,
          denomination,
          church_size,
          next_contact_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);
      return json({ lead: data });
    }

    // ── ACTION: mark_replied ──────────────────────
    if (action === "mark_replied") {
      const { lead_id } = body;
      if (!lead_id) return json({ error: "lead_id required" }, 400);
      await supabase
        .from("pastoral_leads")
        .update({ reply_received: true, status: "replied", next_contact_at: null })
        .eq("id", lead_id);
      return json({ success: true });
    }

    // ── ACTION: unsubscribe (public) ──────────────────────
    if (action === "unsubscribe") {
      const { email } = body;
      if (!email) return json({ error: "email required" }, 400);
      const { error } = await supabase
        .from("pastoral_leads")
        .update({ status: "unsubscribed", next_contact_at: null })
        .eq("email", email.toLowerCase().trim());
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("pastoral-outreach error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});