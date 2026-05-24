import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isIOSNative } from "@/lib/platform";

interface EmailConfirmationPendingProps {
  email: string;
}

const COOLDOWN_SECONDS = 60;

const EmailConfirmationPending = ({ email }: EmailConfirmationPendingProps) => {
  const nativeIOS = isIOSNative();
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const handleResend = async () => {
    if (secondsLeft > 0 || sending) return;
    setSending(true);
    try {
      await supabase.auth.resend({ type: "signup", email });
      setJustSent(true);
      setSecondsLeft(COOLDOWN_SECONDS);
      setTimeout(() => setJustSent(false), 3000);
    } finally {
      setSending(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const buttonLabel = sending
    ? "Sending…"
    : justSent
      ? "Sent ✓"
      : secondsLeft > 0
        ? `Resend in ${secondsLeft}s`
        : "Resend confirmation email";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-4xl text-gold tracking-[0.2em] mb-2">DABAR</h1>
      <p className="text-gold font-serif text-base tracking-wider mb-8">דָּבָר</p>

      <div className="w-10 h-px bg-gold mb-8" />

      <h2 className="font-serif text-2xl text-foreground mb-4">
        Almost there — check your inbox
      </h2>

      <p className="font-body text-sm text-foreground/70 mb-2 max-w-xs">
        We sent a confirmation link to:
      </p>
      <p className="font-serif text-base text-gold mb-8">{email}</p>

      <p className="font-body text-xs text-muted-foreground mb-6 max-w-xs leading-relaxed">
        {nativeIOS
          ? "Click the link in your email to activate your account and continue in the iOS experience."
          : "Click the link in your email to activate your account and start your 30-day free trial."}
      </p>

      <button
        onClick={handleResend}
        disabled={secondsLeft > 0 || sending}
        className="font-serif text-sm tracking-widest uppercase px-6 py-3 border border-gold/30 text-gold rounded-sm hover:border-gold transition-all disabled:opacity-40 mb-4"
      >
        {buttonLabel}
      </button>

      <button
        onClick={handleSignOut}
        className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
      >
        Wrong email? Sign up again →
      </button>
    </div>
  );
};

export default EmailConfirmationPending;
