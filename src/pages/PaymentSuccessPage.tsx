import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isIOSNative } from "@/lib/platform";

const MAX_ATTEMPTS = 12;
const POLL_MS = 2000;

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const { refreshProfile, user } = useAuth();
  const [activated, setActivated] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const nativeIOS = isIOSNative();

  useEffect(() => {
    if (nativeIOS) {
      navigate("/", { replace: true });
      return;
    }
    if (!user) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      while (!cancelled && attempts < MAX_ATTEMPTS) {
        attempts++;
        const { data } = await supabase
          .from("profiles")
          .select("plan")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (data?.plan && data.plan !== "trial" && data.plan !== "free") {
          await refreshProfile();
          setActivated(true);
          setTimeout(() => !cancelled && navigate("/"), 2000);
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      if (!cancelled) {
        setTimedOut(true);
        await refreshProfile();
        setTimeout(() => !cancelled && navigate("/"), 4000);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [nativeIOS, user, refreshProfile, navigate]);

  if (nativeIOS) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-4xl text-gold tracking-[0.2em] mb-4">DABAR</h1>
      <p className="text-gold font-serif text-sm tracking-wider mb-8">דָּבָר</p>
      <div className="w-10 h-px bg-gold mb-8" />

      {activated ? (
        <>
          <p className="font-serif text-2xl text-foreground mb-4">Your practice continues.</p>
          <p className="font-body text-sm text-muted-foreground">Redirecting…</p>
        </>
      ) : timedOut ? (
        <>
          <p className="font-serif text-2xl text-foreground mb-4">Payment received.</p>
          <p className="font-body text-sm text-muted-foreground max-w-md">
            Activation is taking a moment. You'll see your full access shortly — refreshing automatically.
          </p>
        </>
      ) : (
        <>
          <p className="font-serif text-2xl text-foreground mb-4">Confirming your payment…</p>
          <p className="font-body text-sm text-muted-foreground">
            One moment while we activate your access.
          </p>
        </>
      )}
    </div>
  );
};

export default PaymentSuccessPage;
