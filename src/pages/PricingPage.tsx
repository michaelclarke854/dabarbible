import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PricingTier {
  key: string;
  name: string;
  price: string;
  studentPrice?: string;
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
    price: "Free",
    description: "Begin seeking.",
    features: ["3 questions per day", "No journal persistence"],
    cta: "Get Started",
  },
  {
    key: "personal",
    name: "Personal",
    price: "$6.99/mo",
    studentPrice: "$4.99/mo",
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
    price: "$12.99/mo",
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
    price: "$99/mo",
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
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showAnnual, setShowAnnual] = useState<Record<string, boolean>>({});

  const handleCheckout = async (planKey: string, hasAnnual: boolean) => {
    if (planKey === "free") {
      navigate("/");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in first.");
      return;
    }

    // Check if student
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
    }
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
        {tiers.map((tier) => (
          <div
            key={tier.key}
            className={`p-6 rounded-sm border transition-all ${
              tier.highlighted ? "border-gold bg-gold/5" : "border-border"
            }`}
          >
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-serif text-lg tracking-wide">{tier.name}</h3>
              <div className="text-right">
                <span className="font-serif text-lg text-gold">{tier.price}</span>
                {tier.studentPrice && (
                  <span className="block text-xs font-body text-muted-foreground">
                    Student: {tier.studentPrice}
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
              onClick={() => handleCheckout(tier.key, !!tier.hasAnnual)}
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
        ))}
      </div>

      <div className="text-center mt-12 pt-8 border-t border-border">
        <p className="font-body text-xs text-muted-foreground">
          Gift a year of wisdom —{" "}
          <button
            onClick={() => handleCheckout("gift", false)}
            className="text-gold hover:underline"
          >
            $59.99/year
          </button>
        </p>
      </div>
    </div>
  );
};

export default PricingPage;
