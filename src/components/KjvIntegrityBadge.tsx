import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Public trust mark: scripture in DaBar is quoted from the public-domain
 * King James Version (1769).
 */
export function KjvIntegrityBadge({
  variant = "inline",
  className = "",
}: {
  variant?: "inline" | "seal";
  className?: string;
}) {
  if (variant === "seal") {
    return (
      <div
        className={`inline-flex flex-col items-center gap-2 rounded-sm border border-gold/30 bg-gold/5 px-5 py-4 text-center ${className}`}
      >
        <ShieldCheck size={18} className="text-gold" strokeWidth={1.5} />
        <span className="font-serif-display text-[10px] tracking-[0.16em] uppercase text-gold">
          King James Version
        </span>
        <span className="font-body text-[11px] leading-relaxed text-muted-foreground/80 max-w-[15rem]">
          Scripture is quoted from the public-domain King James Version (1769).
        </span>
      </div>
    );
  }

  return (
    <Link
      to="/doctrine"
      className={`inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/5 px-3 py-1 transition-colors hover:border-gold/50 ${className}`}
      aria-label="King James Version — scripture is quoted from the public-domain King James Version (1769)"
    >
      <ShieldCheck size={11} className="text-gold" strokeWidth={1.6} />
      <span className="font-body text-[9.5px] font-light tracking-[0.1em] uppercase text-gold/90">
        King James Version
      </span>
    </Link>
  );
}

export default KjvIntegrityBadge;
