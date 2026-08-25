import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_BASE = "https://dabarbible.com";
const FROM = "Mike Clarke <mike@dabarbible.com>";
const REPLY_TO = "admin@inbound.dabarbible.com";

const DAY = 86400_000;
const STEPS = [7, 14, 30] as const; // days silent
const GRACE_DAYS = 3;               // window width around each step
const MAX_SILENT_DAYS = 45;
const BATCH_LIMIT = 40;
const EXPLORE_RATE = 0.25;

type Variant = { key: string; subject: string };

// Warmth, never urgency. No "last chance", no countdowns.
const SUBJECT_VARIANTS: Variant[] = [
  { key: "was_powerful", subject: "Your last reflection stayed with me" },
  { key: "what_since", subject: "What's God shown you since?" },
  { key: "your_words", subject: "Something you wrote" },
  { key: "thinking_of_you", subject: "Thinking of you today" },
];

function truncate(text: string, max = 320) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function returnLink(logId: string) {
  return `${PUBLIC_BASE}/?resume=1&src=recall&r=${logId}`;
}

function renderHtml(firstName: string, quote: string, logId: string) {
  return `<div style="font-family:Georgia,serif;color:#0F0D0A;max-width:560px">
<p>Hi ${firstName},</p>
<p style="color:#4a4438">I was thinking about something you wrote in DABAR.</p>
<blockquote style="border-left:4px solid #C4973A;margin:24px 0;padding:8px 0 8px 18px;font-style:italic;font-size:17px;line-height:28px;color:#2b261d">
You wrote: &ldquo;${quote}&rdquo;
</blockquote>
<p style="color:#4a4438">That was honest. So here's the only question I have:</p>
<p style="font-style:italic;color:#6b5a2e;font-size:18px">What's God shown you since?</p>
<p><a href="${returnLink(logId)}" style="display:inline-block;background:#C4973A;color:#0F0D0A;text-decoration:none;padding:12px 24px;border-radius:6px;font-family:Helvetica,Arial,sans-serif;font-weight:bold">Pick it back up &rarr;</a></p>
<p style="color:#4a4438">No pressure at all — if now isn't the time, that's completely fine. You can also just reply to this email.</p>
<p>Mike</p>
<hr>
<p style="font-size:12px;color:#666;font-family:Helvetica,Arial,sans-serif">You're receiving this because you have a DABAR account. <a href="${PUBLIC_BASE}/unsubscribe">Unsubscribe</a>. DABAR.</p>
</div>`;
}

