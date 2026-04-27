import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BillingConfirmModal from "@/components/BillingConfirmModal";
import { useLocalizedPrice } from "@/hooks/useLocalizedPrice";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { trackEvent } from "@/lib/trackEvent";

const ALLOWED_CURRENCIES = [
  "usd", "gbp", "eur", "aud", "cad", "nzd", "ngn", "ghs", "kes", "zar", "tzs",
  "inr", "php", "sgd", "myr", "idr", "brl", "mxn", "cop", "clp", "jpy", "krw",
  "chf", "sek", "nok", "dkk", "pln", "huf", "ron", "czk", "aed", "try", "hkd",
];

interface PricingTier {
  key: string;
  name: string;
  planKey: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  hasAnnual?: boolean;
  hasStudent?: boolean;
}

const tiers: PricingTier[] = [
  {
    key: "free",
    name: "Free",
    planKey: "",
    description: "Start with a 30-day free trial. After that, continue on the free plan.",
    features: ["30-day free trial with full access", "After trial: 3 questions per day", "No journal persistence on free plan"],
    cta: "Get Started",
  },
  {
    key: "personal",
    name: "Personal",
    planKey: "personal",
    description: "For the daily seeker.",
    features: ["Unlimited questions", "Full Wisdom journal", "Full Reflections journal"],
    cta: "Start Personal",
    highlighted: true,
    hasAnnual: true,
    hasStudent: true,
  },
  {
    key: "family",
    name: "Family",
    planKey: "family",
    description: "For those who seek together.",
    features: ["Everything in Personal", "Up to 5 members", "Each journal is fully private"],
    cta: "Start Family",
    hasAnnual: true,
  },
  {
    key: "community",
    name: "Community",
    planKey: "community",
    description: "For churches, ministries, and schools.",
    features: ["Everything in Personal", "10+ members", "Admin sees usage only — never content"],
    cta: "Start Community",
  },
];

const formatTrialDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric" });

