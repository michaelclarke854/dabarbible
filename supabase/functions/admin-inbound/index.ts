import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET"); // whsec_... — not set yet, see notes
const VERIFY_ENFORCE = (Deno.env.get("RESEND_WEBHOOK_VERIFY_ENFORCE") ?? "false") === "true";
const FORWARD_TO = "michaelclarke854@gmail.com";
const FROM = "DABAR <mike@dabarbible.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

// ── Svix signature verification (same scheme as ARIA's resend-webhook) ──
// MONITOR MODE ONLY: a bad/missing signature is logged, never blocks the request,
// until RESEND_WEBHOOK_VERIFY_ENFORCE=true is set (which should only happen after
// RESEND_WEBHOOK_SECRET is confirmed set AND a real signed delivery has logged clean).
async function verifySvix(rawBody: string, headers: Headers): Promise<{ ok: boolean; reason: string }> {
  if (!RESEND_WEBHOOK_SECRET) return { ok: false, reason: "no_secret_configured" };

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return { ok: false, reason: "missing_signature_headers" };

  const secretBytes = Uint8Array.from(atob(RESEND_WEBHOOK_SECRET.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

  const candidates = svixSignature.split(" ").map((p) => p.split(",")[1]).filter(Boolean);
  return { ok: candidates.includes(expected), reason: candidates.includes(expected) ? "ok" : "mismatch" };
}

async function fetchFullEmail(emailId: string) {
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  if (!res.ok) throw new Error(`fetch_full_email_failed:${res.status}:${await res.text()}`);
  return res.json();
}

function forwardHtml(full: Record<string, unknown>) {
  const from = String(full.from ?? "unknown sender");
  const to = String(full.to ?? "");
  const subject = String(full.subject ?? "(no subject)");
  const bodyHtml = (full.html as string) ?? `<pre>${escapeHtml(String(full.text ?? "(no content)"))}</pre>`;
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1a1a">
<p style="font-size:13px;color:#666;margin:0 0 4px 0">Forwarded from admin@inbound.dabarbible.com</p>
<p style="font-size:13px;color:#666;margin:0 0 16px 0">From: ${escapeHtml(from)} &nbsp;·&nbsp; To: ${escapeHtml(to)}</p>
<hr style="border:none;border-top:1px solid #e5e5e5;margin:0 0 16px 0" />
${bodyHtml}
</div>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rawBody = await req.text();

  const { ok, reason } = await verifySvix(rawBody, req.headers);
  if (!ok) {
    console.error(`admin-inbound: signature check failed (${reason})${VERIFY_ENFORCE ? " — REJECTING (enforce=true)" : " — logging only, not blocking"}`);
    if (VERIFY_ENFORCE) {
      return new Response(JSON.stringify({ error: "invalid_signature" }), { status: 401, headers: corsHeaders });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: corsHeaders });
  }

  if (payload.type !== "email.received") {
    return new Response(JSON.stringify({ success: true, ignored: payload.type }), { headers: corsHeaders });
  }

  try {
    const emailId = (payload.data as Record<string, unknown>)?.email_id as string;
    if (!emailId) return new Response(JSON.stringify({ error: "no_email_id" }), { status: 400, headers: corsHeaders });

    const full = await fetchFullEmail(emailId);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: FORWARD_TO,
        reply_to: (full as Record<string, unknown>).from,
        subject: `Fwd: ${(full as Record<string, unknown>).subject ?? "(no subject)"}`,
        html: forwardHtml(full as Record<string, unknown>),
      }),
    });

    if (!res.ok) {
      console.error("admin-inbound: forward send failed:", await res.text());
      return new Response(JSON.stringify({ error: "forward_failed" }), { status: 502, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, forwarded: true }), { headers: corsHeaders });
  } catch (err) {
    console.error("admin-inbound error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500, headers: corsHeaders });
  }
});