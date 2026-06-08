import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";

const MIN_DISPLAY_MS = 400;

/**
 * AuthCallback: every code path resolves by navigating away.
 * Success → "/". Any failure → "/?auth_error=link_expired".
 * Never lands on the catch-all 404, never stays on /auth/callback.
 */
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const startedAt = Date.now();
    let cancelled = false;
    let signedInUnsub: { unsubscribe: () => void } | null = null;
    let pkceTimeout: number | undefined;

    const finish = (to: string) => {
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
      window.setTimeout(() => {
        if (!cancelled) navigate(to, { replace: true });
      }, wait);
    };

    const fail = (reason: string) => {
      trackEvent("auth_callback_failure", {
        metadata: { source: "web", reason },
      });
      finish("/?auth_error=link_expired");
    };

    (async () => {
      trackEvent("auth_callback_attempt", { metadata: { source: "web" } });

      const href = window.location.href;
      const search = window.location.search;
      const hash = window.location.hash;

      // No params at all — stale or direct hit. Send home silently.
      if (!search && !hash) {
        finish("/");
        return;
      }

      try {
        if (search.includes("code=")) {
          const { error } = await supabase.auth.exchangeCodeForSession(href);
          if (error) {
            fail(error.message);
            return;
          }
        } else if (hash.includes("access_token=")) {
          // Implicit flow — supabase client picks up the hash automatically.
          await new Promise((r) => setTimeout(r, 50));
        } else if (search.includes("error=") || hash.includes("error=")) {
          fail("provider_error");
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          trackEvent("auth_callback_success", {
            metadata: { source: "web" },
            userId: sessionData.session.user.id,
          });
          finish("/");
          return;
        }

        // No session yet but a PKCE `code` flow may still settle via
        // onAuthStateChange. Wait briefly for SIGNED_IN; otherwise go home.
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session?.user) {
            trackEvent("auth_callback_success", {
              metadata: { source: "web", via: "state_change" },
              userId: session.user.id,
            });
            finish("/");
          }
        });
        signedInUnsub = sub.subscription;
        pkceTimeout = window.setTimeout(() => {
          // No SIGNED_IN within window — fall back gracefully (not an error).
          finish("/");
        }, 2500);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign-in failed.";
        fail(message);
      }
    })();

    return () => {
      cancelled = true;
      signedInUnsub?.unsubscribe();
      if (pkceTimeout) window.clearTimeout(pkceTimeout);
    };
  }, [navigate]);

  return (
    <>
    <Helmet>
      <title>Dabar Bible</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-3xl text-gold tracking-[0.2em] mb-6">DABAR</h1>
      <div className="w-10 h-px bg-gold mb-8" />
      <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin mb-6" />
      <p className="font-body text-sm text-foreground/70">Verifying your sign-in…</p>
    </div>
    </>
  );
};

export default AuthCallback;