const PricingPage = () => {
  const navigate = useNavigate();
  const { formatPrice, getPriceEntry, formatAmount, currency, canOverride, loading: priceLoading, saveCurrencyPreference } = useLocalizedPrice();
  const { trial, plan, user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showAnnual, setShowAnnual] = useState<Record<string, boolean>>({});
  const [confirmPlan, setConfirmPlan] = useState<{ key: string; displayPrice: string } | null>(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const isPaid = plan !== "free" && plan !== "trial";

  useEffect(() => {
    trackEvent("pricing_view", {
      screen: "pricing",
      metadata: { plan, on_trial: trial.isOnTrial },
      userId: user?.id ?? null,
    });
  }, [plan, trial.isOnTrial, user?.id]);

  const handleCheckout = async (planKey: string) => {
    if (planKey === "free") {
      navigate("/");
      return;
    }
    trackEvent("checkout_start", {
      screen: "pricing",
      metadata: { plan: planKey, cycle: showAnnual[planKey] ? "annual" : "monthly" },
      userId: user?.id ?? null,
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in first.");
      return;
    }

    const cycle = showAnnual[planKey] ? "annual" : "monthly";

    setLoadingPlan(planKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { planKey, cycle },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Could not start checkout.");
    } finally {
      setLoadingPlan(null);
      setConfirmPlan(null);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Could not open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  const getDisplayPrice = (tier: PricingTier): string => {
    if (tier.key === "free") return "Free";
    const annual = showAnnual[tier.key];
    if (annual) {
      // Annual = monthly × 12 × 0.7 (~30% off). Show full annual total.
      const entry = getPriceEntry(tier.planKey);
      if (!entry) return "—";
      const annualMinor = Math.round(entry.amount * 12 * 0.7);
      return `${formatAmount(annualMinor, entry.currency)}/yr`;
    }
    return `${formatPrice(tier.planKey)}/mo`;
  };

  const handlePlanClick = (planKey: string, displayPrice: string) => {
    if (planKey === "free") {
      navigate("/");
      return;
    }
    setConfirmPlan({ key: planKey, displayPrice });
  };

  const ctaLabel = (tier: PricingTier) => {
    if (loadingPlan === tier.key) return "…";
    if (tier.key === "free") return tier.cta;
    if (trial.isOnTrial && trial.trialEndsAt) {
      return `Continue on ${tier.name}`;
    }
    return tier.cta;
  };

  return (
    <div className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      <button
        onClick={() => navigate("/")}
        className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        ← Back
      </button>

      <p className="font-serif text-2xl text-foreground tracking-wide text-center mb-2">
        What are you carrying today?
      </p>
      <p className="font-body text-sm text-muted-foreground text-center mb-6">
        Choose the path that meets you where you are.
      </p>

      {trial.isOnTrial && trial.trialEndsAt && (
        <p className="font-body text-xs text-gold text-center mb-10">
          Your trial continues until {formatTrialDate(trial.trialEndsAt)}. No charge until then.
        </p>
      )}
      {isPaid && (
        <div className="text-center mb-10">
          <p className="font-body text-xs text-muted-foreground mb-2">
            You're on the <span className="text-gold capitalize">{plan}</span> plan.
          </p>
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="font-body text-xs text-gold hover:underline disabled:opacity-50"
          >
            {portalLoading ? "Opening…" : "Manage subscription →"}
          </button>
        </div>
      )}

      {/* Trust bar */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mb-10 pb-6 border-b border-border/60">
        {[
          "30-day free trial — no card required",
          "Cancel any time from Settings",
          "Secure payments via Stripe",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <span className="text-gold text-xs">✦</span>
            <span className="font-body text-xs text-muted-foreground tracking-wide">
              {item}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {tiers.map((tier) => {
          const displayPrice = getDisplayPrice(tier);
          return (
            <div
              key={tier.key}
              className={`relative p-6 rounded-sm border transition-all ${
                tier.highlighted
                  ? "border-gold bg-gold/5 border-[1.5px]"
                  : "border-border"
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary-foreground font-serif text-[10px] tracking-[0.2em] uppercase px-3 py-1 rounded-sm">
                  Most popular
                </span>
              )}
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="font-serif text-lg tracking-wide">{tier.name}</h3>
                <div className="text-right">
                  {priceLoading && tier.key !== "free" ? (
                    <Skeleton className="h-6 w-20 bg-gold/10" />
                  ) : (
                    <span className="font-serif text-sm text-gold">{displayPrice}</span>
                  )}
                </div>
              </div>
              <p className="font-body text-sm text-muted-foreground mb-4">
                {tier.description}
              </p>
              <ul className="space-y-2 mb-4">
                {tier.features.map((feature, i) => (
                  <li key={i} className="font-body text-sm text-foreground/80 flex items-start gap-2">
                    <span className="text-gold mt-0.5">·</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {tier.hasAnnual && (
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAnnual[tier.key] || false}
                    onChange={() =>
                      setShowAnnual((prev) => ({ ...prev, [tier.key]: !prev[tier.key] }))
                    }
                    className="accent-gold"
                  />
                  <span className="font-body text-xs text-muted-foreground">
                    Annual billing (save ~30%)
                  </span>
                </label>
              )}

              <button
                onClick={() => handlePlanClick(tier.key, displayPrice)}
                disabled={loadingPlan === tier.key}
                className={`w-full font-serif text-sm tracking-widest uppercase py-3 rounded-sm transition-all disabled:opacity-50 ${
                  tier.highlighted
                    ? "bg-gold text-primary-foreground hover:bg-gold-dark"
                    : "border border-border text-foreground hover:border-gold"
                }`}
              >
                {ctaLabel(tier)}
              </button>
            </div>
          );
        })}
      </div>

      {canOverride && !priceLoading && (
        <div className="text-center mt-6">
          <span className="font-body text-xs text-muted-foreground">
            Showing prices in {currency.toUpperCase()} ·{" "}
          </span>
          {showCurrencyPicker ? (
            <select
              value={currency}
              onChange={(e) => {
                saveCurrencyPreference(e.target.value);
                setShowCurrencyPicker(false);
              }}
              className="font-body text-xs text-gold bg-transparent border-b border-gold/30 outline-none cursor-pointer"
            >
              {ALLOWED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          ) : (
            <button
              onClick={() => setShowCurrencyPicker(true)}
              className="font-body text-xs text-gold hover:underline bg-transparent border-none cursor-pointer p-0"
            >
              Change
            </button>
          )}
        </div>
      )}

      <div className="text-center mt-12 pt-8 border-t border-border">
        <p className="font-body text-xs text-muted-foreground">
          Gift a year of wisdom — <span className="text-muted-foreground/70 italic">coming soon</span>
        </p>
      </div>

      {confirmPlan && (
        <BillingConfirmModal
          price={confirmPlan.displayPrice}
          trialEndsAt={trial.isOnTrial ? trial.trialEndsAt : null}
          onConfirm={() => handleCheckout(confirmPlan.key)}
          onCancel={() => setConfirmPlan(null)}
          loading={!!loadingPlan}
        />
      )}
    </div>
  );
};

export default PricingPage;
