interface PillarCardProps {
  icon: string;
  title: string;
  description: string;
}

/**
 * One row of the Lifestyle Journey pillars (Word / Practice / Teaching / Community).
 * Uses semantic tokens (gold, foreground) — never hardcoded hex.
 */
export function PillarCard({ icon, title, description }: PillarCardProps) {
  return (
    <div className="flex gap-4 items-start py-5 border-b border-gold/15 last:border-0">
      <div
        aria-hidden="true"
        className="w-10 h-10 rounded-sm bg-gold/10 border border-gold/30 flex items-center justify-center text-lg shrink-0 mt-0.5"
      >
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-body text-gold text-xs tracking-[0.2em] uppercase font-semibold">
          {title}
        </p>
        <p className="font-body text-foreground/65 text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

export default PillarCard;