import { X } from "lucide-react";

interface TrialNudgeBannerProps {
  daysLeft: number;
  variant: "day14" | "day28";
  onDismiss: () => void;
  onUpgrade: () => void;
}

const TrialNudgeBanner = ({ daysLeft, variant, onDismiss, onUpgrade }: TrialNudgeBannerProps) => {
  const isPersistent = variant === "day28";

  return (
    <div className="w-full bg-gold/10 border-b border-gold/20 px-4 py-3 flex items-center justify-between gap-3">
      <p className="font-body text-xs text-foreground/90 leading-relaxed flex-1">
        {variant === "day14"
          ? `Your trial continues for ${daysLeft} more days. After that, $6.99/month keeps everything you are building here.`
          : `Your trial ends in ${daysLeft} days. Continue for $6.99/month.`}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        {variant === "day28" && (
          <button
            onClick={onUpgrade}
            className="text-[10px] font-serif tracking-widest uppercase px-3 py-1.5 bg-gold text-primary-foreground rounded-sm hover:bg-gold-dark transition-all"
          >
            Continue my practice →
          </button>
        )}
        {!isPersistent && (
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TrialNudgeBanner;
