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

type Prompt = { day: number; subject: string; ref: string; verse: string; question: string; opener: string };

const PROMPTS: Prompt[] = [
  {
    day: 1,
    subject: "Your first reflection",
    ref: "Psalm 46:10",
    verse: "Be still, and know that I am God.",
    question: "What would it look like to be still today?",
    opener: "Welcome to DABAR. No blank page — just one verse and one question each morning for the next three days.",
  },
  {
    day: 2,
    subject: "A verse for today",
    ref: "Proverbs 3:5",
    verse: "Trust in the LORD with all thine heart; and lean not unto thine own understanding.",
    question: "Where are you leaning on your own understanding right now?",
    opener: "Day two. Same rhythm: read it slowly, then answer honestly.",
  },
  {
    day: 3,
    subject: "One more question",
    ref: "Lamentations 3:22-23",
    verse: "It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning.",
    question: "What do you need mercy for this morning?",
    opener: "Day three. If these have landed, this is the habit — one verse, one honest answer.",
  },
  {
    day: 4,
    subject: "We're here when you're ready",
    ref: "Isaiah 40:31",
    verse: "But they that wait upon the LORD shall renew their strength.",
    question: "When you're ready, this is the question waiting for you: what are you carrying that you haven't brought to scripture?",
    opener: "No pressure, and no more prompts after this one. Some seasons aren't for words.",
  },
];

function renderHtml(p: Prompt, firstName: string) {
  return `<div style="font-family:Georgia,serif;color:#0F0D0A;max-width:560px">
<p>Hi ${firstName},</p>
<p style="color:#4a4438">${p.opener}</p>
<blockquote style="border-left:4px solid #C4973A;margin:24px 0;padding:8px 0 8px 18px;font-style:italic;font-size:18px;line-height:28px;color:#2b261d">
${p.verse}<br><span style="font-style:normal;font-size:13px;letter-spacing:1px;color:#8a6d24">— ${p.ref} · KJV</span>
</blockquote>
<p style="font-style:italic;color:#6b5a2e;font-size:16px">${p.question}</p>
<p><a href="${PUBLIC_BASE}" style="display:inline-block;background:#C4973A;color:#0F0D0A;text-decoration:none;padding:12px 24px;border-radius:6px;font-family:Helvetica,Arial,sans-serif;font-weight:bold">Reflect in DABAR &rarr;</a></p>
<p>Mike</p>
<hr>
<p style="font-size:12px;color:#666;font-family:Helvetica,Arial,sans-serif">You're receiving this because you created a DABAR account. <a href="${PUBLIC_BASE}/unsubscribe">Unsubscribe</a>. DABAR.</p>
</div>`;
}

function renderText(p: Prompt, firstName: string) {
  return `Hi ${firstName},

${p.opener}

"${p.verse}"
— ${p.ref} (KJV)

${p.question}

Reflect in DABAR: ${PUBLIC_BASE}

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

  // Gate behind the shared cron secret (same pattern as expire-trials).
  const provided = req.headers.get("x-cron-secret");
  const { data: secret } = await supabase.rpc("get_cron_shared_secret");
  if (!secret) return json({ error: "cron_shared_secret not configured" }, 500);
  if (provided !== secret) return json({ error: "Unauthorized" }, 401);

  try {
    const now = Date.now();
    const DAY = 86400_000;

    // Everyone who signed up in the last 5 days is a candidate.
    const since = new Date(now - 5 * DAY).toISOString();
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, created_at")
      .gte("created_at", since);

    if (error) return json({ error: error.message }, 500);
    if (!profiles?.length) return json({ success: true, sent: 0 });

    const userIds = profiles.map((p) => p.user_id);
    const { data: alreadySent } = await supabase
      .from("onboarding_prompt_log")
      .select("user_id, day")
      .in("user_id", userIds);

    const sentSet = new Set((alreadySent ?? []).map((r) => `${r.user_id}:${r.day}`));

    let sent = 0;
    for (const p of profiles) {
      const ageDays = Math.floor((now - new Date(p.created_at).getTime()) / DAY) + 1;
      const prompt = PROMPTS.find((x) => x.day === ageDays);
      if (!prompt) continue;
      if (sentSet.has(`${p.user_id}:${prompt.day}`)) continue;

      // Day 4 is only for users who never reflected.
      if (prompt.day === 4) {
        const [{ count: sessions }, { count: entries }] = await Promise.all([
          supabase.from("wisdom_sessions").select("id", { count: "exact", head: true }).eq("user_id", p.user_id),
          supabase.from("reflection_entries").select("id", { count: "exact", head: true }).eq("user_id", p.user_id),
        ]);
        if ((sessions ?? 0) > 0 || (entries ?? 0) > 0) continue;
      }

      const { data: userData } = await supabase.auth.admin.getUserById(p.user_id);
      const email = userData?.user?.email;
      if (!email) continue;
      const firstName =
        (userData.user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
        email.split("@")[0];

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: email,
          subject: prompt.subject,
          html: renderHtml(prompt, firstName),
          text: renderText(prompt, firstName),
        }),
      });

      if (!res.ok) {
        console.error(`onboarding day${prompt.day} failed for ${email}:`, await res.text());
        continue;
      }

      await supabase
        .from("onboarding_prompt_log")
        .insert({ user_id: p.user_id, day: prompt.day, verse_ref: prompt.ref });

      sent++;
    }

    return json({ success: true, sent, scanned: profiles.length });
  } catch (err) {
    console.error("onboarding-prompts error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
