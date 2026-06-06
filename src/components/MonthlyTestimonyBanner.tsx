import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Monthly testimony banner — counts the signed-in user's prayers answered
 * in the previous calendar month. Dismissible per-month via localStorage.
 */
const MonthlyTestimonyBanner = () => {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Previous calendar month bounds
  const now = new Date();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthKey = `${prevMonthStart.getFullYear()}-${String(
    prevMonthStart.getMonth() + 1
  ).padStart(2, "0")}`;
  const storageKey = `testimony_dismissed_${monthKey}`;

  useEffect(() => {
    if (!user) return;
    try {
      if (localStorage.getItem(storageKey) === "true") {
        setDismissed(true);
        return;
      }
    } catch {
      /* ignore */
    }
    (async () => {
      try {
        const { count: n } = await supabase
          .from("prayer_log" as any)
          .select("id", { count: "exact", head: true })
          .eq("status", "answered")
          .is("deleted_at", null)
          .gte("answered_at", prevMonthStart.toISOString())
          .lt("answered_at", thisMonthStart.toISOString());
        setCount(n ?? 0);
      } catch {
        setCount(0);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, storageKey]);

  if (!user || dismissed || !count || count <= 0) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className="mx-auto mb-4 max-w-2xl border border-gold/30 bg-gold/5 rounded-sm px-4 py-3 flex items-center gap-3">
      <Flame size={16} className="text-gold shrink-0" aria-hidden="true" />
      <p className="flex-1 font-body text-sm text-foreground">
        Last month, you saw{" "}
        <span className="font-serif text-gold font-medium">{count}</span>{" "}
        answered {count === 1 ? "prayer" : "prayers"}.{" "}
        <Link
          to="/prayers"
          className="font-body text-xs tracking-wider uppercase text-gold hover:text-gold-light transition-colors underline-offset-4 hover:underline"
        >
          View
        </Link>
      </p>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
};

export default MonthlyTestimonyBanner;
