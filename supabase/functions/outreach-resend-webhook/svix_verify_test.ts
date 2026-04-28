import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/outreach-resend-webhook`;
const SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET");

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(buf: ArrayBuffer): string {
  const arr = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
}

async function signSvix(secret: string, id: string, ts: string, body: string) {
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(raw),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${id}.${ts}.${body}`),
  );
  return `v1,${bytesToBase64(sig)}`;
}

const samplePayload = JSON.stringify({
  type: "email.delivered",
  data: { email_id: "test-msg-id-does-not-exist-in-db" },
});

Deno.test("rejects request with no svix headers (401)", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: samplePayload,
  });
  const text = await res.text();
  console.log("no-headers status:", res.status, "body:", text);
  assertEquals(res.status, 401);
});

Deno.test("rejects request with bogus signature (401)", async () => {
  const ts = Math.floor(Date.now() / 1000).toString();
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "svix-id": "msg_test_bogus",
      "svix-timestamp": ts,
      "svix-signature": "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    },
    body: samplePayload,
  });
  const text = await res.text();
  console.log("bogus-sig status:", res.status, "body:", text);
  assertEquals(res.status, 401);
});

Deno.test("accepts valid svix signature (200)", async () => {
  if (!SECRET) {
    console.warn("RESEND_WEBHOOK_SECRET not set in local env; skipping positive test.");
    return;
  }
  const id = `msg_test_${crypto.randomUUID()}`;
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = await signSvix(SECRET, id, ts, samplePayload);
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "svix-id": id,
      "svix-timestamp": ts,
      "svix-signature": sig,
    },
    body: samplePayload,
  });
  const text = await res.text();
  console.log("valid-sig status:", res.status, "body:", text);
  assertEquals(res.status, 200);
});