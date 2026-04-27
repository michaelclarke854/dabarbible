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
const FROM = "Mike Clarke <mike@dabarbible.com>";
const FOOTER_ADDRESS = "DABAR";

type NudgeKey = "day3" | "day21" | "day28";

function unsubFooter(email: string) {
  return `<hr/><p style="font-size:12px;color:#666">You're receiving this because you started a DABAR trial. <a href="${PUBLIC_BASE}/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe</a>. ${FOOTER_ADDRESS}.</p>`;
}

const TEMPLATES: Record<NudgeKey, (firstName: string, email: string) => { subject: string; html: string }> = {
  day3: (n, e) => ({
    subject: "A question worth sitting with",
    html: `<p>Hi ${n},</p>
<p>You started your DABAR scripture journey 3 days ago.</p>
<p>A lot of people open the app, try one question, then get busy. The ones who find it most meaningful come back to it like a practice — not as a productivity tool but as a place to be honest with God.</p>
<p>One question worth trying today:</p>
<blockquote>"What am I carrying right now that I haven't brought to scripture?"</blockquote>
<p>→ <a href="${PUBLIC_BASE}">Ask it in DABAR</a></p>
<p>Mike</p>${unsubFooter(e)}`,
  }),
  day21: (n, e) => ({
    subject: "Your DABAR trial — 9 days left",
    html: `<p>Hi ${n},</p>
<p>You have 9 days left in your DABAR scripture journey.</p>
<p>If it's been useful — if you've found yourself coming back to it, sitting with a response, or looking at a question differently — it's worth continuing.</p>
<p>Plans start small. No hidden fees. Cancel any time.</p>
<p>→ <a href="${PUBLIC_BASE}/pricing">Continue your journey</a></p>
<p>If it hasn't been useful, that feedback matters too. Just reply to this email and tell me why.</p>
<p>Mike</p>${unsubFooter(e)}`,
  }),
  day28: (n, e) => ({
    subject: "2 days left — your DABAR journal",
    html: `<p>Hi ${n},</p>
<p>Your DABAR trial ends in 2 days.</p>
<p>Everything you've journaled, every reflection you've saved — it stays with you if you continue. If not, it stays in the app for 30 days before it's removed.</p>
<p>If you've found value in it, now's the time.</p>
<p>→ <a href="${PUBLIC_BASE}/pricing">Keep your journey going</a></p>
<p>If the timing isn't right, no pressure. DABAR will be here when it is.</p>
<p>Mike</p>${unsubFooter(e)}`,
  }),
};

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
    // Pull all active trial profiles still on trial and not converted
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, trial_started_at, trial_ends_at, trial_converted, trial_nudges_sent")
      .eq("plan", "trial")
      .eq("trial_converted", false);

    if (error) return json({ error: error.message }, 500);
    if (!profiles?.length) return json({ success: true, sent: 0 });

    const now = Date.now();
    const DAY = 86400_000;
    let sent = 0;

    for (const p of profiles) {
      const nudges = (p.trial_nudges_sent ?? {}) as Record<string, boolean>;
      const startedAt = p.trial_started_at ? new Date(p.trial_started_at).getTime() : 0;
      const endsAt = p.trial_ends_at ? new Date(p.trial_ends_at).getTime() : 0;
      if (!startedAt || !endsAt) continue;

      const daysSinceStart = Math.floor((now - startedAt) / DAY);
      const daysUntilEnd = Math.floor((endsAt - now) / DAY);

      let nudge: NudgeKey | null = null;

      if (!nudges.day3 && daysSinceStart >= 3 && daysSinceStart < 14) {
        // Day 3: only if user has < 3 sessions
        const { count } = await supabase
          .from("wisdom_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", p.user_id);
        if ((count ?? 0) < 3) nudge = "day3";
      } else if (!nudges.day21 && daysUntilEnd <= 9 && daysUntilEnd > 4) {
        nudge = "day21";
      } else if (!nudges.day28 && daysUntilEnd <= 2 && daysUntilEnd >= 0) {
        nudge = "day28";
      }

      if (!nudge) continue;

      // Look up auth email
      const { data: userData } = await supabase.auth.admin.getUserById(p.user_id);
      const email = userData?.user?.email;
      if (!email) continue;
      const firstName = (userData.user.user_metadata?.full_name as string | undefined)?.split(" ")[0]
        || email.split("@")[0];

      const tpl = TEMPLATES[nudge](firstName, email);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: FROM, to: email, subject: tpl.subject, html: tpl.html }),
      });

      if (!res.ok) {
        console.error(`Resend ${nudge} for ${email}:`, await res.text());
        continue;
      }

      const updatedNudges = { ...nudges, [nudge]: true };
      await supabase
        .from("profiles")
        .update({ trial_nudges_sent: updatedNudges })
        .eq("user_id", p.user_id);

      sent++;
    }

    return json({ success: true, sent, scanned: profiles.length });
  } catch (err) {
    console.error("trial-nudges error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});