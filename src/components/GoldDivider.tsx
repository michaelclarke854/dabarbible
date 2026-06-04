/**
 * Sacred section divider — soft gold hairlines with a center fleuron.
 * Use between major landing sections to break the long scroll.
 */
export function GoldDivider() {
  return (
    <div className="flex items-center gap-4 px-12 py-4 max-w-md mx-auto" role="presentation">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/30" />
      <span aria-hidden="true" className="text-gold/50 text-xs">✦</span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/30" />
    </div>
  );
}

export default GoldDivider;