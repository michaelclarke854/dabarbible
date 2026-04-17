import { useState, useEffect, useRef } from "react";

interface OnboardingScreenProps {
  onBegin: () => void;
  onTryAsGuest?: () => void;
  /**
   * Called when the visitor submits the above-the-fold question box.
   * The parent (Index) routes this through the existing guest seek-wisdom flow,
   * so anonymous rate limiting and the soft/hard gate still apply.
   */
  onAskQuestion?: (question: string) => void | Promise<void>;
  guestQuestionsRemaining?: number | null;
}

const STARTER_PROMPTS = [
  "I feel lost in my career",
  "I'm making a big decision",
  "I feel anxious about the future",
  "I need direction",
];

const TESTIMONIALS = [
  {
    quote:
      "It helped me decide to leave my job. The question it asked back to me was more clarifying than six months of journaling.",
    attribution: "A reader in Texas",
  },
  {
    quote:
      "I was going through grief and didn't know how to pray. Dabar gave me language for what I was feeling.",
    attribution: "A reader in Toronto",
  },
  {
    quote:
      "I use it every morning before starting my day. It has replaced my devotional routine.",
    attribution: "A reader in Atlanta",
  },
];

const CtaButton = ({
  text,
  subtext,
  onClick,
}: {
  text: string;
  subtext?: string;
  onClick: () => void;
}) => (
  <div className="flex flex-col items-center">
    <button
      onClick={onClick}
      className="font-serif tracking-widest text-sm uppercase px-10 py-4 rounded-sm transition-all duration-300 hover:shadow-[0_0_18px_rgba(196,151,58,0.35)] hover:bg-gold-dark w-auto bg-gold text-primary-foreground border border-gold/40 animate-golden-pulse"
    >
      {text}
    </button>
    {subtext && (
      <p className="font-['Playfair_Display'] italic text-muted-foreground/60 text-xs mt-3">
        {subtext}
      </p>
    )}
  </div>
);

