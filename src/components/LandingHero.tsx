import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { fadeUp } from "@/lib/motionVariants";
import { trackEvent } from "@/lib/trackEvent";
import { TrustStrip } from "@/components/ask/TrustStrip";
import { KjvIntegrityBadge } from "@/components/KjvIntegrityBadge";
import { SEO } from "@/components/SEO";
import { PillarCard } from "@/components/PillarCard";
import { GoldDivider } from "@/components/GoldDivider";
import { ArticlesFooter } from "@/components/ArticlesFooter";
import { useFadeInOnScroll } from "@/hooks/useFadeInOnScroll";

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

const EXAMPLE_GRIEF = {
  question: "Where was God when I needed Him most?",
  mirror:
    "That question doesn't come from curiosity — it comes from a wound. Something happened that shook the ground beneath your faith, and you're still standing in the rubble.",
  scripture:
    "Psalm 34:18 — 'The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit.'",
  bridge:
    "Scripture doesn't promise you won't feel abandoned. It promises that in the depths of that feeling, God draws closest — even when you can't sense it yet.",
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
  const [searchParams] = useSearchParams();
  const landingContext = searchParams.get("context");
  const isGrief = landingContext === "grief";

  // Visual direction exploration: ?hero=1|2|3
  //   1 (default) = Locked Minimal (current sacred parchment + Cinzel)
  //   2           = Warm Pivot (warm parchment, Cormorant, warmer gold, soft photo wash)
  //   3           = Middle Path (locked tokens + small literary accent + slightly warmer rhythm)
  const heroVariant = (searchParams.get("hero") === "2"
    ? "warm"
    : searchParams.get("hero") === "3"
      ? "middle"
      : "locked") as "locked" | "warm" | "middle";

  const variantStyle: Record<string, string> =
    heroVariant === "warm"
      ? {
          // Warm pivot palette — overrides only inside this section.
          ["--gold" as string]: "32 50% 64%", // ~#D4A574 in HSL
          ["--background" as string]: "36 60% 96%", // ~#FBF7F0
          background:
            "radial-gradient(120% 60% at 80% 0%, rgba(212,165,116,0.22) 0%, rgba(251,247,240,0) 55%), linear-gradient(180deg, #FBF7F0 0%, #F5EFE3 100%)",
        }
      : heroVariant === "middle"
        ? {
            background:
              "radial-gradient(90% 40% at 90% 8%, rgba(196,151,58,0.10) 0%, rgba(245,240,232,0) 60%), hsl(var(--background))",
          }
        : {};

  const headlineFontFamily =
    heroVariant === "warm"
      ? "'Cormorant Garamond', 'Cormorant', serif"
      : undefined;

  const tagline = isGrief
    ? "For those carrying grief and the questions it brings"
    : "For the questions faith rarely answers cleanly";
  const hookCopy = isGrief
    ? "You don't have to carry this alone"
    : "Ask your first question — no account needed";
  const inputPlaceholder = isGrief
    ? "What are you carrying right now?"
    : "Or write your own question…";
  const example = isGrief ? EXAMPLE_GRIEF : EXAMPLE;

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

  const faqs = [
    {
      q: "Is Dabar Bible free?",
      a: "Yes. Dabar is free for 30 days with no card required, then $4.99/month for unlimited spiritual questions, daily devotionals, and scripture search.",
    },
    {
      q: "Which Bible translation does Dabar use?",
      a: "Dabar uses the King James Version (KJV) as its primary scripture source for every answer and devotional.",
    },
    {
      q: "How is Dabar different from YouVersion or Bible Gateway?",
      a: "Dabar is the only Bible app with a built-in AI companion — ask any spiritual question and receive a scripture-grounded answer, not just a verse list.",
    },
    {
      q: "Does Dabar offer a daily devotional?",
      a: "Yes. Dabar delivers a fresh daily devotional shaped by your questions, spiritual season, and KJV scripture journey.",
    },
    {
      q: "Can I use Dabar for a Bible reading plan?",
      a: "Yes. Dabar supports structured KJV Bible reading plans to guide you systematically through scripture.",
    },
  ];

  return (
    <section
      className="relative px-6 pt-10 pb-16 sm:pt-14 sm:pb-20 max-w-2xl mx-auto flex flex-col items-center text-center"
      style={variantStyle as React.CSSProperties}
      data-hero-variant={heroVariant}
    >
      {heroVariant !== "locked" && (
        <div
          aria-hidden
          className="absolute right-0 top-0 pointer-events-none hidden sm:block"
          style={{
            width: heroVariant === "warm" ? 320 : 140,
            height: heroVariant === "warm" ? 320 : 140,
            opacity: heroVariant === "warm" ? 0.35 : 0.55,
            background:
              heroVariant === "warm"
                ? "radial-gradient(closest-side, rgba(212,165,116,0.55), rgba(212,165,116,0) 70%)"
                : "radial-gradient(closest-side, rgba(196,151,58,0.18), rgba(196,151,58,0) 70%)",
          }}
        />
      )}
      {heroVariant === "middle" && (
        <div
          aria-hidden
          className="absolute right-4 top-12 font-serif text-gold/30 select-none hidden sm:block"
          style={{ fontSize: 64, lineHeight: 1, letterSpacing: "0.05em" }}
        >
          ✦
        </div>
      )}
      <SEO
        title="Dabar Bible — Ask the Bible Anything | AI Devotionals & Scripture Search"
        description="The first AI Bible companion. Ask any spiritual question, get scripture-backed answers, explore daily devotionals, KJV Bible reading plans, and personalized wisdom — powered by AI."
        keywords="bible app, free bible, ask the bible, AI bible study, daily devotional, bible reading plan, KJV bible, online bible, bible verses, scripture search, Christian devotional app"
        canonical="https://dabarbible.com"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "MobileApplication",
          name: "Dabar Bible",
          url: "https://dabarbible.com",
          description:
            "AI-powered Bible study, devotionals, and scripture search for Christians.",
          applicationCategory: "LifestyleApplication",
          operatingSystem: "iOS, Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          mainEntity: {
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        }}
      />
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
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "10.5px",
            letterSpacing: "0.18em",
            textTransform: "uppercase" as const,
            color: "rgba(184,145,58,0.6)",
            marginBottom: 6,
            animation: "dabar-fadeup 0.6s ease forwards",
          }}
        >
          A daily scripture reflection
        </p>
        <div
          aria-label="Dabar"
          className="font-serif text-4xl sm:text-5xl text-foreground tracking-widest"
        >
          DABAR
        </div>
        <p className="text-gold scripture-italic text-sm tracking-wider mt-1">
          דָּבָר · The Word
        </p>
      </motion.div>

      {/* Positioning headline — primary SEO H1 */}
      <motion.h1
        {...reveal(0.15)}
        className="font-serif text-foreground leading-tight max-w-md mt-6"
        style={{
          fontFamily: headlineFontFamily,
          fontSize: heroVariant === "locked" ? undefined : "1.85rem",
        }}
      >
        {heroVariant === "locked"
          ? "Ask the Bible Anything"
          : "Get Scripture-Grounded Answers to Your Deepest Questions"}
      </motion.h1>
      <motion.p
        {...reveal(0.18)}
        className="font-serif text-base sm:text-lg text-foreground/85 leading-relaxed max-w-md mt-3"
      >
        {tagline}
      </motion.p>

      <motion.p
        {...reveal(0.2)}
        className="font-body text-sm text-muted-foreground mt-3"
      >
        {hookCopy}
      </motion.p>

      <motion.p
        {...reveal(0.25)}
        className="font-body text-muted-foreground/50 mt-2 text-center"
        style={{ fontSize: "10px", letterSpacing: "0.04em" }}
      >
        Free for 30 days · $4.99/month after · Cancel anytime
      </motion.p>

      <div className="w-12 h-px bg-gold my-6" />

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
          "{example.question}"
        </p>
        <p className="font-body normal-case text-base sm:text-lg leading-relaxed text-foreground mb-4">
          {example.mirror}
        </p>
        <p className="scripture-italic text-base sm:text-lg leading-relaxed text-foreground/90 border-l-2 border-gold/60 pl-4 py-1 my-4">
          {example.scripture}
        </p>
        <p className="font-body normal-case text-base leading-relaxed text-foreground/85">
          {example.bridge}
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
          placeholder={inputPlaceholder}
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
          style={{
            width: "100%",
            height: 54,
            borderRadius: 6,
            border: "0.5px solid rgba(184,145,58,0.4)",
            background: "linear-gradient(135deg, #b8913a 0%, #d4a84b 100%)",
            color: "#0e0b07",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 16,
            fontStyle: "italic",
            fontWeight: 500,
            letterSpacing: "0.06em",
            cursor: !question.trim() || isLoading ? "not-allowed" : "pointer",
            opacity: !question.trim() || isLoading ? 0.4 : 1,
            transition: "all 0.3s ease",
            animation: !question.trim() && !isLoading ? "dabar-pulse-cta 3s ease-in-out infinite" : "none",
          }}
        >
          {isLoading ? "Seeking…" : "Seek Wisdom"}
        </button>

        <TrustStrip />

        <div className="flex justify-center mt-4">
          <KjvIntegrityBadge />
        </div>

        <p className="font-body text-[11px] text-muted-foreground/80 mt-3 text-center leading-relaxed">
          Scripture-grounded reflection ·{" "}
          <Link to="/doctrine" className="text-gold hover:underline">
            not pastoral counsel
          </Link>
        </p>
        <p className="font-body text-xs text-muted-foreground mt-1 text-center tracking-wide">
          Free · No card required
        </p>
      </motion.div>

      {/* FAQ — long-tail search targeting */}
      <LandingSections onFocusAsk={() => {
        const el = document.querySelector<HTMLTextAreaElement>("[data-ask-input]");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => el?.focus(), 400);
      }} />

      <motion.div {...reveal(0.55)} className="w-full mt-16 text-left">
        <h2 className="font-serif text-xl sm:text-2xl text-foreground text-center mb-6">
          Frequently Asked Questions
        </h2>
        <div className="space-y-5">
          {faqs.map((f) => (
            <div key={f.q} className="border-t border-gold/20 pt-4">
              <h3 className="font-serif text-base text-foreground mb-1.5">{f.q}</h3>
              <p className="font-body text-sm text-foreground/80 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Footer trust links */}
      <motion.div {...reveal(0.6)} className="mt-12 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-body tracking-wider uppercase">
        <Link to="/pricing" className="text-muted-foreground hover:text-gold transition-colors">
          Pricing
        </Link>
        <span className="text-muted-foreground/30" aria-hidden="true">·</span>
        <Link to="/blog" className="text-muted-foreground hover:text-gold transition-colors">
          Articles
        </Link>
        <span className="text-muted-foreground/30" aria-hidden="true">·</span>
        <Link to="/support" className="text-muted-foreground hover:text-gold transition-colors">
          Support
        </Link>
        <span className="text-muted-foreground/30" aria-hidden="true">·</span>
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

      {/* Site-wide internal links to the blog hub + featured articles (SEO crawlability) */}
      <ArticlesFooter />

      {/* Keyword-rich footer summary (low-emphasis, screen-reader friendly) */}
      <p className="font-body text-[11px] text-muted-foreground/70 leading-relaxed text-center max-w-xl mt-8">
        Dabar Bible is an AI-powered Bible study app offering daily devotionals, KJV scripture search,
        and personalized spiritual wisdom. Ask any question and receive scripture-backed answers rooted
        in the Word of God — a free Bible app for Christians seeking deeper devotional study.
      </p>
    </section>
  );
}

export default LandingHero;

/* ------------------------------------------------------------------ */
/* Restyled landing sections — sit between the inline ask and the FAQ. */
/* Each section fades in on scroll; sections are separated by GoldDivider. */
/* ------------------------------------------------------------------ */

function FadeSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, visible } = useFadeInOnScroll<HTMLElement>();
  return (
    <section
      ref={ref}
      className={`transition-all duration-700 ease-out will-change-transform ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </section>
  );
}

function LandingSections({ onFocusAsk }: { onFocusAsk: () => void }) {
  return (
    <div className="w-full mt-16">
      {/* ── Today's Word ─────────────────────────────────────── */}
      <FadeSection className="px-2 py-8">
        <div className="max-w-md mx-auto flex flex-col gap-8">
          <p className="font-body text-gold text-xs tracking-[0.3em] uppercase text-center">
            Today's Word
          </p>
          <h2 className="font-serif text-foreground text-3xl font-semibold text-center leading-snug">
            Where can you<br />meet God today?
          </h2>
          <div className="border border-gold/40 rounded-sm p-6 bg-gold/5">
            <p className="scripture-italic text-gold text-xl leading-relaxed text-center">
              "Be still, and know that I am God."
            </p>
            <p className="font-body text-foreground/50 text-xs text-center mt-3 tracking-widest uppercase">
              Psalm 46:10 · KJV
            </p>
          </div>
          <p className="font-body text-foreground/70 text-sm leading-relaxed text-center">
            Each morning, Dabar gives you a living word, a practice to carry into your day,
            and a reflection to bring you back.
          </p>
        </div>
      </FadeSection>

      <GoldDivider />

      {/* ── The Lifestyle Journey (pillars) ──────────────────── */}
      <FadeSection className="px-2 py-8">
        <div className="max-w-md mx-auto flex flex-col gap-2">
          <p className="font-body text-gold text-xs tracking-[0.3em] uppercase text-center mb-6">
            The Lifestyle Journey
          </p>
          <PillarCard
            icon="📖"
            title="The Word"
            description="A daily KJV scripture, chosen to meet you where you are today."
          />
          <PillarCard
            icon="🙏"
            title="The Practice"
            description="A simple spiritual discipline to carry God's word into your actions."
          />
          <PillarCard
            icon="🕊️"
            title="The Teaching"
            description="Deeper context — theology, history, and application from trusted voices."
          />
          <PillarCard
            icon="🫂"
            title="The Reflection"
            description="A private place to journal what God is stirring — yours alone, never shared."
          />
        </div>
      </FadeSection>

      <GoldDivider />

      {/* ── Testimonial ─────────────────────────────────────── */}
      <FadeSection className="px-2 py-8">
        <div className="max-w-md mx-auto flex flex-col gap-8">
          <p className="font-body text-gold text-xs tracking-[0.3em] uppercase text-center">
            A Sample of the Journey
          </p>
          <figure className="bg-gold/[0.08] border border-gold/25 rounded-sm p-6 flex flex-col gap-4">
            <blockquote className="scripture-italic text-foreground text-xl leading-relaxed">
              "Dabar gave me back the Bible. I had been a Christian for 20 years and never
              felt like I truly understood what I was reading — until I started asking it questions."
            </blockquote>
            <figcaption className="flex items-center gap-3 mt-2">
              <div
                aria-hidden="true"
                className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center font-body text-gold text-sm font-semibold"
              >
                T
              </div>
              <div>
                <p className="font-body text-foreground text-sm font-semibold">Tanya M.</p>
                <p className="font-body text-foreground/40 text-xs">Member since 2024</p>
              </div>
            </figcaption>
          </figure>
        </div>
      </FadeSection>

      <GoldDivider />

      {/* ── CTA — focuses the inline ask above ───────────────── */}
      <FadeSection className="px-2 py-10">
        <div className="max-w-md mx-auto flex flex-col items-center gap-6 text-center">
          <h2 className="font-serif text-foreground text-3xl font-semibold leading-snug">
            Start your free<br />daily devotional.
          </h2>
          <p className="font-body text-foreground/60 text-sm leading-relaxed max-w-xs">
            Join thousands of believers who start each morning with a living word.
            Free to begin. No credit card required.
          </p>
          <div className="flex items-center gap-2 text-gold/70">
            <span className="text-xs font-body">✦ 3 free questions/day</span>
            <span className="text-gold/30">|</span>
            <span className="text-xs font-body">✦ Cancel anytime</span>
          </div>
          <button
            type="button"
            onClick={onFocusAsk}
            className="w-full bg-gold text-primary-foreground font-body font-semibold text-base py-4 px-8 rounded-sm tracking-wide min-h-[56px] flex items-center justify-center active:opacity-90 transition-opacity hover:bg-gold-light"
          >
            Ask Your First Question — It's Free
          </button>
        </div>
      </FadeSection>
    </div>
  );
}
