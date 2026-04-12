import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BillingConfirmModal from "@/components/BillingConfirmModal";
import { useLocalizedPrice } from "@/hooks/useLocalizedPrice";
import { Skeleton } from "@/components/ui/skeleton";

interface PricingTier {
  key: string;
  name: string;
  usdMonthly: number;
  usdAnnual?: number;
  studentUsdMonthly?: number;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  hasAnnual?: boolean;
}

const tiers: PricingTier[] = [
  {
    key: "free",
    name: "Free",
    usdMonthly: 0,
    description: "Start with a 30-day free trial. After that, $6.99/month or continue on the free plan.",
    features: ["30-day free trial with full access", "After trial: 3 questions per day", "No journal persistence on free plan"],
    cta: "Get Started",
  },
  {
    key: "personal",
    name: "Personal",
    usdMonthly: 6.99,
    usdAnnual: 59.99,
    studentUsdMonthly: 4.99,
    description: "For the daily seeker.",
    features: [
      "Unlimited questions",
      "Full Wisdom journal",
      "Full Reflections journal",
    ],
    cta: "Start Personal",
    highlighted: true,
    hasAnnual: true,
  },
  {
    key: "family",
    name: "Family",
    usdMonthly: 12.99,
    usdAnnual: 99.99,
    description: "For those who seek together.",
    features: [
      "Everything in Personal",
      "Up to 5 members",
      "Each journal is fully private",
    ],
    cta: "Start Family",
    hasAnnual: true,
  },
  {
    key: "community",
    name: "Community",
    usdMonthly: 99,
    description: "For churches, ministries, and schools.",
    features: [
      "Everything in Personal",
      "10+ members",
      "Admin sees usage only — never content",
    ],
    cta: "Start Community",
  },
];

const PricingPage = () => {
  const navigate = useNavigate();
  const { formatPrice, currency, loading: priceLoading, isNonUSD } = useLocalizedPrice();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showAnnual, setShowAnnual] = useState<Record<string, boolean>>({});
  const [confirmPlan, setConfirmPlan] = useState<{ key: string; displayPrice: string } | null>(null);

  const handleCheckout = async (planKey: string) => {
    if (planKey === "free") {
      navigate("/");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in first.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("age_group")
      .eq("user_id", session.user.id)
      .single();
    const isStudent = ["youth", "young_adult"].includes(profile?.age_group || "");

    const cycle = showAnnual[planKey] ? "annual" : "monthly";

    setLoadingPlan(planKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          planKey,
          cycle,
          userId: session.user.id,
          email: session.user.email,
          isStudent,
          returnUrl: window.location.origin,
        },
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

  const getDisplayPrice = (tier: PricingTier): string => {
    if (tier.key === "free") return "Free";
    const isAnnual = showAnnual[tier.key];
    if (isAnnual && tier.usdAnnual) {
      return `${formatPrice(tier.usdAnnual)}/yr`;
    }
    return `${formatPrice(tier.usdMonthly)}/mo`;
  };

  const handlePlanClick = (planKey: string, displayPrice: string) => {
    if (planKey === "free") {
      navigate("/");
      return;
    }
    setConfirmPlan({ key: planKey, displayPrice });
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
      <p className="font-body text-sm text-muted-foreground text-center mb-12">
        Choose the path that meets you where you are.
      </p>

      <div className="space-y-6">
        {tiers.map((tier) => {
          const displayPrice = getDisplayPrice(tier);
          return (
            <div
              key={tier.key}
              className={`p-6 rounded-sm border transition-all ${
                tier.highlighted ? "border-gold bg-gold/5" : "border-border"
              }`}
            >
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="font-serif text-lg tracking-wide">{tier.name}</h3>
                <div className="text-right">
                  {priceLoading && tier.key !== "free" ? (
                    <Skeleton className="h-6 w-20 bg-gold/10" />
                  ) : (
                    <span className="font-serif text-lg text-gold">{displayPrice}</span>
                  )}
                  {tier.studentUsdMonthly && !priceLoading && (
                    <span className="block text-xs font-body text-muted-foreground">
                      Student: {formatPrice(tier.studentUsdMonthly)}/mo
                    </span>
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
                {loadingPlan === tier.key ? "…" : tier.cta}
              </button>
            </div>
          );
        })}
      </div>

      {isNonUSD && !priceLoading && (
        <p className="text-center mt-6 font-body text-xs text-muted-foreground">
          Prices shown are estimates in {currency}. Your exact charge is confirmed by Stripe at checkout.
        </p>
      )}

      <div className="text-center mt-12 pt-8 border-t border-border">
        <p className="font-body text-xs text-muted-foreground">
          Gift a year of wisdom —{" "}
          <button
            onClick={() => handlePlanClick("gift", formatPrice(59.99) + "/year")}
            className="text-gold hover:underline"
          >
            {priceLoading ? "…" : `${formatPrice(59.99)}/year`}
          </button>
        </p>
      </div>

      {confirmPlan && (
        <BillingConfirmModal
          price={confirmPlan.displayPrice}
          onConfirm={() => handleCheckout(confirmPlan.key)}
          onCancel={() => setConfirmPlan(null)}
          loading={!!loadingPlan}
        />
      )}
    </div>
  );
};

export default PricingPage;
