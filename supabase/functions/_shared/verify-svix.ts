// Verifies Resend / Svix webhook signatures.
// Resend signs outbound and inbound email webhooks with Svix, using HMAC-SHA256
// over `${svix-id}.${svix-timestamp}.${rawBody}`, signed with a base64 secret
// prefixed by "whsec_". Multiple signatures may be present (space-separated),
// each formatted as "v1,<base64-sig>".
//
// Returns:
//   { ok: true }                                 -> signature valid
//   { ok: false, reason, status }                -> reject with the given status

const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string; status: number };

export async function verifySvixSignature(
  req: Request,
  rawBody: string,
  secretEnvVar = "RESEND_WEBHOOK_SECRET",
): Promise<VerifyResult> {
  const secret = Deno.env.get(secretEnvVar);
  if (!secret) {
    // Fail closed in production. The function MUST have the secret set.
    return {
      ok: false,
      reason: `${secretEnvVar} is not configured — refusing unauthenticated webhook`,
      status: 500,
    };
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, reason: "Missing svix headers", status: 401 };
  }

  // Reject stale or future-dated requests to prevent replay
  const tsSeconds = Number(svixTimestamp);
  if (!Number.isFinite(tsSeconds)) {
    return { ok: false, reason: "Invalid svix-timestamp", status: 401 };
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - tsSeconds) > TIMESTAMP_TOLERANCE_SECONDS) {
    return { ok: false, reason: "Stale svix-timestamp", status: 401 };
  }

  // Strip "whsec_" prefix if present, then base64-decode the secret bytes
  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes: Uint8Array;
  try {
    keyBytes = base64ToBytes(rawSecret);
  } catch {
    return { ok: false, reason: "Webhook secret is not valid base64", status: 500 };
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(toSign),
  );
  const expected = bytesToBase64(sigBuffer);

  // svix-signature header may contain multiple "v1,<sig>" entries separated by spaces
  const parts = svixSignature.split(" ");
  for (const part of parts) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    if (timingSafeEqual(sig, expected)) return { ok: true };
  }

  return { ok: false, reason: "Signature mismatch", status: 401 };
}