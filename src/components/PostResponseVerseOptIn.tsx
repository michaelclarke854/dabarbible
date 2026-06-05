import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/trackEvent";

const ACCEPTED_KEY = "dabar-verse-optin-accepted";
const DISMISSED_KEY = "dabar-verse-optin-dismissed-until";

function isDismissed(): boolean {
  try {
    if (localStorage.getItem(ACCEPTED_KEY) === "true") return true;
    const until = parseInt(localStorage.getItem(DISMISSED_KEY) || "0", 10);
    return until > Date.now();
  } catch {
    return false;
  }
}

export default function PostResponseVerseOptIn({
  defaultEmail,
  userId,
}: {
  defaultEmail?: string | null;
  userId?: string | null;
}) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [hidden, setHidden] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setHidden(isDismissed());
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(
        DISMISSED_KEY,
        String(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );
    } catch {}
    setHidden(true);
    trackEvent("verse_optin_dismissed", { screen: "response" });
  };

  const submit = async () => {
    const value = email.trim();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Please enter a valid email");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("verse_subscribers").insert({
      email: value,
      source: "post_response_prompt",
      user_id: userId ?? null,
    } as never);
    setSubmitting(false);
    if (error && !/duplicate|unique/i.test(error.message)) {
      toast.error("Could not save. Try again.");
      return;
    }
    try {
      localStorage.setItem(ACCEPTED_KEY, "true");
    } catch {}
    trackEvent("verse_optin_accepted", { screen: "response" });
    toast.success("You'll receive your first verse tomorrow.");
    setHidden(true);
  };

  return (
    <div className="mt-8 px-4 py-5 border border-gold/25 rounded-sm bg-gold/5 max-w-2xl mx-auto">
      <div className="flex justify-between items-start gap-2 mb-2">
        <h3 className="font-serif text-lg text-foreground">Receive a verse each morning</h3>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground text-sm leading-none"
        >
          ×
        </button>
      </div>
      <p className="font-body text-xs text-muted-foreground leading-relaxed mb-3">
        Start your day with a scripture matched to what you're carrying. One email, every morning.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 bg-background border border-input rounded-sm px-3 py-2 text-sm font-body"
        />
        <button
          onClick={submit}
          disabled={submitting}
          className="font-body text-xs tracking-wide px-4 py-2 bg-gold text-primary-foreground rounded-sm hover:bg-gold-dark transition-all disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Yes, send me a verse"}
        </button>
      </div>
      <button
        onClick={dismiss}
        className="mt-3 text-[11px] font-body text-muted-foreground hover:text-foreground"
      >
        Maybe later
      </button>
    </div>
  );
}