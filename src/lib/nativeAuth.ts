import { SocialLogin } from "@capgo/capacitor-social-login";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/platform";

/** Last auth error captured for the in-app diagnostics panel. */
let lastAuthError: { message: string; at: string } | null = null;
export function getLastAuthError() {
  return lastAuthError;
}
export function recordAuthError(message: string) {
  lastAuthError = { message, at: new Date().toISOString() };
}

const GOOGLE_IOS_CLIENT_ID = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined;
const APPLE_SERVICE_ID = "com.dabarbible.app"; // iOS uses bundle id; only used as fallback on web/android

let initPromise: Promise<void> | null = null;
async function ensureInitialized() {
  if (!isNative()) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const config: Record<string, unknown> = {
      apple: {
        // On iOS the bundle ID is used automatically; clientId is ignored.
        clientId: APPLE_SERVICE_ID,
      },
    };
    if (GOOGLE_IOS_CLIENT_ID) {
      (config as { google?: unknown }).google = {
        iOSClientId: GOOGLE_IOS_CLIENT_ID,
        iOSServerClientId: GOOGLE_IOS_CLIENT_ID,
      };
    }
    await SocialLogin.initialize(config as never);
  })().catch((err) => {
    initPromise = null;
    throw err;
  });
  return initPromise;
}

/**
 * Native iOS Sign in with Apple flow via @capgo/capacitor-social-login.
 * Exchanges the returned identity token for a Supabase session — no WebView redirect.
 */
export async function signInWithAppleNative() {
  await ensureInitialized();
  const res = await SocialLogin.login({
    provider: "apple",
    options: { scopes: ["email", "name"] },
  });
  // result is AppleProviderResponse
  const result = (res as { result?: { idToken?: string | null } }).result;
  const idToken = result?.idToken ?? null;
  if (!idToken) {
    throw new Error("Apple did not return an identity token.");
  }
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: idToken,
  });
  if (error) throw error;
  return data;
}

/**
 * Native Google Sign-In via @capgo/capacitor-social-login.
 * Requires VITE_GOOGLE_IOS_CLIENT_ID to be set in the environment.
 */
export async function signInWithGoogleNative() {
  if (!GOOGLE_IOS_CLIENT_ID) {
    throw new Error("Google Sign-In is not configured on this build (missing iOS client id).");
  }
  await ensureInitialized();
  const res = await SocialLogin.login({
    provider: "google",
    options: {},
  });
  const result = (res as { result?: { idToken?: string | null } }).result;
  const idToken = result?.idToken ?? null;
  if (!idToken) {
    throw new Error("Google did not return an identity token.");
  }
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });
  if (error) throw error;
  return data;
}