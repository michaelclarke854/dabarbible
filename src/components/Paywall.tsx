import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { rcGetCurrentOffering, rcPurchasePackage, rcRestore } from "@/lib/revenuecat";

interface PaywallProps {
  onClose?: () => void;
}

// Minimal shape we rely on from RevenueCat's Package / Product.
type RcProduct = {
  title?: string;
  priceString?: string;
  subscriptionPeriod?: string;
};
type RcPackage = {
  identifier: string;
  packageType?: string;
  product: RcProduct;
};
type RcOffering = {
  identifier: string;
  serverDescription?: string;
  availablePackages: RcPackage[];
};

function formatPeriod(period?: string, packageType?: string): string {
  if (period) {
    // ISO 8601 duration like P1M, P1Y, P1W
    const m = period.match(/^P(\d+)([DWMY])$/);
    if (m) {
      const n = parseInt(m[1], 10);
      const unit = m[2];
      const map: Record<string, string> = { D: "day", W: "week", M: "month", Y: "year" };
      const label = map[unit] || "period";
      return n === 1 ? `per ${label}` : `every ${n} ${label}s`;
    }
  }
  switch ((packageType || "").toUpperCase()) {
    case "MONTHLY": return "per month";
    case "ANNUAL": return "per year";
    case "WEEKLY": return "per week";
    case "LIFETIME": return "one-time";
    default: return "";
  }
}

export default function Paywall({ onClose }: PaywallProps) {
  const { refreshEntitlement } = useAuth();
  const [offering, setOffering] = useState<RcOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const prefersReducedMotion = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const current = await rcGetCurrentOffering();
      if (!cancelled) {
        setOffering(current as RcOffering | null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePurchase = async (pkg: RcPackage) => {
    setPurchasingId(pkg.identifier);
    const result = await rcPurchasePackage(pkg);
    setPurchasingId(null);
    if (result.ok) {
      await refreshEntitlement();
      toast.success("Subscription active. Welcome.");
      onClose?.();
    } else if (result.cancelled) {
      // silent
    } else {
      toast.error(result.error || "Purchase failed. Please try again.");
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const ok = await rcRestore();
    setRestoring(false);
    await refreshEntitlement();
    if (ok) {
      toast.success("Purchases restored.");
      onClose?.();
    } else {
      toast("No active purchases found.");
    }
  };

  const fadeIn = prefersReducedMotion
    ? { initial: false, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: "easeOut" as const } };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background px-5 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <motion.div {...fadeIn} className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <header className="pt-6 pb-8 text-center">
          <p className="font-body text-xs tracking-[0.2em] uppercase text-gold mb-3">Continue your practice</p>
          <h1 className="font-serif text-3xl text-foreground leading-tight mb-3">
            Unlimited scripture reflection
          </h1>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            You've reached today's free reflections. Subscribe to continue without limits.
          </p>
        </header>

        <section className="flex-1 flex flex-col gap-3" aria-label="Subscription options">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          )}

          {!loading && (!offering || offering.availablePackages.length === 0) && (
            <div className="text-center py-8">
              <p className="font-body text-sm text-muted-foreground">
                Subscriptions aren't available right now. Please try again later.
              </p>
            </div>
          )}

          {!loading && offering?.availablePackages.map((pkg) => {
            const isBusy = purchasingId === pkg.identifier;
            const periodLabel = formatPeriod(pkg.product.subscriptionPeriod, pkg.packageType);
            return (
              <button
                key={pkg.identifier}
                onClick={() => handlePurchase(pkg)}
                disabled={!!purchasingId}
                aria-label={`Subscribe ${pkg.product.title || pkg.identifier} ${pkg.product.priceString || ""} ${periodLabel}`}
                className="min-h-[64px] w-full rounded-sm border border-gold/30 bg-card/40 px-5 py-4 flex items-center justify-between gap-4 text-left transition-all active:scale-[0.99] active:bg-card/70 disabled:opacity-60 disabled:pointer-events-none"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-base text-foreground truncate">
                    {pkg.product.title || pkg.identifier}
                  </p>
                  {periodLabel && (
                    <p className="font-body text-xs text-muted-foreground mt-0.5">{periodLabel}</p>
                  )}
                </div>
                <div className="font-serif text-lg text-gold whitespace-nowrap">
                  {isBusy ? (
                    <span className="inline-block w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                  ) : (
                    pkg.product.priceString || ""
                  )}
                </div>
              </button>
            );
          })}
        </section>

        <footer className="pt-8 pb-2 space-y-4">
          <p className="font-body text-[11px] leading-relaxed text-muted-foreground text-center px-2">
            Auto-renewing subscription. Your subscription renews automatically at the price and
            billing period shown above unless cancelled at least 24 hours before the end of the
            current period. Manage or cancel anytime in your Apple ID settings.
          </p>

          <div className="flex items-center justify-center gap-6 text-xs font-body">
            <Link to="/terms" className="text-gold hover:underline min-h-[44px] flex items-center">
              Terms (EULA)
            </Link>
            <Link to="/privacy" className="text-gold hover:underline min-h-[44px] flex items-center">
              Privacy
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="min-h-[44px] w-full font-body text-sm text-foreground/80 hover:text-gold transition-colors disabled:opacity-60"
            >
              {restoring ? "Restoring…" : "Restore Purchases"}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="min-h-[44px] w-full font-body text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                Not now
              </button>
            )}
          </div>
        </footer>
      </motion.div>
    </div>
  );
}