const OnboardingScreen = ({
  onBegin,
  onTryAsGuest,
  onAskQuestion,
  guestQuestionsRemaining,
}: OnboardingScreenProps) => {
  const [visible, setVisible] = useState(false);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Mark CTA as idle after 3s of no interaction so the gentle pulse kicks in
  useEffect(() => {
    const reset = () => {
      setIdle(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setIdle(true), 3000);
    };
    reset();
    window.addEventListener("mousemove", reset, { passive: true });
    window.addEventListener("keydown", reset);
    window.addEventListener("scroll", reset, { passive: true });
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("scroll", reset);
    };
  }, []);

  const isAtGuestLimit =
    typeof guestQuestionsRemaining === "number" && guestQuestionsRemaining <= 0;

  const submit = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || submitting) return;
    if (!onAskQuestion) {
      // Fallback: route through the normal "try as guest" entry
      onTryAsGuest?.();
      return;
    }
    setSubmitting(true);
    try {
      await onAskQuestion(trimmed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-opacity duration-1000 overflow-x-hidden ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex flex-col items-center px-6 pt-10 md:pt-16 flex-1">
        {/* Brand mark */}
        <div className="text-center mb-6">
          <h1 className="font-serif text-4xl md:text-5xl text-foreground tracking-[0.25em]">
            DABAR
          </h1>
          <p className="text-gold font-serif text-base tracking-wider mt-1">דָּבָר</p>
        </div>

        {/* HERO — outcome-focused, above the fold */}
        <section className="w-full max-w-2xl text-center mb-6">
          <h2 className="font-serif text-3xl md:text-4xl text-foreground leading-tight tracking-tight mb-3">
            Ask life's hardest questions.
            <span className="block text-gold-light italic font-['Playfair_Display'] text-2xl md:text-3xl mt-2 tracking-normal">
              Get scripture-guided answers.
            </span>
          </h2>

          <p className="font-body text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-6">
            Personal spiritual guidance in the voice of biblical wisdom — written for
            your specific moment, not a generic devotional.
          </p>

          {/* INTERACTIVE QUESTION BOX — above the fold, no sign-up */}
          <div className="bg-scripture-card border border-gold/20 rounded-sm p-5 md:p-6 mb-4 text-left shadow-[0_0_24px_rgba(196,151,58,0.08)]">
            <label
              htmlFor="hero-question"
              className="block font-serif text-xs uppercase tracking-widest text-gold mb-3"
            >
              {isAtGuestLimit
                ? "You've used your free questions"
                : "Ask your first question — free, no sign-up"}
            </label>

            <textarea
              id="hero-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What are you carrying today?"
              disabled={submitting || isAtGuestLimit}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(question);
                }
              }}
              className="w-full min-h-[88px] bg-input border border-transparent rounded-sm px-4 py-3 text-base font-body text-foreground placeholder:text-muted-foreground/55 leading-relaxed outline-none transition-all duration-200 focus:border-gold/60 focus:shadow-[0_0_18px_rgba(196,151,58,0.25)] disabled:opacity-60"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <p className="font-body text-[11px] text-muted-foreground/80">
                Your first answer in under 10 seconds. Private. No card required.
              </p>
              <button
                onClick={() => submit(question)}
                disabled={!question.trim() || submitting || isAtGuestLimit}
                className={`font-serif text-xs tracking-widest uppercase px-6 py-3 rounded-sm bg-gold text-primary-foreground transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold-dark ${
                  idle && !submitting && question.trim() ? "animate-idle-pulse" : ""
                }`}
              >
                {submitting ? "Seeking…" : "Get my answer"}
              </button>
            </div>

            {/* Starter prompts — one click → submit */}
            {!isAtGuestLimit && (
              <div className="mt-4">
                <p className="font-body text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-2">
                  Or start with one of these
                </p>
                <div className="flex flex-wrap gap-2">
                  {STARTER_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setQuestion(p);
                        submit(p);
                      }}
                      disabled={submitting}
                      className="font-body text-xs px-3 py-2 rounded-full border border-gold/25 text-foreground/85 bg-background/40 transition-all duration-150 hover:-translate-y-0.5 hover:border-gold/60 hover:text-gold disabled:opacity-50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {typeof guestQuestionsRemaining === "number" &&
              guestQuestionsRemaining > 0 &&
              guestQuestionsRemaining < 2 && (
                <p className="mt-3 font-body text-[11px] text-gold/80 text-right">
                  {guestQuestionsRemaining} free question
                  {guestQuestionsRemaining === 1 ? "" : "s"} left
                </p>
              )}
          </div>

          {/* Secondary CTA + social proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-3">
            <button
              onClick={onBegin}
              className="font-serif tracking-widest text-sm uppercase px-7 py-3 rounded-sm bg-gold/10 text-gold border border-gold/40 transition-all duration-300 hover:bg-gold/20"
            >
              Start Free — 30 Days, No Card Required
            </button>
          </div>

          <p className="font-['Playfair_Display'] italic text-muted-foreground/70 text-xs">
            Joined by 2,400+ believers seeking wisdom daily
          </p>
        </section>

        {/* SAMPLE OUTPUT — moved above the fold, with human descriptions */}
        <section
          id="sample-answer"
          className="w-full max-w-2xl mb-12 scroll-mt-8"
          aria-label="Sample DABAR response"
        >
          <p className="font-body text-[11px] uppercase tracking-widest text-muted-foreground text-center mb-4">
            Here's what a real DABAR response looks like
          </p>

          <p className="font-['Playfair_Display'] italic text-foreground/70 text-sm md:text-base mb-6 text-center">
            "I don't know if I made the right decision."
          </p>

          {/* Mirror — the headline copy lives here */}
          <div className="mb-5 flex gap-4">
            <div aria-hidden="true" className="text-2xl leading-none mt-0.5">🪞</div>
            <div>
              <p className="font-serif text-[11px] text-gold tracking-wide uppercase mb-1">
                A reflection of what you're really carrying
              </p>
              <p className="font-body text-base text-foreground/95 leading-relaxed">
                You are not afraid of the decision itself — you are afraid that you
                are not trustworthy enough to have made it.
              </p>
            </div>
          </div>

          {/* Scripture */}
          <div className="mb-5 flex gap-4">
            <div aria-hidden="true" className="text-2xl leading-none mt-0.5">📖</div>
            <div className="flex-1">
              <p className="font-serif text-[11px] text-gold tracking-wide uppercase mb-1">
                A scripture that speaks to this moment
              </p>
              <div className="rounded-sm p-4 bg-scripture-card border-l-4 border-gold mt-2">
                <p className="font-serif text-xs tracking-widest uppercase mb-2 text-gold">
                  Proverbs 3:5–6
                </p>
                <p className="font-['Playfair_Display'] italic text-foreground/85 leading-relaxed text-base">
                  "Trust in the LORD with all thine heart; and lean not unto thine
                  own understanding. In all thy ways acknowledge him, and he shall
                  direct thy paths."
                </p>
              </div>
            </div>
          </div>

          {/* Wisdom Bridge */}
          <div className="mb-5 flex gap-4">
            <div aria-hidden="true" className="text-2xl leading-none mt-0.5">💡</div>
            <div>
              <p className="font-serif text-[11px] text-gold tracking-wide uppercase mb-1">
                A piece of wisdom to sit with
              </p>
              <p className="font-body text-sm text-foreground/90 leading-relaxed">
                The question is not whether the decision was perfect. The question
                is whether you are willing to tend it well.
              </p>
            </div>
          </div>

          {/* Threshold */}
          <div className="mb-6 flex gap-4">
            <div aria-hidden="true" className="text-2xl leading-none mt-0.5">❓</div>
            <div>
              <p className="font-serif text-[11px] text-gold tracking-wide uppercase mb-1">
                A question to take with you
              </p>
              <p className="font-['Playfair_Display'] italic leading-relaxed text-gold-light text-base">
                What would it mean to trust yourself as much as you trust the outcome?
              </p>
            </div>
          </div>
        </section>

        {/* WHY DIFFERENT */}
        <section className="w-full max-w-2xl mb-12">
          <p className="font-body text-[11px] uppercase tracking-widest text-muted-foreground text-center mb-5">
            Why DABAR is different
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <li className="border border-gold/15 rounded-sm p-4">
              <p className="font-serif text-sm text-gold mb-1">Not a chatbot</p>
              <p className="font-body text-xs text-muted-foreground leading-relaxed">
                Structured wisdom format every time — never a conversation that drifts.
              </p>
            </li>
            <li className="border border-gold/15 rounded-sm p-4">
              <p className="font-serif text-sm text-gold mb-1">Not generic</p>
              <p className="font-body text-xs text-muted-foreground leading-relaxed">
                Responds to your specific moment and your actual words.
              </p>
            </li>
            <li className="border border-gold/15 rounded-sm p-4">
              <p className="font-serif text-sm text-gold mb-1">Not preachy</p>
              <p className="font-body text-xs text-muted-foreground leading-relaxed">
                Asks you a question back, not just at you.
              </p>
            </li>
          </ul>
        </section>

        {/* SOCIAL PROOF */}
        <section className="w-full max-w-3xl mb-12" aria-label="What readers are saying">
          <p className="font-body text-[11px] uppercase tracking-widest text-muted-foreground text-center mb-6">
            What readers are saying
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.attribution}
                className="bg-scripture-card border border-gold/15 rounded-sm p-5 text-left"
              >
                <blockquote className="font-['Playfair_Display'] italic text-foreground/85 text-sm leading-relaxed mb-3">
                  "{t.quote}"
                </blockquote>
                <figcaption className="font-body text-[11px] uppercase tracking-widest text-gold/80">
                  — {t.attribution}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* TRUST BAR */}
        <div className="w-full max-w-3xl border-y border-gold/10 py-4 mb-12">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-body uppercase tracking-widest text-muted-foreground/80">
            <li>All 66 books</li>
            <li className="text-gold/40">·</li>
            <li>Private &amp; encrypted</li>
            <li className="text-gold/40">·</li>
            <li>No data sold</li>
            <li className="text-gold/40">·</li>
            <li>Cancel anytime</li>
            <li className="text-gold/40">·</li>
            <li>No app download required</li>
          </ul>
        </div>

        {/* FORMAT EXPLANATION (kept, condensed) */}
        <div className="max-w-md w-full space-y-6 text-center mb-10">
          <p className="font-serif text-2xl md:text-3xl text-foreground leading-relaxed">
            What are you carrying today?
          </p>

          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            Dabar (<span className="font-serif">דָּבָר</span>) is the Hebrew word for the
            living, spoken word of God. Every response follows a sacred structure: a
            mirror of what you are carrying, a scripture for this moment, a wisdom
            bridge, and a question that sends you inward.
          </p>

          <div className="pt-2">
            <CtaButton
              text="Get Your First Answer Now"
              subtext="30 days free. No credit card. Cancel anytime."
              onClick={onBegin}
            />
          </div>
        </div>

        {/* PRIVACY */}
        <div className="text-center py-4 max-w-md w-full">
          <p className="font-serif text-foreground tracking-wide text-2xl">
            Your words stay yours.
          </p>
          <p className="font-body text-sm text-muted-foreground leading-relaxed mt-4 max-w-sm mx-auto">
            Your private journal preserves every response and reflection. No one can
            see it — not other members, not us.
          </p>
          <div className="mt-6">
            <CtaButton
              text="Start Free — 30 Days, No Card Required"
              onClick={onBegin}
            />
          </div>
        </div>

        {/* Closing scripture */}
        <div className="pb-8 max-w-md w-full text-center">
          <div className="w-8 h-px bg-gold/40 mx-auto my-8" />
          <p className="font-serif text-base text-foreground/80 italic leading-relaxed">
            "Is not my word like as a fire? saith the LORD; and like a hammer that
            breaketh the rock in pieces?"
          </p>
          <p className="text-gold font-serif text-sm tracking-wide mt-3">
            — Jeremiah 23:29 (KJV)
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-10 px-6 bg-nav">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="flex items-center justify-center gap-4">
            <div className="px-4 py-2 rounded border border-gold/30 text-gold font-body text-xs tracking-wide opacity-60">
              App Store — Coming Soon
            </div>
            <div className="px-4 py-2 rounded border border-gold/30 text-gold font-body text-xs tracking-wide opacity-60">
              Google Play — Coming Soon
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-body text-gold/70">
            <a href="/pricing" className="hover:text-gold transition-colors">Pricing</a>
            <span>·</span>
            <a href="/for-pastors" className="hover:text-gold transition-colors">For pastors</a>
            <span>·</span>
            <a href="/about-our-faith" className="hover:text-gold transition-colors">Our faith</a>
            <span>·</span>
            <a href="/how-it-works" className="hover:text-gold transition-colors">How it works</a>
            <span>·</span>
            <a href="/privacy-promise" className="hover:text-gold transition-colors">Privacy promise</a>
            <span>·</span>
            <a href="/privacy" className="hover:text-gold transition-colors">Privacy policy</a>
            <span>·</span>
            <a href="/terms" className="hover:text-gold transition-colors">Terms</a>
          </div>

          <p className="font-serif text-sm tracking-widest text-gold">
            Dabar — The word that finds you.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default OnboardingScreen;
