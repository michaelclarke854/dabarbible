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
      className="font-serif tracking-widest text-sm uppercase px-10 py-4 rounded-sm transition-all duration-300 hover:shadow-[0_0_18px_rgba(196,151,58,0.35)]"
      style={{
        backgroundColor: "#0F0D0A",
        color: "#C4973A",
        border: "1px solid rgba(196,151,58,0.4)",
        animation: "cta-border-glow 3s ease-in-out infinite",
      }}
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
      <div className="flex flex-col items-center px-6 pt-16 md:pt-24 flex-1">
      {/* Glow keyframe */}
      <style>{`
        @keyframes cta-border-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(196,151,58,0.15); }
          50% { box-shadow: 0 0 20px rgba(196,151,58,0.35); }
        }
      `}</style>

      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="font-serif text-5xl md:text-6xl text-foreground tracking-[0.25em]">
          DABAR
        </h1>
        <p className="text-gold font-serif text-lg tracking-wider mt-2">דָּבָר</p>
        <p className="font-['Playfair_Display'] italic text-muted-foreground text-base tracking-wide mt-2">
          The word that finds you.
        </p>
      </div>

      <div className="w-12 h-px bg-gold mb-8" />

      {/* 1. Hero CTA */}
      <CtaButton
        text="Ask your first question — free"
        subtext="No account required for your first three questions."
        onClick={onBegin}
      />

      <div className="w-8 h-px bg-gold/40 mx-auto my-10" />

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
            text="Begin seeking — it's free"
            subtext="Try three questions free. No credit card."
            onClick={onBegin}
          />
        </div>

        <div className="w-8 h-px bg-gold/40 mx-auto my-8" />

        {/* 3. Example Response Section */}
        <div className="text-left">
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
            <div
              className="rounded-sm p-5"
              style={{
                borderLeft: "4px solid #C4973A",
                backgroundColor: "#EDE8DC",
              }}
            >
              <p className="font-serif text-xs tracking-widest uppercase mb-3" style={{ color: "#C4973A" }}>
                Proverbs 3:5–6
              </p>
              <p className="font-['Playfair_Display'] italic text-foreground/85 leading-relaxed" style={{ fontSize: "18px" }}>
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
            <p className="font-['Playfair_Display'] italic leading-relaxed" style={{ color: "#C4973A", fontSize: "16px" }}>
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
          <p className="font-serif text-foreground tracking-wide" style={{ fontSize: "26px" }}>
            Your words stay yours.
          </p>
          <p className="font-body text-sm text-muted-foreground leading-relaxed mt-4 max-w-sm mx-auto">
            Your private journal preserves every response and reflection. No one can see it — not other members, not us.
          </p>
          <div className="mt-6">
            <CtaButton
              text="Start free — no account needed"
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
      <footer
        className="w-full py-10 px-6"
        style={{ backgroundColor: "#0F0D0A" }}
      >
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
          <div className="flex items-center justify-center gap-4 text-xs font-body" style={{ color: "rgba(196,151,58,0.7)" }}>
            <a href="/pricing" className="hover:text-gold transition-colors">Pricing</a>
            <span>·</span>
            <a href="/privacy" className="hover:text-gold transition-colors">Privacy Policy</a>
            <span>·</span>
            <a href="/terms" className="hover:text-gold transition-colors">Terms</a>
          </div>

          {/* Brand mark */}
          <p className="font-serif text-sm tracking-widest" style={{ color: "#C4973A" }}>
            Dabar — The word that finds you.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default OnboardingScreen;
