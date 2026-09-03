import { Flame } from "lucide-react";

const StreakFlame = ({ streak }: { streak: number }) => {
  if (!streak || streak < 2) return null;
  return (
    <span
      aria-label={`${streak} day reflection streak`}
      title={`${streak} days of returning`}
      className="flex items-center gap-1 text-gold/90"
    >
      <Flame size={13} className="text-gold" aria-hidden="true" />
      <span className="font-serif-display text-[11px] tracking-[0.08em] tabular-nums">{streak}</span>
    </span>
  );
};

export default StreakFlame;
