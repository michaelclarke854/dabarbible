import { useEffect, useState } from "react";

const LAST_Q_KEY = "dabar-last-question";
const LAST_TS_KEY = "dabar-last-question-ts";
const DISMISS_KEY = "dabar-continue-dismissed-ts";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export default function ContinuePrompt({
  onContinue,
}: {
  onContinue: (question: string) => void;
}) {
  const [lastQ, setLastQ] = useState<string | null>(null);

  useEffect(() => {
    try {
      const q = localStorage.getItem(LAST_Q_KEY);
      const ts = parseInt(localStorage.getItem(LAST_TS_KEY) || "0", 10);
      const dismissed = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
      const used = parseInt(localStorage.getItem("dabar-questions-used") || "0", 10);
      if (!q || !ts) return;
      if (Date.now() - ts > SEVEN_DAYS) return;
      if (dismissed > ts) return;
      if (used <= 0) return;
      setLastQ(q);
    } catch {}
  }, []);

  if (!lastQ) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setLastQ(null);
  };

  const truncated = lastQ.length > 60 ? lastQ.slice(0, 60).trim() + "…" : lastQ;

  return (
    <div className="max-w-lg mx-auto mt-2 mb-2 flex items-center justify-between gap-3 px-4 py-2 border border-gold/20 rounded-sm bg-gold/5">
      <p className="font-body text-xs text-muted-foreground leading-relaxed">
        Last time you asked: <span className="italic text-foreground">"{truncated}"</span>
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => { onContinue(lastQ); setLastQ(null); }}
          className="font-body text-[11px] tracking-wide uppercase text-gold hover:text-gold-dark"
        >
          Continue
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground text-sm leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}