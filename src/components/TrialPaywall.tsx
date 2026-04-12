import { useState } from "react";

interface TrialPaywallProps {
  questionCount: number;
  onUpgrade: () => void;
  onFreePlan: () => void;
}

const TrialPaywall = ({ questionCount, onUpgrade, onFreePlan }: TrialPaywallProps) => {
  const [downgrading, setDowngrading] = useState(false);

  const handleFree = async () => {
    setDowngrading(true);
    await onFreePlan();
    setDowngrading(false);
  };

  return (
    <div className="min-h-screen bg-[#12100A] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-5xl text-gold tracking-[0.25em]">DABAR</h1>
      <p className="text-gold font-serif text-lg tracking-wider mt-2">דָּבָר</p>

      <div className="w-12 h-px bg-gold mt-6 mb-8" />

      <p className="font-serif text-2xl text-foreground mb-4">Your trial has ended.</p>

      {questionCount > 0 && (
        <p className="font-body text-sm text-foreground/70 mb-1">
          You asked <span className="text-gold font-serif">{questionCount}</span> questions.
        </p>
      )}
      <p className="font-body text-sm text-foreground/70 mb-8">
        Your history and journal are waiting.
      </p>

      {/* Comparison */}
      <div className="w-full max-w-md grid grid-cols-2 gap-4 mb-8 text-left">
        <div>
          <p className="font-serif text-xs text-muted-foreground uppercase tracking-widest mb-3">Free plan</p>
          <ul className="space-y-2 font-body text-xs text-foreground/70">
            <li className="flex items-start gap-1.5"><span className="text-gold">✓</span> 3 questions per day</li>
            <li className="flex items-start gap-1.5"><span className="text-gold">✓</span> Scripture tab</li>
            <li className="flex items-start gap-1.5"><span className="text-gold">✓</span> Basic responses</li>
            <li className="flex items-start gap-1.5"><span className="text-muted-foreground">✗</span> Journal access</li>
            <li className="flex items-start gap-1.5"><span className="text-muted-foreground">✗</span> History</li>
          </ul>
        </div>
        <div>
          <p className="font-serif text-xs text-gold uppercase tracking-widest mb-3">Personal plan</p>
          <ul className="space-y-2 font-body text-xs text-foreground/70">
            <li className="flex items-start gap-1.5"><span className="text-gold">✓</span> Unlimited questions</li>
            <li className="flex items-start gap-1.5"><span className="text-gold">✓</span> Full journal access</li>
            <li className="flex items-start gap-1.5"><span className="text-gold">✓</span> Personalized responses</li>
            <li className="flex items-start gap-1.5"><span className="text-gold">✓</span> History & patterns</li>
            <li className="flex items-start gap-1.5"><span className="text-gold">✓</span> All Bible versions</li>
          </ul>
        </div>
      </div>

      <p className="font-serif text-lg text-gold mb-6">$6.99/month</p>

      <button
        onClick={onUpgrade}
        className="w-full max-w-xs font-serif tracking-widest text-sm uppercase py-4 bg-gold text-primary-foreground rounded-sm transition-all hover:bg-gold-dark animate-golden-pulse mb-3"
      >
        Continue my practice
      </button>
      <button
        onClick={handleFree}
        disabled={downgrading}
        className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors py-2 disabled:opacity-50"
      >
        {downgrading ? "Switching…" : "Continue on free plan →"}
      </button>
    </div>
  );
};

export default TrialPaywall;
