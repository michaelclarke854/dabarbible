import { SignInWithApple, SignInWithAppleOptions } from "@capacitor-community/apple-sign-in";
import { supabase } from "@/integrations/supabase/client";

/** Last auth error captured for the in-app diagnostics panel. */
let lastAuthError: { message: string; at: string } | null = null;
export function getLastAuthError() {
  return lastAuthError;
}
export function recordAuthError(message: string) {
  lastAuthError = { message, at: new Date().toISOString() };
}

function randomNonce(length = 32): string {
  const charset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-._";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += charset[bytes[i] % charset.length];
  return out;
}

/**
 * Native iOS Sign in with Apple flow.
 * Calls the system sheet, then exchanges the identity token for a Supabase session
 * via signInWithIdToken — no WebView redirect involved.
 */
export async function signInWithAppleNative() {
  const nonce = randomNonce();
  const options: SignInWithAppleOptions = {
    clientId: "com.dabarbible.app",
    redirectURI: "https://dabarbible.com/auth/callback",
    scopes: "email name",
    state: randomNonce(16),
    nonce,
  };
  const result = await SignInWithApple.authorize(options);
  const idToken = result.response?.identityToken;
  if (!idToken) {
    throw new Error("Apple did not return an identity token.");
  }
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: idToken,
    nonce,
  });
  if (error) throw error;
  return data;
}