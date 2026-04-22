import { useEffect } from "react";
import { trackEvent } from "@/lib/trackEvent";

interface TrialInterstitialProps {
  daysLeft: number;
  questionCount: number;
  topTheme: string | null;
  onUpgrade: () => void;
  onDismiss: () => void;
}

const TrialInterstitial = ({ daysLeft, questionCount, topTheme, onUpgrade, onDismiss }: TrialInterstitialProps) => {
  useEffect(() => {
    trackEvent("trial_interstitial_view", {
      screen: "trial_interstitial",
      metadata: { days_left: daysLeft, question_count: questionCount },
    });
  }, [daysLeft, questionCount]);

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12100A]/90 backdrop-blur-sm px-6">
    <div className="bg-card rounded-sm shadow-xl max-w-sm w-full p-8 border border-border text-center">
      <h2 className="font-serif text-3xl text-gold tracking-[0.15em] mb-2">DABAR</h2>
      <p className="text-gold font-serif text-sm tracking-wider mb-6">דָּבָר</p>

      <div className="w-8 h-px bg-gold mx-auto mb-6" />

      {questionCount > 0 && (
        <p className="font-body text-sm text-foreground/90 mb-2">
          You have asked <span className="text-gold font-serif">{questionCount}</span> questions over 21 days.
        </p>
      )}
      {topTheme && (
        <p className="font-body text-sm text-foreground/70 mb-4">
          Your most visited theme: <span className="text-gold italic">{topTheme}</span>.
        </p>
      )}

      <p className="font-serif text-lg text-foreground mt-4 mb-6">
        Your trial ends in {daysLeft} days.
      </p>

      <button
        onClick={() => {
          trackEvent("upgrade_click", { screen: "trial_interstitial", metadata: { days_left: daysLeft } });
          onUpgrade();
        }}
        className="w-full font-serif tracking-widest text-sm uppercase py-3 bg-gold text-primary-foreground rounded-sm transition-all hover:bg-gold-dark mb-3"
      >
        Continue my practice — $6.99/mo
      </button>
      <button
        onClick={onDismiss}
        className="w-full font-body text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
      >
        Remind me later
      </button>
    </div>
  </div>
  );
};

export default TrialInterstitial;
