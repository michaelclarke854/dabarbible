interface TrialPaywallProps {
  questionCount: number;
  onUpgrade: () => void;
  onFreePlan: () => void;
}

const TrialPaywall = ({ questionCount, onUpgrade, onFreePlan }: TrialPaywallProps) => (
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

    <p className="font-serif text-lg text-gold mb-6">$6.99/month</p>

    <button
      onClick={onUpgrade}
      className="w-full max-w-xs font-serif tracking-widest text-sm uppercase py-4 bg-gold text-primary-foreground rounded-sm transition-all hover:bg-gold-dark animate-golden-pulse mb-3"
    >
      Continue my practice
    </button>
    <button
      onClick={onFreePlan}
      className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
    >
      Continue on free plan →
    </button>
  </div>
);

export default TrialPaywall;
