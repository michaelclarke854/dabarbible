import { useState, useEffect } from "react";

interface OnboardingScreenProps {
  onBegin: () => void;
}

const CtaButton = ({
  text,
  subtext,
  onClick,
}: {
  text: string;
  subtext: string;
  onClick: () => void;
}) => (
  <div className="flex flex-col items-center">
    <button
      onClick={onClick}
      className="font-serif tracking-widest text-sm uppercase px-10 py-4 rounded-sm transition-all duration-300 hover:shadow-[0_0_18px_rgba(196,151,58,0.35)] w-auto bg-gold text-primary-foreground border border-gold/40 animate-golden-pulse"
    >
      {text}
    </button>
    <p className="font-['Playfair_Display'] italic text-muted-foreground/60 text-xs mt-3">
      {subtext}
    </p>
  </div>
);

const OnboardingScreen = ({ onBegin }: OnboardingScreenProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

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

      {/* HERO — above the fold */}
      <section className="w-full max-w-2xl text-center mb-8">
        <h2 className="font-serif text-3xl md:text-4xl text-foreground leading-tight tracking-tight mb-4">
          Ask the Bible anything.
          <span className="block text-gold-light italic font-['Playfair_Display'] text-2xl md:text-3xl mt-2 tracking-normal">
            Get wisdom for where you are today.
          </span>
        </h2>

        <p className="font-body text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8">
          Dabar searches all 66 books of Scripture to answer your deepest questions —
          with context, reflection, and a journal to track how God is speaking to you.
        </p>

        {/* Sample Q+A card — concrete value above fold */}
        <div className="bg-scripture-card border border-gold/15 rounded-sm p-5 md:p-6 text-left max-w-xl mx-auto mb-8 shadow-[0_0_24px_rgba(196,151,58,0.06)]">
          <p className="font-['Playfair_Display'] italic text-foreground/70 text-sm md:text-base mb-4 leading-relaxed">
            "How do I trust God when everything feels uncertain?"
          </p>
          <div className="w-6 h-px bg-gold/50 mb-4" />
          <p className="font-serif text-xs tracking-widest uppercase text-gold mb-2">
            Proverbs 3:5–6
          </p>
          <p className="font-['Playfair_Display'] italic text-foreground/85 leading-relaxed text-base md:text-lg">
            "Trust in the LORD with all thine heart; and lean not unto thine own understanding…"
          </p>
        </div>

        {/* Dual CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-3">
          <button
            onClick={onBegin}
            className="font-serif tracking-widest text-sm uppercase px-8 py-4 rounded-sm bg-gold text-primary-foreground border border-gold/40 transition-all duration-300 hover:shadow-[0_0_18px_rgba(196,151,58,0.35)] hover:bg-gold-dark animate-golden-pulse"
          >
            Start your 30-day free trial
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("sample-answer");
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="font-body text-sm text-gold/80 hover:text-gold transition-colors underline-offset-4 hover:underline"
          >
            Try a free question first →
          </button>
        </div>

        <p className="font-['Playfair_Display'] italic text-muted-foreground/70 text-xs">
          Joined by 2,400+ believers seeking wisdom daily
        </p>
      </section>

      {/* TRUST BAR */}
      <div className="w-full max-w-3xl border-y border-gold/10 py-4 mb-12">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-body uppercase tracking-widest text-muted-foreground/80">
          <li>All 66 books</li>
          <li className="text-gold/40">·</li>
          <li>30-day free trial</li>
          <li className="text-gold/40">·</li>
          <li>Private &amp; encrypted</li>
          <li className="text-gold/40">·</li>
          <li>Cancel anytime</li>
        </ul>
      </div>

      <div className="w-8 h-px bg-gold/40 mx-auto mb-10" />

      {/* Body */}
      <div className="max-w-md w-full space-y-6 text-center">
        <p className="font-serif text-2xl md:text-3xl text-foreground leading-relaxed">
          What are you carrying today?
        </p>

        <p className="font-body text-sm text-muted-foreground leading-relaxed">
          Dabar (<span className="font-serif">דָּבָר</span>) is the Hebrew word for the living,
          spoken word of God — the same word used when God spoke light into existence, when the
          prophets delivered divine messages, and when scripture calls you by name in your darkest
          moment.
        </p>

        <div className="space-y-1">
          <p className="font-body text-sm text-muted-foreground/80">This is not a Bible study app.</p>
          <p className="font-body text-sm text-muted-foreground/80">This is not a devotional.</p>
          <p className="font-body text-sm text-muted-foreground/80">This is not a chatbot.</p>
        </div>

        <p className="font-body text-sm text-foreground/90 leading-relaxed">
          Dabar is a personal spiritual guide that meets you in your real moments —
          relationships, decisions, grief, fear, purpose, parenting, failure — and responds
          with the unified voice of the biblical prophets, disciples, and Jesus, drawn
          entirely from the King James Version of the Bible.
        </p>

        <div className="w-8 h-px bg-gold/40 mx-auto my-6" />

        <p className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-3">
          Every response follows a sacred structure
        </p>

        <div className="space-y-4 text-left">
          <div>
            <p className="font-serif text-sm text-gold tracking-wide">THE MIRROR</p>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Names what you are truly carrying beneath your question.
            </p>
          </div>
          <div>
            <p className="font-serif text-sm text-gold tracking-wide">THE SCRIPTURE</p>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Delivers one to three exact KJV verses that speak directly into your moment, rendered in full.
            </p>
          </div>
          <div>
            <p className="font-serif text-sm text-gold tracking-wide">THE WISDOM BRIDGE</p>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Connects the ancient word to your modern reality without rushing to resolution.
            </p>
          </div>
          <div>
            <p className="font-serif text-sm text-gold tracking-wide">THE THRESHOLD QUESTION</p>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Closes with a single precise question that sends you inward. This is the gift.
            </p>
          </div>
        </div>

        {/* 2. Post-structure CTA */}
        <div className="pt-4">
          <CtaButton
            text="Begin seeking"
            subtext="30 days free. No credit card. Cancel anytime."
            onClick={onBegin}
          />
        </div>

        <div className="w-8 h-px bg-gold/40 mx-auto my-8" />

        {/* 3. Example Response Section */}
        <div id="sample-answer" className="text-left scroll-mt-8">
          <p className="font-body text-xs uppercase tracking-widest text-muted-foreground text-center mb-6">
            This is what receiving looks like
          </p>

          <p className="font-['Playfair_Display'] italic text-foreground/70 text-sm mb-6 text-center">
            "I don't know if I made the right decision and I can't stop second-guessing myself."
          </p>

          {/* Mirror */}
          <div className="mb-5">
            <p className="font-serif text-xs text-gold tracking-wide uppercase mb-2">The Mirror</p>
            <p className="font-body text-sm text-foreground/90 leading-relaxed">
              You are not afraid of the decision itself — you are afraid that you are not trustworthy enough to have made it.
            </p>
          </div>

          {/* Scripture */}
          <div className="mb-5">
            <p className="font-serif text-xs text-gold tracking-wide uppercase mb-2">The Scripture</p>
            <div className="rounded-sm p-5 bg-scripture-card border-l-4 border-gold">
              <p className="font-serif text-xs tracking-widest uppercase mb-3 text-gold">
                Proverbs 3:5–6
              </p>
              <p className="font-['Playfair_Display'] italic text-foreground/85 leading-relaxed text-lg">
                "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths."
              </p>
            </div>
          </div>

          {/* Wisdom Bridge */}
          <div className="mb-5">
            <p className="font-serif text-xs text-gold tracking-wide uppercase mb-2">The Wisdom Bridge</p>
            <p className="font-body text-sm text-foreground/90 leading-relaxed">
              The command here is not to stop thinking. It is to stop treating your own understanding as the final judge. You made your decision — and now you are replaying the trial as though the verdict might change. But God does not ask you to be certain. He asks you to trust.
            </p>
          </div>

          {/* Threshold Question */}
          <div className="mb-6">
            <p className="font-serif text-xs text-gold tracking-wide uppercase mb-2">The Threshold Question</p>
            <p className="font-['Playfair_Display'] italic leading-relaxed text-gold-light text-base">
              What would it look like to release this decision into the hands that were guiding you before you ever made it?
            </p>
          </div>

          <div className="text-center">
            <CtaButton
              text="Experience this for yourself →"
              subtext=""
              onClick={onBegin}
            />
          </div>
        </div>

        <div className="w-8 h-px bg-gold/40 mx-auto my-8" />

        {/* 4. Privacy Section */}
        <div className="text-center py-4">
          <p className="font-serif text-foreground tracking-wide text-2xl">
            Your words stay yours.
          </p>
          <p className="font-body text-sm text-muted-foreground leading-relaxed mt-4 max-w-sm mx-auto">
            Your private journal preserves every response and reflection. No one can see it — not other members, not us.
          </p>
          <div className="mt-6">
            <CtaButton
              text="Start your free trial"
              subtext=""
              onClick={onBegin}
            />
          </div>
        </div>

        <div className="w-8 h-px bg-gold/40 mx-auto my-8" />

        {/* Closing scripture */}
        <div className="pb-8">
          <p className="font-serif text-base text-foreground/80 italic leading-relaxed">
            "Is not my word like as a fire? saith the LORD; and like a hammer
            that breaketh the rock in pieces?"
          </p>
          <p className="text-gold font-serif text-sm tracking-wide mt-3">
            — Jeremiah 23:29 (KJV)
          </p>
        </div>
      </div>
      </div>{/* end centered content wrapper */}

      {/* 6. Footer */}
      <footer className="w-full py-10 px-6 bg-nav">
        <div className="max-w-md mx-auto text-center space-y-6">
          {/* App Store badges */}
          <div className="flex items-center justify-center gap-4">
            <div className="px-4 py-2 rounded border border-gold/30 text-gold font-body text-xs tracking-wide opacity-60">
              App Store — Coming Soon
            </div>
            <div className="px-4 py-2 rounded border border-gold/30 text-gold font-body text-xs tracking-wide opacity-60">
              Google Play — Coming Soon
            </div>
          </div>

          {/* Links */}
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

          {/* Brand mark */}
          <p className="font-serif text-sm tracking-widest text-gold">
            Dabar — The word that finds you.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default OnboardingScreen;
