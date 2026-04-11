import { Link } from "react-router-dom";
import { Flame } from "lucide-react";

const TermsPage = () => (
  <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
    <Link to="/" className="flex items-center gap-2 text-gold hover:text-gold-dark transition-colors mb-10">
      <Flame size={16} strokeWidth={1.5} />
      <span className="font-serif text-sm tracking-widest uppercase">Dabar</span>
    </Link>

    <h1 className="font-serif text-3xl text-foreground tracking-wide mb-2">Terms of Service</h1>
    <p className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-8">
      Last updated: April 2026
    </p>
    <div className="w-12 h-px bg-gold mb-8" />

    <div className="space-y-6 font-body text-sm text-foreground/90 leading-relaxed">
      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">What Dabar is</h2>
        <p>
          Dabar is a personal spiritual guide that responds to your questions with wisdom drawn
          entirely from the King James Version of the Bible. It is not a substitute for
          professional counseling, medical advice, or pastoral care.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Using the service</h2>
        <p>
          You may use Dabar for personal, non-commercial purposes. You agree not to misuse the
          service, attempt to extract or reverse-engineer the underlying models, or use Dabar
          to generate content that misrepresents its origin.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Accounts</h2>
        <p>
39:           Creating an account is optional for your first question. After that, an account
40:           is required. You are responsible for keeping your login credentials secure. One person
41:           per account — do not share access.
42:         </p>
      </section>

      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Subscriptions and billing</h2>
        <ul className="space-y-2 list-none">
          <li className="flex items-start gap-2"><span className="text-gold mt-0.5">·</span>Free tier: 3 questions per day, no journal persistence.</li>
          <li className="flex items-start gap-2"><span className="text-gold mt-0.5">·</span>Paid plans renew automatically at the interval you chose (monthly or annual).</li>
          <li className="flex items-start gap-2"><span className="text-gold mt-0.5">·</span>You may cancel at any time. Access continues until the end of the current billing period.</li>
          <li className="flex items-start gap-2"><span className="text-gold mt-0.5">·</span>Refunds are handled on a case-by-case basis within 14 days of purchase.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Content and accuracy</h2>
        <p>
          Dabar draws exclusively from KJV scripture and presents wisdom in a pastoral voice.
          While we strive for scriptural accuracy, responses are generated with the aid of
          language models and may occasionally contain errors. Verify all scripture references
          independently.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Crisis and safety</h2>
        <p>
          Dabar is not equipped to handle mental health emergencies. If you or someone you know
          is in crisis, please contact the{" "}
          <a href="https://988lifeline.org" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
            988 Suicide & Crisis Lifeline
          </a>{" "}
          (call or text 988) or your local emergency services.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Your content</h2>
        <p>
          You retain full ownership of everything you write in your journal and reflections.
          We claim no rights to your content. When you delete your account, your content is
          permanently erased.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Changes to these terms</h2>
        <p>
          We may update these terms as the service evolves. Significant changes will be
          communicated via email to registered users. Continued use after changes constitutes
          acceptance.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">Contact</h2>
        <p>
          Questions about these terms? Reach us at{" "}
          <a href="mailto:support@dabarbible.com" className="text-gold hover:underline">support@dabarbible.com</a>.
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

export default TermsPage;
