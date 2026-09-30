import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PublicSafetyFooter } from "@/components/PublicSafetyFooter";

const AboutPage = () => {
  return (
    <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <SEO
        title="About DaBarBible"
        description="Who builds DaBarBible, why it exists, what it is not, and how its scripture-grounded reflections are made."
        canonical="https://dabarbible.com/about"
      />
      <Link to="/" className="flex items-center gap-2 text-gold hover:text-gold-dark transition-colors mb-10">
        <Flame size={16} strokeWidth={1.5} />
        <span className="font-serif text-sm tracking-widest uppercase">Dabar</span>
      </Link>

      <h1 className="font-serif text-3xl text-foreground tracking-wide mb-2">About DaBarBible</h1>
      <div className="w-12 h-px bg-gold my-8" />

      <div className="space-y-8 font-body text-sm text-foreground/90 leading-relaxed">
        <section>
          <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Who builds it</h2>
          <p>DaBarBible is built by Michael Clarke, founder of Elevare Digital LLC.</p>
          {/* TODO: Personal note from Michael goes here. Leave empty until he writes it himself —
              do not add biography details, credentials, ministry roles or testimonials. */}
        </section>

        <section>
          <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Why it exists</h2>
          <p>
            A place to bring real-life questions to Scripture, honestly — grief, doubt, fear,
            decisions — and sit with what the Word says, without pretending the questions are simple.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">What it is not</h2>
          <p>
            DaBarBible is not a church, a pastor, or a doctrinal authority, and it is not pastoral,
            medical, legal or financial counsel. Read{" "}
            <Link to="/doctrine" className="text-gold hover:underline">what we believe</Link>.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">How answers are made</h2>
          <p>
            Reflections are written by AI models and grounded in the King James Version (1769).
            For guest answers, each quoted verse is checked against our stored KJV text before it is
            shown; we are working to apply the same check to every answer. Always read the passage in
            your own Bible. See the{" "}
            <Link to="/doctrine" className="text-gold hover:underline">AI disclosure</Link>.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Contact</h2>
          <p>
            <a href="mailto:support@dabarbible.com" className="text-gold hover:underline">
              support@dabarbible.com
            </a>
          </p>
        </section>
      </div>

      <PublicSafetyFooter />
    </div>
  );
};

export default AboutPage;
