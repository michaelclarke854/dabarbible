import { useNavigate } from "react-router-dom";

interface PricingTier {
  name: string;
  price: string;
  studentPrice?: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const tiers: PricingTier[] = [
  {
    name: "Free",
    price: "Free",
    description: "Begin seeking.",
    features: ["3 questions per day", "No journal persistence"],
    cta: "Get Started",
  },
  {
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
  },
  {
    name: "Family",
    price: "$12.99/mo",
    description: "For those who seek together.",
    features: [
      "Everything in Personal",
      "Up to 5 members",
      "Each journal is fully private",
    ],
    cta: "Start Family",
  },
  {
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

  return (
    <div className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      <button
        onClick={() => navigate("/")}
        className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        ← Back
      </button>

      <h1 className="font-serif text-3xl text-foreground tracking-wide text-center mb-2">
        Choose Your Path
      </h1>
      <p className="font-body text-sm text-muted-foreground text-center mb-12">
        Free · Personal $6.99/mo · Family $12.99/mo · Community $99/mo
      </p>

      <div className="space-y-6">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`p-6 rounded-sm border transition-all ${
              tier.highlighted
                ? "border-gold bg-gold/5"
                : "border-border"
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
            <ul className="space-y-2 mb-6">
              {tier.features.map((feature, i) => (
                <li key={i} className="font-body text-sm text-foreground/80 flex items-start gap-2">
                  <span className="text-gold mt-0.5">·</span>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              className={`w-full font-serif text-sm tracking-widest uppercase py-3 rounded-sm transition-all ${
                tier.highlighted
                  ? "bg-gold text-primary-foreground hover:bg-gold-dark"
                  : "border border-border text-foreground hover:border-gold"
              }`}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="text-center mt-12 pt-8 border-t border-border">
        <p className="font-body text-xs text-muted-foreground">
          Gift a year of wisdom —{" "}
          <button className="text-gold hover:underline">$59.99/year</button>
        </p>
      </div>
    </div>
  );
};

export default PricingPage;
