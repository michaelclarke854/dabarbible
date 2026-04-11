import { useState, useEffect } from "react";

interface OnboardingScreenProps {
  onBegin: () => void;
}

const OnboardingScreen = ({ onBegin }: OnboardingScreenProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`min-h-screen flex flex-col items-center px-6 py-16 md:py-24 transition-opacity duration-1000 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
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

      <div className="w-12 h-px bg-gold mb-10" />

      {/* Body */}
      <div className="max-w-md w-full space-y-6 text-center">
        <p className="font-serif text-xl md:text-2xl text-foreground leading-relaxed">
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

        <div className="w-8 h-px bg-gold/40 mx-auto my-6" />

        <p className="font-body text-sm text-muted-foreground leading-relaxed">
          Your private journal preserves everything — the wisdom you received and the
          reflections you wrote in response. No one else can see it. Not even us.
        </p>

        {/* CTA */}
        <div className="pt-4">
          <button
            onClick={onBegin}
            className="font-serif tracking-widest text-sm uppercase px-10 py-4 border border-gold text-foreground rounded-sm transition-all duration-300 hover:bg-gold hover:text-primary-foreground animate-golden-pulse"
          >
            Begin
          </button>
          <p className="font-['Playfair_Display'] italic text-muted-foreground/60 text-xs mt-4">
            Ask free · No credit card required
          </p>
        </div>

        <div className="w-8 h-px bg-gold/40 mx-auto my-8" />

        {/* Closing scripture */}
        <div className="pb-12">
          <p className="font-serif text-base text-foreground/80 italic leading-relaxed">
            "Is not my word like as a fire? saith the LORD; and like a hammer
            that breaketh the rock in pieces?"
          </p>
          <p className="text-gold font-serif text-sm tracking-wide mt-3">
            — Jeremiah 23:29 (KJV)
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
