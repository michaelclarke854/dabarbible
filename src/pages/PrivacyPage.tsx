import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { isNativeIos } from "@/lib/nativePlatform";

const PrivacyPage = () => {
  const nativeIos = isNativeIos();

  return (
  <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
    <Link to="/" className="flex items-center gap-2 text-gold hover:text-gold-dark transition-colors mb-10">
      <Flame size={16} strokeWidth={1.5} />
      <span className="font-serif text-sm tracking-widest uppercase">Dabar</span>
    </Link>

    <h1 className="font-serif text-3xl text-foreground tracking-wide mb-2">Privacy Policy</h1>
    <p className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-8">
      Last updated: April 2026
    </p>
    <div className="w-12 h-px bg-gold mb-8" />

    <div className="space-y-6 font-body text-sm text-foreground/90 leading-relaxed">
      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Your words stay yours.</h2>
        <p>
          Dabar exists to serve you in your most honest moments. We treat your privacy the way
          scripture treats the inner room — what happens there belongs to you and God alone.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">What we collect</h2>
        <ul className="space-y-2 list-none">
          <li className="flex items-start gap-2"><span className="text-gold mt-0.5">·</span>Your email address when you create an account.</li>
          <li className="flex items-start gap-2"><span className="text-gold mt-0.5">·</span>Your date of birth to determine age-appropriate content.</li>
          <li className="flex items-start gap-2"><span className="text-gold mt-0.5">·</span>The questions you ask and the responses you receive, stored in your private journal.</li>
          <li className="flex items-start gap-2"><span className="text-gold mt-0.5">·</span>Basic usage data: how many questions you ask per day.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">What we never do</h2>
        <ul className="space-y-2 list-none">
          <li className="flex items-start gap-2"><span className="text-gold mt-0.5">·</span>We never read your journal entries or reflections.</li>
          <li className="flex items-start gap-2"><span className="text-gold mt-0.5">·</span>We never sell, share, or monetize your personal data.</li>
          <li className="flex items-start gap-2"><span className="text-gold mt-0.5">·</span>We never use your questions to train AI models.</li>
          <li className="flex items-start gap-2"><span className="text-gold mt-0.5">·</span>We never display ads or use tracking pixels from third parties.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Data storage</h2>
        <p>
          Your data is stored securely using industry-standard encryption. Journal entries and
          reflections are tied to your account and accessible only to you. If you delete your
          account, all associated data is permanently removed.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Cookies</h2>
        <p>
          We use essential cookies only — to keep you signed in and to remember your preferences.
          We do not use advertising or analytics cookies.
        </p>
      </section>

      {!nativeIos && <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Third-party services</h2>
        <p>
          We use Stripe to process payments. Stripe handles your payment information directly —
          we never see or store your card details. You can review{" "}
          <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
            Stripe's privacy policy
          </a>.
        </p>
      </section>}

      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Contact</h2>
        <p>
          If you have questions about how your data is handled, reach out at{" "}
          <a href="mailto:privacy@dabarbible.com" className="text-gold hover:underline">privacy@dabarbible.com</a>.
        </p>
      </section>
    </div>

    <div className="mt-16 text-center">
      <Link
        to="/"
        className="font-serif tracking-widest text-sm uppercase px-8 py-3 border border-gold text-gold rounded-sm hover:bg-gold hover:text-primary-foreground transition-all"
      >
        Return to Dabar
      </Link>
    </div>
  </div>
  );
};

export default PrivacyPage;
