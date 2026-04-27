import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import verses from "./daily-verses.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_BASE = "https://dabarbible.com";
const FROM = "DABAR <mike@dabarbible.com>";

type Verse = { day: number; ref: string; text: string; prompt: string };
const VERSES = verses as Verse[];

function dayOfYear(d: Date) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86400_000);
}

function pickVerse(date: Date): Verse {
  if (!VERSES.length) throw new Error("No verses configured");
  const idx = (dayOfYear(date) - 1) % VERSES.length;
  return VERSES[idx];
}

function renderHtml(v: Verse, unsubToken: string) {
  const unsubUrl = `${PUBLIC_BASE}/unsubscribe-verse?token=${encodeURIComponent(unsubToken)}`;
  return `<div style="font-family:Georgia,serif;color:#0F0D0A">
<p style="font-size:18px;line-height:1.6"><em>${v.text}</em></p>
<p style="color:#C4973A;font-weight:bold">— ${v.ref} (KJV)</p>
<p style="font-size:15px;line-height:1.6;margin-top:20px">${v.prompt}</p>
<p style="margin-top:24px"><a href="${PUBLIC_BASE}" style="color:#C4973A">→ Go deeper in DABAR</a></p>
<hr/>
<p style="font-size:12px;color:#666"><a href="${unsubUrl}">Unsubscribe from daily verses</a> · DABAR</p>
</div>`;
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

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "send_due";

    // Public unsubscribe by token
    if (action === "unsubscribe_token") {
      const { token } = body;
      if (!token) return json({ error: "token required" }, 400);
      const { error } = await supabase
        .from("profiles")
        .update({ daily_verse_opt_in: false })
        .eq("daily_verse_unsub_token", token);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "send_due") {
      const now = new Date();
      const currentHourUtc = now.getUTCHours();
      const today = now.toISOString().slice(0, 10);

      const { data: optedIn, error } = await supabase
        .from("profiles")
        .select("user_id, daily_verse_send_hour_utc, daily_verse_unsub_token, daily_verse_last_sent_on")
        .eq("daily_verse_opt_in", true)
        .eq("daily_verse_send_hour_utc", currentHourUtc);

      if (error) return json({ error: error.message }, 500);
      if (!optedIn?.length) return json({ success: true, sent: 0 });

      const verse = pickVerse(now);
      let sent = 0;

      for (const p of optedIn) {
        if (p.daily_verse_last_sent_on === today) continue;

        const { data: userData } = await supabase.auth.admin.getUserById(p.user_id);
        const email = userData?.user?.email;
        if (!email) continue;

        const token = p.daily_verse_unsub_token ?? "";
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM,
            to: email,
            subject: "Your verse for today",
            html: renderHtml(verse, token),
          }),
        });

        if (!res.ok) {
          console.error(`Daily verse send failed for ${email}:`, await res.text());
          continue;
        }

        await supabase
          .from("profiles")
          .update({ daily_verse_last_sent_on: today })
          .eq("user_id", p.user_id);

        sent++;
      }

      return json({ success: true, sent, candidates: optedIn.length });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("daily-verse error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});