function renderText(firstName: string, quote: string, logId: string) {
  return `Hi ${firstName},

I was thinking about something you wrote in DABAR.

You wrote: "${quote}"

That was honest. So here's the only question I have:

What's God shown you since?

Pick it back up: ${returnLink(logId)}

No pressure at all — if now isn't the time, that's completely fine. You can also just reply to this email.

Mike
--
Unsubscribe: ${PUBLIC_BASE}/unsubscribe`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY missing" }, 500);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const provided = req.headers.get("x-cron-secret");
  const { data: secret } = await supabase.rpc("get_cron_shared_secret");
  if (!secret) return json({ error: "cron_shared_secret not configured" }, 500);
  if (provided !== secret) return json({ error: "Unauthorized" }, 401);

  try {
    const now = Date.now();

    // ── 1. Mark returns on prior sends ──────────────────────────
    const { data: openSends } = await supabase
      .from("reflection_recall_log")
      .select("id, user_id, sent_at")
      .is("returned_at", null)
      .gte("sent_at", new Date(now - 45 * DAY).toISOString());

    let returns = 0;
    for (const s of openSends ?? []) {
      const [{ count: sessions }, { count: entries }] = await Promise.all([
        supabase.from("wisdom_sessions").select("id", { count: "exact", head: true })
          .eq("user_id", s.user_id).gt("created_at", s.sent_at),
        supabase.from("reflection_entries").select("id", { count: "exact", head: true })
          .eq("user_id", s.user_id).gt("created_at", s.sent_at),
      ]);
      if ((sessions ?? 0) > 0 || (entries ?? 0) > 0) {
        await supabase.from("reflection_recall_log")
          .update({ returned_at: new Date().toISOString() }).eq("id", s.id);
        returns++;
      }
    }

    // ── 2. Subject-line selection (epsilon-greedy on return rate) ─
    const { data: history } = await supabase
      .from("reflection_recall_log")
      .select("variant, returned_at")
      .gte("sent_at", new Date(now - 90 * DAY).toISOString());

    const stats = new Map<string, { sent: number; returned: number }>();
    for (const row of history ?? []) {
      const s = stats.get(row.variant) ?? { sent: 0, returned: 0 };
      s.sent++;
      if (row.returned_at) s.returned++;
      stats.set(row.variant, s);
    }
    const untried = SUBJECT_VARIANTS.filter((v) => (stats.get(v.key)?.sent ?? 0) < 15);
    let best = SUBJECT_VARIANTS[0];
    let bestRate = -1;
    for (const v of SUBJECT_VARIANTS) {
      const s = stats.get(v.key);
      if (!s || s.sent < 15) continue;
      const rate = s.returned / s.sent;
      if (rate > bestRate) { bestRate = rate; best = v; }
    }
    const pickVariant = (): Variant => {
      if (untried.length) return untried[Math.floor(Math.random() * untried.length)];
      if (Math.random() < EXPLORE_RATE) {
        return SUBJECT_VARIANTS[Math.floor(Math.random() * SUBJECT_VARIANTS.length)];
      }
      return best;
    };

    // ── 3. Candidates: accounts old enough to have gone quiet ───
    const { data: candidates, error: candErr } = await supabase
      .from("profiles")
      .select("user_id")
      .lte("created_at", new Date(now - STEPS[0] * DAY).toISOString())
      .limit(500);
    if (candErr) return json({ error: candErr.message }, 500);

    // Steps already sent, per user.
    const { data: priorSends } = await supabase
      .from("reflection_recall_log")
      .select("user_id, step");
    const sentSteps = new Map<string, Set<number>>();
    for (const r of priorSends ?? []) {
      const set = sentSteps.get(r.user_id) ?? new Set<number>();
      set.add(r.step);
      sentSteps.set(r.user_id, set);
    }

    let sent = 0;
    let scanned = 0;

    for (const p of candidates ?? []) {
      if (sent >= BATCH_LIMIT) break;
      scanned++;

      // Most recent reflection (preferred quote source) and most recent session.
      const [entryRes, sessionRes] = await Promise.all([
        supabase.from("reflection_entries")
          .select("id, body, created_at")
          .eq("user_id", p.user_id).is("deleted_at", null)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("wisdom_sessions")
          .select("id, question, created_at")
          .eq("user_id", p.user_id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const entry = entryRes.data;
      const session = sessionRes.data;

      // Needs words of their own to quote back.
      const rawQuote = (entry?.body ?? "").trim() || (session?.question ?? "").trim();
      if (rawQuote.length < 40) continue;

      const lastActivity = Math.max(
        entry?.created_at ? new Date(entry.created_at).getTime() : 0,
        session?.created_at ? new Date(session.created_at).getTime() : 0,
      );
      if (!lastActivity) continue;

      const daysSilent = Math.floor((now - lastActivity) / DAY);
      if (daysSilent > MAX_SILENT_DAYS) continue;

      const already = sentSteps.get(p.user_id) ?? new Set<number>();
      const step = STEPS.find(
        (s) => !already.has(s) && daysSilent >= s && daysSilent < s + GRACE_DAYS,
      );
      if (!step) continue;

      const { data: userData } = await supabase.auth.admin.getUserById(p.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      const { data: suppressed } = await supabase
        .from("suppressed_emails").select("id").eq("email", email).maybeSingle();
      if (suppressed) continue;

      const firstName =
        (userData.user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
        email.split("@")[0];

      const variant = pickVariant();
      const quote = truncate(rawQuote);
      const sourceKind = entry?.body?.trim() ? "reflection" : "session";

      const { data: logRow, error: logErr } = await supabase
        .from("reflection_recall_log")
        .insert({
          user_id: p.user_id,
          step,
          variant: variant.key,
          subject: variant.subject,
          source_kind: sourceKind,
          source_id: sourceKind === "reflection" ? entry?.id ?? null : session?.id ?? null,
          days_silent: daysSilent,
        })
        .select("id")
        .single();
      if (logErr || !logRow) {
        console.error("recall log insert failed:", logErr?.message);
        continue;
      }
      already.add(step);
      sentSteps.set(p.user_id, already);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: email,
          reply_to: REPLY_TO,
          subject: variant.subject,
          html: renderHtml(firstName, quote, logRow.id),
          text: renderText(firstName, quote, logRow.id),
        }),
      });

      if (!res.ok) {
        console.error(`recall send failed for ${email}:`, await res.text());
        await supabase.from("reflection_recall_log").delete().eq("id", logRow.id);
        continue;
      }
      sent++;
    }

    return json({ success: true, sent, returns_marked: returns, scanned });
  } catch (err) {
    console.error("reflection-recall error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
