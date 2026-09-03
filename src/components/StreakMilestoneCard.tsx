import { Flame, X } from "lucide-react";
import type { StreakStats } from "@/hooks/useReflectionStreak";

interface Props {
  day: number;
  streak: number;
  stats?: StreakStats;
  onDismiss: () => void;
}

const PASTORAL_NOTE: Record<number, { title: string; verse: string; reference: string; note: string }> = {
  7: {
    title: "Seven days of returning",
    verse: "Evening, and morning, and at noon, will I pray, and cry aloud: and he shall hear my voice.",
    reference: "Psalm 55:17",
    note: "A week is where habit begins to become worship. David did not pray because he felt like it — he prayed at fixed hours, in every mood. What you have built this week is not a score; it is a rhythm your soul can lean on when feeling runs dry.",
  },
  14: {
    title: "Two weeks in the Word",
    verse: "But his delight is in the law of the LORD; and in his law doth he meditate day and night.",
    reference: "Psalm 1:2",
    note: "Meditation in scripture is slow work. Fourteen days of returning means you are no longer visiting the text — you are beginning to live near it. Notice how the passages have started to answer one another.",
  },
  21: {
    title: "Twenty-one days of listening",
    verse: "Thy word have I hid in mine heart, that I might not sin against thee.",
    reference: "Psalm 119:11",
    note: "Three weeks is long enough for scripture to begin surfacing on its own — in traffic, in conflict, at two in the morning. That is what hiding the Word in the heart means. It is no longer only something you read; it is something that reads you.",
  },
  30: {
    title: "A month of faithfulness",
    verse: "Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ.",
    reference: "Philippians 1:6",
    note: "Thirty days is not a finish line. It is evidence — of a work begun in you that you did not start and will not have to finish alone. Keep the rhythm loosely and the Lord tightly; if a day is missed, return the next. Faithfulness is measured in returning, not in unbroken records.",
  },
};

const StreakMilestoneCard = ({ day, streak, stats, onDismiss }: Props) => {
  const content = PASTORAL_NOTE[day] ?? PASTORAL_NOTE[7];

  const substance: string[] = [];
  if (stats) {
    if (stats.psalmCount > 0)
      substance.push(`You've reflected on ${stats.psalmCount} Psalm${stats.psalmCount === 1 ? "" : "s"}`);
    if (stats.themeCount > 0)
      substance.push(
        `You've explored ${stats.themeCount} Biblical theme${stats.themeCount === 1 ? "" : "s"}${
          stats.themes.length ? ` — ${stats.themes.slice(0, 3).join(", ")}` : ""
        }`
      );
    if (stats.bookCount > 0)
      substance.push(`You've read across ${stats.bookCount} book${stats.bookCount === 1 ? "" : "s"} of scripture`);
    if (stats.reflectionCount > 0)
      substance.push(
        `You've written ${stats.reflectionCount} reflection${stats.reflectionCount === 1 ? "" : "s"} in your own hand`
      );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center px-6 py-10 overflow-y-auto animate-fade-in-up">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-2">
          <button
            onClick={onDismiss}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rounded-sm border border-gold/30 bg-card p-7 text-center shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Flame size={18} className="text-gold animate-candle-glow" aria-hidden="true" />
            <span className="font-serif-display text-[11px] tracking-[0.18em] uppercase text-gold/80">
              Day {day}
            </span>
          </div>

          <h2 className="font-serif text-2xl text-foreground tracking-wide mb-5">{content.title}</h2>

          <div className="bg-scripture-card border-l-4 border-gold text-left px-5 py-4 mb-6">
            <p className="font-serif-display text-[10px] tracking-[0.12em] uppercase text-gold mb-2">
              {content.reference}
            </p>
            <p className="font-['Playfair_Display'] italic text-[15px] text-foreground leading-relaxed">
              {content.verse}
            </p>
          </div>

          {substance.length > 0 && (
            <ul className="text-left space-y-2 mb-6">
              {substance.map((line) => (
                <li key={line} className="font-body text-sm text-foreground/90 leading-relaxed flex gap-2">
                  <span className="text-gold" aria-hidden="true">
                    ·
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="font-body text-sm text-muted-foreground leading-relaxed text-left mb-7">{content.note}</p>

          <button
            onClick={onDismiss}
            className="font-body text-xs tracking-[0.15em] uppercase text-parchment bg-gold hover:bg-gold/90 transition-colors px-7 py-3 rounded-sm"
          >
            Continue
          </button>

          {streak > day && (
            <p className="font-body text-[11px] text-muted-foreground/60 mt-4">
              You're on day {streak} now.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StreakMilestoneCard;
