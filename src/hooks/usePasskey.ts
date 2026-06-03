import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
import { supabase } from "@/integrations/supabase/client";

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type Result = { error?: string };

export function usePasskey() {
  const isSupported = browserSupportsWebAuthn();

  async function enrollPasskey(deviceName?: string): Promise<Result> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { error: "Not logged in" };

      const optRes = await fetch(`${EDGE_URL}/webauthn-register?action=start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: ANON_KEY,
        },
      });
      if (!optRes.ok) return { error: "Failed to start enrollment" };
      const options = await optRes.json();

      let credential;
      try {
        credential = await startRegistration({ optionsJSON: options });
      } catch (e: any) {
        if (e?.name === "NotAllowedError") return { error: "Face ID was cancelled" };
        return { error: "Face ID not available on this device" };
      }

      const verRes = await fetch(`${EDGE_URL}/webauthn-register?action=finish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential, deviceName }),
      });

      if (!verRes.ok) {
        const err = await verRes.json().catch(() => ({}));
        return { error: err.error ?? "Enrollment failed" };
      }

      return {};
    } catch (e) {
      console.error("enrollPasskey error:", e);
      return { error: "Unexpected error during enrollment" };
    }
  }

  async function signInWithPasskey(): Promise<Result> {
    try {
      const sessionId = crypto.randomUUID();

      const optRes = await fetch(
        `${EDGE_URL}/webauthn-authenticate?action=start&sessionId=${sessionId}`,
        { method: "POST", headers: { apikey: ANON_KEY } },
      );
      if (!optRes.ok) return { error: "Failed to start Face ID login" };
      const options = await optRes.json();

      let credential;
      try {
        credential = await startAuthentication({ optionsJSON: options });
      } catch (e: any) {
        if (e?.name === "NotAllowedError") return { error: "Face ID was cancelled" };
        return { error: "No passkey found for this device" };
      }

      const verRes = await fetch(
        `${EDGE_URL}/webauthn-authenticate?action=finish&sessionId=${sessionId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: ANON_KEY },
          body: JSON.stringify({ credential }),
        },
      );

      if (!verRes.ok) {
        const err = await verRes.json().catch(() => ({}));
        return { error: err.error ?? "Login failed" };
      }

      const { token_hash } = await verRes.json();

      const { error: sessionError } = await supabase.auth.verifyOtp({
        token_hash,
        type: "magiclink",
      });

      if (sessionError) return { error: "Failed to create session" };
      return {};
    } catch (e) {
      console.error("signInWithPasskey error:", e);
      return { error: "Unexpected error during Face ID login" };
    }
  }

  return { isSupported, enrollPasskey, signInWithPasskey };
}