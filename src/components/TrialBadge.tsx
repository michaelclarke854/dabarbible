import { useState } from "react";

interface TrialBadgeProps {
  trialEndsAt: string;
}

const TrialBadge = ({ trialEndsAt }: TrialBadgeProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const endsAt = new Date(trialEndsAt);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const formattedDate = endsAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="relative">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className="text-[10px] font-body tracking-wider uppercase text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/20 hover:bg-gold/20 transition-colors"
      >
        Trial · {daysLeft}d left
      </button>
      {showTooltip && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowTooltip(false)} />
          <div className="absolute top-full right-0 mt-2 z-50 bg-card border border-border rounded-sm p-3 shadow-lg w-56">
            <p className="font-body text-xs text-foreground/90 leading-relaxed">
              Free trial — {daysLeft} days remaining.
            </p>
            <p className="font-body text-xs text-muted-foreground mt-1">
              $6.99/month after {formattedDate}.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default TrialBadge;
