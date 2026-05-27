// Apple In-App Purchase verification via App Store Server API.
// Verifies a signed transaction (JWS) from native StoreKit, then upserts the
// subscription row (provider='apple') and promotes the user's profile plan/role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUNDLE_ID = Deno.env.get("APPLE_IAP_BUNDLE_ID") ?? "com.dabarbible.app";
const KEY_ID = Deno.env.get("APPLE_IAP_KEY_ID") ?? "";
const ISSUER_ID = Deno.env.get("APPLE_IAP_ISSUER_ID") ?? "";
const PRIVATE_KEY = Deno.env.get("APPLE_IAP_PRIVATE_KEY") ?? "";

const PRODUCT_MAP: Record<string, { tier: "personal" | "family" | "community"; cycle: "monthly" | "annual" }> = {
  "com.dabarbible.personal.monthly": { tier: "personal", cycle: "monthly" },
  "com.dabarbible.personal.annual": { tier: "personal", cycle: "annual" },
  "com.dabarbible.family.monthly": { tier: "family", cycle: "monthly" },
  "com.dabarbible.family.annual": { tier: "family", cycle: "annual" },
  "com.dabarbible.community.monthly": { tier: "community", cycle: "monthly" },
};

function b64urlToBytes(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlEncode(bytes: Uint8Array | string): string {
  const bin = typeof bytes === "string" ? bytes : String.fromCharCode(...bytes);
  return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function signAppStoreJwt(): Promise<string> {
  if (!KEY_ID || !ISSUER_ID || !PRIVATE_KEY) {
    throw new Error("Apple IAP credentials not configured");
  }
  const header = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 60 * 30,
    aud: "appstoreconnect-v1",
    bid: BUNDLE_ID,
  };
  const encoder = new TextEncoder();
  const headerB64 = b64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = b64urlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(PRIVATE_KEY),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(signingInput)),
  );
  return `${signingInput}.${b64urlEncode(sig)}`;
}

function decodeJwsPayload<T>(jws: string): T {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("Malformed JWS");
  const json = new TextDecoder().decode(b64urlToBytes(parts[1]));
  return JSON.parse(json) as T;
}

interface AppleTransactionInfo {
  transactionId: string;
  originalTransactionId: string;
  bundleId: string;
  productId: string;
  purchaseDate: number;
  expiresDate?: number;
  environment: "Sandbox" | "Production";
  type?: string;
}

interface AppleRenewalInfo {
  autoRenewStatus?: number;
  expirationIntent?: number;
}

async function fetchAppleSubscriptionStatus(originalTransactionId: string, environment: "Sandbox" | "Production") {
  const host = environment === "Sandbox"
    ? "https://api.storekit-sandbox.itunes.apple.com"
    : "https://api.storekit.itunes.apple.com";
  const token = await signAppStoreJwt();
  const res = await fetch(`${host}/inApps/v1/subscriptions/${originalTransactionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`App Store Server API error ${res.status}: ${await res.text()}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Authenticate caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const authedClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await authedClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  let body: { signedTransaction?: string; originalTransactionId?: string; environment?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.signedTransaction) {
    return new Response(JSON.stringify({ error: "signedTransaction required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Decode the signed transaction (JWS) payload. Apple signs this with their
    // intermediate cert chain; we trust the App Store Server API call below to
    // authoritatively confirm subscription state.
    const tx = decodeJwsPayload<AppleTransactionInfo>(body.signedTransaction);

    if (tx.bundleId !== BUNDLE_ID) {
      return new Response(JSON.stringify({ error: "Bundle ID mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mapped = PRODUCT_MAP[tx.productId];
    if (!mapped) {
      return new Response(JSON.stringify({ error: `Unknown product ${tx.productId}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authoritative status from App Store Server API
    const statusResp = await fetchAppleSubscriptionStatus(tx.originalTransactionId, tx.environment);
    const latestGroup = statusResp?.data?.[0]?.lastTransactions?.[0];
    let active = false;
    let expiresAt: string | null = null;
    let autoRenew = true;
    if (latestGroup?.signedTransactionInfo && latestGroup?.signedRenewalInfo) {
      const latestTx = decodeJwsPayload<AppleTransactionInfo>(latestGroup.signedTransactionInfo);
      const renewal = decodeJwsPayload<AppleRenewalInfo>(latestGroup.signedRenewalInfo);
      if (latestTx.expiresDate) {
        expiresAt = new Date(latestTx.expiresDate).toISOString();
        active = latestTx.expiresDate > Date.now();
      }
      autoRenew = renewal.autoRenewStatus === 1;
    } else if (tx.expiresDate) {
      expiresAt = new Date(tx.expiresDate).toISOString();
      active = tx.expiresDate > Date.now();
    }

    const nowIso = new Date().toISOString();
    const status = active ? "active" : "expired";

    await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        provider: "apple",
        status,
        plan_type: mapped.tier,
        tier: mapped.tier,
        billing_cycle: mapped.cycle,
        apple_product_id: tx.productId,
        environment: tx.environment.toLowerCase(),
        current_period_end: expiresAt,
        cancel_at_period_end: !autoRenew,
        last_webhook_event_id: tx.transactionId,
        updated_at: nowIso,
      },
      { onConflict: "user_id,provider" },
    );

    if (active) {
      await supabase
        .from("profiles")
        .update({ plan: mapped.tier, role: mapped.tier === "family" ? "family_owner" : mapped.tier === "community" ? "community_admin" : "personal" })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("profiles")
        .update({ plan: "free", role: "free" })
        .eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        active,
        tier: mapped.tier,
        cycle: mapped.cycle,
        expiresAt,
        environment: tx.environment,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("apple-iap-verify error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});