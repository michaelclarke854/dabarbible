import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { fadeUp } from "@/lib/motionVariants";
import { trackEvent } from "@/lib/trackEvent";

interface LandingHeroProps {
  /** Called when the visitor wants to start. Should focus the question input. */
  onAsk: () => void;
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

const ROTATING_QUESTIONS = [
  "Why does God allow suffering?",
  "What does the Bible say about forgiveness?",
  "How do I pray when I feel nothing?",
  "What is my purpose?",
  "How do I forgive someone who hurt me?",
  "Is God angry with me?",
  "What does scripture say about grief?",
  "How do I trust God in uncertainty?",
];

export function LandingHero({ onAsk }: LandingHeroProps) {
  const shouldReduceMotion = useReducedMotion();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionVisible, setQuestionVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuestionVisible(false);
      window.setTimeout(() => {
        setQuestionIndex((i) => (i + 1) % ROTATING_QUESTIONS.length);
        setQuestionVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleCTA = () => {
    trackEvent("landing_hero_cta_clicked", { screen: "landing_hero" });
    onAsk();
  };

  // Disable framer animations entirely if user prefers reduced motion.
  const reveal = (delay: number) =>
    shouldReduceMotion
      ? { initial: false, animate: { opacity: 1, y: 0 } }
      : fadeUp(delay);

  return (
    <section className="px-6 py-14 sm:py-20 max-w-2xl mx-auto flex flex-col items-center text-center">
      {/* Wordmark */}
      <motion.div {...reveal(0)} className="mb-2">
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

      {/* Rotating question */}
      <motion.div {...reveal(0.3)} className="min-h-[2.5rem] mb-10">
        <p
          className={`font-['Playfair_Display'] italic text-base text-muted-foreground transition-opacity duration-300 ${
            questionVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          "{ROTATING_QUESTIONS[questionIndex]}"
        </p>
      </motion.div>

      {/* Example response preview card */}
      <motion.div
        {...reveal(0.45)}
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

      {/* CTA */}
      <motion.div {...reveal(0.6)} className="flex flex-col items-center">
        <button
          type="button"
          onClick={handleCTA}
          className="font-serif tracking-widest text-sm uppercase px-10 py-4 bg-gold text-primary-foreground rounded-sm transition-all duration-300 enabled:animate-golden-pulse enabled:hover:bg-gold-dark"
        >
          Ask your first question →
        </button>
        <p className="font-body text-xs text-muted-foreground mt-4 tracking-wide">
          Free · No card required · 30-day trial
        </p>
      </motion.div>
    </section>
  );
}

export default LandingHero;