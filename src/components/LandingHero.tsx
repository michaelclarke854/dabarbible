import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { fadeUp } from "@/lib/motionVariants";
import { trackEvent } from "@/lib/trackEvent";

interface LandingHeroProps {
  /** Submit a question directly from the landing screen. */
  onSeekWisdom: (question: string) => void;
  /** Loading state while the question is being processed. */
  isLoading: boolean;
  /** Open the auth modal in sign-in mode for returning users. */
  onSignIn: () => void;
}

const EXAMPLE = {
  question: "Why does God allow suffering?",
  mirror:
    "You're sitting with one of the oldest questions in scripture — and the fact that you're asking it suggests you're carrying something real right now.",
  scripture:
    "Romans 8:18 — 'For I reckon that the sufferings of this present time are not worthy to be compared with the glory which shall be revealed in us.'",
  bridge:
    "Scripture does not explain suffering away — it enters into it. From Job to the Psalms to the cross, God consistently meets people in the middle of pain rather than removing it.",
};

const SEED_QUESTIONS = [
  "How do I forgive someone who isn't sorry?",
  "Why does God feel so distant right now?",
  "What does the Bible say about anxiety?",
  "I'm doubting my faith. Is that okay?",
  "How do I find purpose when I feel stuck?",
  "What does it mean to trust God in grief?",
  "I'm angry at God. What do I do with that?",
  "How do I pray when I don't know what to say?",
];

export function LandingHero({ onSeekWisdom, isLoading, onSignIn }: LandingHeroProps) {
  const shouldReduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [question, setQuestion] = useState("");

  // Pick 3 seed questions once per mount (stable across re-renders).
  const chips = useMemo(() => {
    const shuffled = [...SEED_QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  const handleChipTap = (q: string) => {
    if (isLoading) return;
    setQuestion(q);
    trackEvent("chip_question_tapped", {
      screen: "landing_hero",
      metadata: { question_length: q.length },
    });
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSubmit = () => {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;
    trackEvent("landing_hero_cta_clicked", {
      screen: "landing_hero",
      metadata: { used_chip: chips.includes(trimmed), question_length: trimmed.length },
    });
    onSeekWisdom(trimmed);
  };

  // Disable framer animations entirely if user prefers reduced motion.
  const reveal = (delay: number) =>
    shouldReduceMotion
      ? { initial: false, animate: { opacity: 1, y: 0 } }
      : fadeUp(delay);

  return (
    <section className="relative px-6 pt-10 pb-16 sm:pt-14 sm:pb-20 max-w-2xl mx-auto flex flex-col items-center text-center">
      {/* Sign-in link for returning users */}
      <div className="absolute right-4 top-3 sm:right-6 sm:top-4">
        <button
          type="button"
          onClick={onSignIn}
          className="font-body text-xs sm:text-sm tracking-wider text-gold/80 hover:text-gold transition-colors"
        >
          Sign in
        </button>
      </div>

      {/* Wordmark */}
      <motion.div {...reveal(0)} className="mb-2 mt-2">
        <h1 className="font-serif text-4xl sm:text-5xl text-foreground tracking-widest">
          DABAR
        </h1>
        <p className="text-gold scripture-italic text-sm tracking-wider mt-1">
          דָּבָר · The Word
        </p>
      </motion.div>

      {/* Positioning headline */}
      <motion.p
        {...reveal(0.15)}
        className="font-serif text-lg sm:text-xl text-foreground/90 leading-relaxed max-w-md mt-6"
      >
        Bring your questions to scripture.
        <br className="hidden sm:inline" />{" "}
        <span className="text-gold">Receive wisdom grounded in the Word.</span>
      </motion.p>

      <div className="w-12 h-px bg-gold my-8" />

      {/* Example response preview card — strongest proof of value */}
      <motion.div
        {...reveal(0.3)}
        className="dabar-glass w-full rounded-sm border border-gold/20 p-6 sm:p-8 text-left mb-10"
      >
        <div
          className="mb-4"
          style={{ height: '1px', width: '28px', background: 'rgba(196,151,58,0.4)' }}
        />
        <p className="font-['Playfair_Display'] italic text-sm text-muted-foreground mb-5 leading-relaxed">
          "{EXAMPLE.question}"
        </p>
        <p className="font-body normal-case text-base sm:text-lg leading-relaxed text-foreground mb-4">
          {EXAMPLE.mirror}
        </p>
        <p className="scripture-italic text-base sm:text-lg leading-relaxed text-foreground/90 border-l-2 border-gold/60 pl-4 py-1 my-4">
          {EXAMPLE.scripture}
        </p>
        <p className="font-body normal-case text-base leading-relaxed text-foreground/85">
          {EXAMPLE.bridge}
        </p>
      </motion.div>

      {/* Inline ask: tappable chips + textarea + submit — no navigation */}
      <motion.div {...reveal(0.45)} className="w-full text-left">
        <p className="font-body text-[11px] tracking-widest uppercase text-muted-foreground/80 mb-3 text-center">
          Or start with one of these
        </p>
        <div className="flex flex-wrap gap-2 justify-center mb-5">
          {chips.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleChipTap(q)}
              disabled={isLoading}
              className="rounded-full border border-gold/50 bg-transparent px-4 py-1.5 text-[13px] leading-snug text-foreground/85 font-body transition-all hover:border-gold hover:text-foreground hover:bg-gold/10 disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              {q}
            </button>
          ))}
        </div>

        <textarea
          ref={inputRef}
          data-ask-input=""
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Or write your own question…"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="w-full min-h-[120px] bg-input border-none outline-none resize-none text-base sm:text-lg font-body text-foreground placeholder:text-muted-foreground/60 leading-relaxed p-4 focus:ring-0 rounded-sm"
        />
        <div className="w-full h-px bg-border mb-4" />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!question.trim() || isLoading}
          className="w-full font-serif tracking-widest text-sm uppercase py-4 bg-gold text-primary-foreground rounded-sm transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-gold-dark"
        >
          {isLoading ? "Seeking…" : "Seek Wisdom"}
        </button>

        <p className="font-body text-[11px] text-muted-foreground/80 mt-3 text-center leading-relaxed">
          Scripture-grounded reflection ·{" "}
          <Link to="/doctrine" className="text-gold hover:underline">
            not pastoral counsel
          </Link>
        </p>
        <p className="font-body text-xs text-muted-foreground mt-1 text-center tracking-wide">
          Free · No card required · 30-day trial
        </p>
      </motion.div>

      {/* Footer trust links */}
      <motion.div {...reveal(0.6)} className="mt-12 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-body tracking-wider uppercase">
        <Link to="/privacy" className="text-muted-foreground hover:text-gold transition-colors">
          Privacy
        </Link>
        <span className="text-muted-foreground/30" aria-hidden="true">·</span>
        <Link to="/doctrine" className="text-muted-foreground hover:text-gold transition-colors">
          Our Beliefs
        </Link>
        <span className="text-muted-foreground/30" aria-hidden="true">·</span>
        <Link to="/terms" className="text-muted-foreground hover:text-gold transition-colors">
          Terms
        </Link>
      </motion.div>
    </section>
  );
}

export default LandingHero;