import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import verses from "../daily-verse/daily-verses.json" with { type: "json" };

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
const SILENT_DAYS = 5;          // silent for at least this long
const MAX_SILENT_DAYS = 45;     // don't chase truly cold users forever
const MIN_ACTIVITY_SPAN_DAYS = 7; // had 7+ days of prior activity
const COOLDOWN_DAYS = 60;       // at most one win-back per user per cooldown
const BATCH_LIMIT = 40;         // bounded work per run
const EXPLORE_RATE = 0.25;      // epsilon-greedy subject-line optimisation

type Variant = { key: string; subject: string };

const SUBJECT_VARIANTS: Variant[] = [
  { key: "checking_in", subject: "Just checking in" },
  { key: "passage_waiting", subject: "Today's passage, if you'd like to return" },
  { key: "no_pressure", subject: "No pressure — a verse for you" },
  { key: "still_here", subject: "We're still here when you are" },
];

type Verse = { day: number; ref: string; text: string; prompt: string };

function verseForToday(): Verse {
  const list = verses as Verse[];
  const dayOfYear = Math.floor(
    (Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / DAY,
  );
  return list[dayOfYear % list.length];
}

function resumeLink(logId: string) {
  return `${PUBLIC_BASE}/?resume=1&src=winback&w=${logId}`;
}

function renderHtml(v: Verse, firstName: string, logId: string) {
  return `<div style="font-family:Georgia,serif;color:#0F0D0A;max-width:560px">
<p>Hi ${firstName},</p>
<p style="color:#4a4438">We noticed you haven't reflected in a few days — no pressure, just checking in. Here's today's passage if you'd like to return.</p>
<blockquote style="border-left:4px solid #C4973A;margin:24px 0;padding:8px 0 8px 18px;font-style:italic;font-size:18px;line-height:28px;color:#2b261d">
${v.text}<br><span style="font-style:normal;font-size:13px;letter-spacing:1px;color:#8a6d24">— ${v.ref} · KJV</span>
</blockquote>
<p style="font-style:italic;color:#6b5a2e;font-size:16px">${v.prompt}</p>
<p><a href="${resumeLink(logId)}" style="display:inline-block;background:#C4973A;color:#0F0D0A;text-decoration:none;padding:12px 24px;border-radius:6px;font-family:Helvetica,Arial,sans-serif;font-weight:bold">Resume reflection &rarr;</a></p>
<p>If something's on your mind, you can just reply to this email.</p>
<p>Mike</p>
<hr>
<p style="font-size:12px;color:#666;font-family:Helvetica,Arial,sans-serif">You're receiving this because you have a DABAR account. <a href="${PUBLIC_BASE}/unsubscribe">Unsubscribe</a>. DABAR.</p>
</div>`;
}

function renderText(v: Verse, firstName: string, logId: string) {
  return `Hi ${firstName},

We noticed you haven't reflected in a few days — no pressure, just checking in. Here's today's passage if you'd like to return.

"${v.text}"
— ${v.ref} (KJV)

${v.prompt}

Resume reflection: ${resumeLink(logId)}

If something's on your mind, just reply to this email.

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

    // ── 1. Mark returns on prior sends ─────────────────────────
    const { data: openSends } = await supabase
      .from("winback_log")
      .select("id, user_id, sent_at")
      .is("returned_at", null)
      .gte("sent_at", new Date(now - 30 * DAY).toISOString());

    let returns = 0;
    for (const s of openSends ?? []) {
      const [{ count: sessions }, { count: entries }] = await Promise.all([
        supabase.from("wisdom_sessions").select("id", { count: "exact", head: true })
          .eq("user_id", s.user_id).gt("created_at", s.sent_at),
        supabase.from("reflection_entries").select("id", { count: "exact", head: true })
          .eq("user_id", s.user_id).gt("created_at", s.sent_at),
      ]);
      if ((sessions ?? 0) > 0 || (entries ?? 0) > 0) {
        await supabase.from("winback_log")
          .update({ returned_at: new Date().toISOString() }).eq("id", s.id);
        returns++;
      }
    }

    // ── 2. Pick the subject line (epsilon-greedy on return rate) ─
    const { data: history } = await supabase
      .from("winback_log")
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

    // ── 3. Find lapsed users ────────────────────────────────────
    const silentBefore = new Date(now - SILENT_DAYS * DAY).toISOString();
    const activeSince = new Date(now - MAX_SILENT_DAYS * DAY).toISOString();

    const { data: candidates, error: candErr } = await supabase
      .from("profiles")
      .select("user_id, created_at")
      .lte("created_at", new Date(now - (SILENT_DAYS + MIN_ACTIVITY_SPAN_DAYS) * DAY).toISOString())
      .limit(500);

    if (candErr) return json({ error: candErr.message }, 500);

    const { data: recentSends } = await supabase
      .from("winback_log")
      .select("user_id")
      .gte("sent_at", new Date(now - COOLDOWN_DAYS * DAY).toISOString());
    const cooling = new Set((recentSends ?? []).map((r) => r.user_id));

    const verse = verseForToday();
    let sent = 0;
    let scanned = 0;

    for (const p of candidates ?? []) {
      if (sent >= BATCH_LIMIT) break;
      if (cooling.has(p.user_id)) continue;
      scanned++;

      // activity window for this user
      const [first, last] = await Promise.all([
        supabase.from("wisdom_sessions").select("created_at")
          .eq("user_id", p.user_id).order("created_at", { ascending: true }).limit(1).maybeSingle(),
        supabase.from("wisdom_sessions").select("created_at")
          .eq("user_id", p.user_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const firstAt = first.data?.created_at ? new Date(first.data.created_at).getTime() : null;
      const lastAt = last.data?.created_at ? new Date(last.data.created_at).getTime() : null;
      if (!firstAt || !lastAt) continue;

      // needs 7+ days of prior activity span
      if (lastAt - firstAt < MIN_ACTIVITY_SPAN_DAYS * DAY) continue;
      // silent for 5-45 days
      if (lastAt > new Date(silentBefore).getTime()) continue;
      if (lastAt < new Date(activeSince).getTime()) continue;

      // no journal activity in the silent window either
      const { count: recentEntries } = await supabase
        .from("reflection_entries").select("id", { count: "exact", head: true })
        .eq("user_id", p.user_id).gt("created_at", silentBefore);
      if ((recentEntries ?? 0) > 0) continue;

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
      const daysSilent = Math.floor((now - lastAt) / DAY);

      // Insert first so the resume link can carry the log id.
      const { data: logRow, error: logErr } = await supabase
        .from("winback_log")
        .insert({
          user_id: p.user_id,
          variant: variant.key,
          subject: variant.subject,
          verse_ref: verse.ref,
          days_silent: daysSilent,
        })
        .select("id")
        .single();
      if (logErr || !logRow) {
        console.error("winback log insert failed:", logErr?.message);
        continue;
      }
      cooling.add(p.user_id);

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
          html: renderHtml(verse, firstName, logRow.id),
          text: renderText(verse, firstName, logRow.id),
        }),
      });

      if (!res.ok) {
        console.error(`winback send failed for ${email}:`, await res.text());
        await supabase.from("winback_log").delete().eq("id", logRow.id);
        continue;
      }
      sent++;
    }

    return json({ success: true, sent, returns_marked: returns, scanned });
  } catch (err) {
    console.error("winback-checkin error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
