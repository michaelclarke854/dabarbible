import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";

type Status = "verifying" | "error";

const MIN_DISPLAY_MS = 400;

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const startedAt = Date.now();
    let cancelled = false;

    const finish = (to: string) => {
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
      window.setTimeout(() => {
        if (!cancelled) navigate(to, { replace: true });
      }, wait);
    };

    (async () => {
      trackEvent("auth_callback_attempt", { metadata: { source: "web" } });

      try {
        const href = window.location.href;
        const search = window.location.search;
        const hash = window.location.hash;

        if (search.includes("code=")) {
          const { error } = await supabase.auth.exchangeCodeForSession(href);
          if (error) throw error;
        } else if (hash.includes("access_token=")) {
          // Implicit flow — supabase client (with detectSessionInUrl default) will pick it up.
          // Give it a tick to consume the hash.
          await new Promise((r) => setTimeout(r, 50));
        } else {
          // No code / no hash — likely a stale link or already-consumed callback.
          // Fall through; check session anyway.
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          trackEvent("auth_callback_success", {
            metadata: { source: "web" },
            userId: sessionData.session.user.id,
          });
          finish("/");
        } else {
          throw new Error("No session was created from this link.");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign-in failed.";
        trackEvent("auth_callback_failure", {
          metadata: { source: "web", reason: message },
        });
        if (cancelled) return;
        setErrorMsg(message);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-3xl text-gold tracking-[0.2em] mb-6">DABAR</h1>
      <div className="w-10 h-px bg-gold mb-8" />
      {status === "verifying" ? (
        <>
          <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin mb-6" />
          <p className="font-body text-sm text-foreground/70">Verifying your sign-in…</p>
        </>
      ) : (
        <>
          <h2 className="font-serif text-xl text-foreground mb-4">
            We couldn't complete sign-in
          </h2>
          <p className="font-body text-sm text-foreground/70 max-w-xs mb-6">
            {errorMsg || "The link may have expired or already been used."}
          </p>
          <button
            onClick={() => navigate("/", { replace: true })}
            className="font-serif text-sm tracking-widest uppercase px-6 py-3 border border-gold/30 text-gold rounded-sm hover:border-gold transition-all"
          >
            Back to start
          </button>
        </>
      )}
    </div>
  );
};

export default AuthCallback;