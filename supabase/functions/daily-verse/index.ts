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
const TRANSLATION = "KJV";

// TODO(compliance): add a real physical mailing address (PO box / virtual mailbox)
// to the footer before this list grows further. Known gap, tracked deliberately —
// see dabar-onboarding-email skill, CAN-SPAM section. Not filled in yet by request.

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

function formattedDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Dark-sacred theme, matching the app's own tokens:
// background #12100A · scripture-card #1A1510 · gold #C4973A · gold-light #D4A853
// foreground #E8DCC8 · Cinzel (headings) · Playfair Display italic (verse + question) · Lato (body)
function renderHtml(v: Verse, unsubToken: string, date: Date) {
  const unsubUrl = `${PUBLIC_BASE}/unsubscribe-verse?token=${encodeURIComponent(unsubToken)}`;
  const dateStr = formattedDate(date);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<title>Your verse for today — DABAR</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Playfair+Display:ital@1&family=Lato:wght@400;700&display=swap" rel="stylesheet">
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; background-color: #12100A; }
  .bg-page { background-color: #12100A; }
  .bg-card { background-color: #1A1510; }
  .border-gold-l { border-left: 4px solid #C4973A; }
  .divider { border-top: 1px solid rgba(196,151,58,0.15); }
  .eyebrow { color: #C4973A; font-family: 'Cinzel', Georgia, 'Times New Roman', serif; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; font-weight: 700; }
  .date-line { color: #A89878; font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; }
  .wordmark { color: #E8DCC8; font-family: 'Cinzel', Georgia, serif; font-size: 20px; letter-spacing: 4px; font-weight: 700; }
  .verse-text { color: #E8DCC8; font-family: 'Playfair Display', Georgia, 'Palatino Linotype', serif; font-style: italic; font-size: 24px; line-height: 36px; }
  .verse-ref { color: #C4973A; font-family: 'Cinzel', Georgia, serif; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  .question { color: #D4A853; font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 17px; line-height: 26px; }
  .cta-btn { background-color: #C4973A; border-radius: 6px; }
  .cta-btn a { color: #0F0D0A !important; font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700; text-decoration: none; }
  .footer-text, .footer-text a { color: #7A6F58; font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; line-height: 18px; }
  .footer-text a { color: #A89878; text-decoration: underline; }
  .quote-mark { color: rgba(196,151,58,0.35); font-family: Georgia, serif; font-size: 60px; line-height: 1; }
  .glow-dot { background-color: #C4973A; border-radius: 50%; box-shadow: 0 0 6px 2px rgba(196,151,58,0.5); }
  @media (max-width: 620px) {
    .container { width: 100% !important; }
    .fluid-pad { padding-left: 24px !important; padding-right: 24px !important; }
    .verse-text { font-size: 21px !important; line-height: 32px !important; }
  }
</style>
</head>
<body class="bg-page" style="margin:0; padding:0; background-color:#12100A;">
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
  ${v.text} — ${v.ref}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page">
  <tr>
    <td align="center" style="padding: 32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="container" style="width:600px; max-width:600px;">
        <tr>
          <td align="center" style="padding: 0 0 24px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td class="glow-dot" width="6" height="6" style="width:6px; height:6px; font-size:1px; line-height:1px;">&nbsp;</td>
              <td width="10" style="width:10px; font-size:1px; line-height:1px;">&nbsp;</td>
              <td class="wordmark">DABAR</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td class="bg-card border-gold-l" style="border-radius: 10px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="fluid-pad" style="padding: 32px 40px 8px 36px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td class="eyebrow">TODAY'S VERSE</td>
                      <td class="date-line" align="right">${dateStr}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td class="fluid-pad" style="padding: 4px 40px 0 36px;">
                  <div class="quote-mark" style="height: 26px;">&ldquo;</div>
                </td>
              </tr>
              <tr>
                <td class="fluid-pad verse-text" style="padding: 0 40px 20px 36px;">
                  ${v.text}
                </td>
              </tr>
              <tr>
                <td class="fluid-pad" style="padding: 0 40px 28px 36px;">
                  <span class="verse-ref">— ${v.ref} · ${TRANSLATION}</span>
                </td>
              </tr>
              <tr>
                <td class="fluid-pad" style="padding: 0 40px 0 36px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="divider" style="font-size:1px; line-height:1px;">&nbsp;</td></tr></table>
                </td>
              </tr>
              <tr>
                <td class="fluid-pad question" style="padding: 24px 40px 28px 36px;">
                  ${v.prompt}
                </td>
              </tr>
              <tr>
                <td class="fluid-pad" style="padding: 0 40px 36px 36px;" align="left">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td class="cta-btn" style="border-radius: 6px;">
                        <a href="${PUBLIC_BASE}" target="_blank" style="display:inline-block; padding: 13px 26px;">Go deeper in DABAR &rarr;</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="fluid-pad footer-text" align="center" style="padding: 24px 24px 0 24px;">
            You're receiving this because you asked DABAR to send a verse each morning.<br>
            <a href="${unsubUrl}">Unsubscribe from daily verses</a> &nbsp;·&nbsp; DABAR
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function renderText(v: Verse, unsubToken: string, date: Date) {
  const unsubUrl = `${PUBLIC_BASE}/unsubscribe-verse?token=${encodeURIComponent(unsubToken)}`;
  return `TODAY'S VERSE — ${formattedDate(date)}

"${v.text}"
— ${v.ref} (${TRANSLATION})

${v.prompt}

Go deeper in DABAR: ${PUBLIC_BASE}

--
Unsubscribe from daily verses: ${unsubUrl}
DABAR`;
}

async function sendVerseEmail(to: string, verse: Verse, unsubToken: string, now: Date) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: "Your verse for today",
      html: renderHtml(verse, unsubToken, now),
      text: renderText(verse, unsubToken, now),
      headers: {
        "List-Unsubscribe": `<${PUBLIC_BASE}/unsubscribe-verse?token=${encodeURIComponent(unsubToken)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
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

    if (action === "send_test") {
      const { email } = body;
      if (!email) return json({ error: "email required" }, 400);

      const now = new Date();
      const verse = pickVerse(now);
      const res = await sendVerseEmail(email, verse, "test-token", now);

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Test send failed for ${email}:`, errText);
        return json({ error: errText }, 500);
      }

      return json({ success: true, sent_to: email, verse_ref: verse.ref });
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
        const res = await sendVerseEmail(email, verse, token, now);

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
