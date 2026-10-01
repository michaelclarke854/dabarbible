import { Link } from "react-router-dom";
import { Flame } from "lucide-react";

const PrivacyPage = () => {

  return (
    <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
    <Link to="/" className="flex items-center gap-2 text-gold hover:text-gold-dark transition-colors mb-10">
      <Flame size={16} strokeWidth={1.5} />
      <span className="font-serif text-sm tracking-widest uppercase">Dabar</span>
    </Link>

    <h1 className="font-serif text-3xl text-foreground tracking-wide mb-2">Privacy Policy</h1>
    <p className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-8">
      Effective: October 1, 2026
    </p>
    <div className="w-12 h-px bg-gold mb-8" />

    <div className="space-y-6 font-body text-sm text-foreground/90 leading-relaxed">
      <section><h2 className="font-serif text-lg mb-3">Who we are</h2><p>Elevare Digital LLC, a New Jersey limited liability company, North Brunswick, New Jersey, USA, operates Dabar. Contact <a href="mailto:privacy@dabarbible.com" className="text-gold underline">privacy@dabarbible.com</a> about your data.</p></section>
      <section><h2 className="font-serif text-lg mb-3">Information and purposes</h2><p>We collect account email and age group (not your exact birthdate) for sign-in and age-appropriate access; questions and generated answers to provide reflections; journal entries, saved reflections and prayers when you choose to use those tools; and usage, device, session and diagnostic information to operate, secure and improve Dabar. Guest questions may be processed without an account. We use account and subscription information for access and billing, and email for account and opted-in messages.</p></section>
      <section><h2 className="font-serif text-lg mb-3">Sensitive information and AI</h2><p>Your words may reveal religious beliefs, grief, or mental health concerns. These are sensitive. We never sell, rent or license your personal data, including anything about your faith. When you ask a question, its text and relevant context may be sent to Anthropic (Claude) or Google (Gemini via Lovable AI Gateway) to generate an answer. Dabar may process your journal history into private themes for personalized reflections; do not include anything you do not want processed. We do not intentionally use your questions to train our own AI models. We cannot independently verify downstream providers' training policies.</p></section>
      <section><h2 className="font-serif text-lg mb-3">Who processes information</h2><p>Lovable Cloud (powered by Supabase) hosts accounts, storage and functions. Anthropic and Google process AI requests. Resend delivers emails. Web checkout uses an external billing service with Freemius plans; the checkout provider's own notices govern payment details. Paddle code is present for a separate checkout path but is not the active browser checkout. Apple and RevenueCat process eligible iOS purchases. We do not collect your payment card number. We use internal usage events and may use Lovable's Umami analytics when available; no advertising pixel is intentionally loaded in the app. These services may process information in the United States or other countries.</p></section>
      <section><h2 className="font-serif text-lg mb-3">Retention and deletion</h2><p>We keep account data while your account is active. Signed-in free-plan answer history is marked for expiry after 90 days when a trial ends. Deleted journal reflections have a 30-day recovery window before scheduled cleanup; other saved data persists until you remove it or delete your account. To download your data or request account deletion, open Settings → Privacy &amp; Data. Account deletion removes associated app records and the login, but does not automatically cancel an Apple or web subscription; cancel it separately before deleting. Operational records and third-party copies may have their own retention periods.</p></section>
      <section><h2 className="font-serif text-lg mb-3">Your choices and rights</h2><p>You can request access, correction, export or deletion at <a href="mailto:privacy@dabarbible.com" className="text-gold underline">privacy@dabarbible.com</a>. You may also object to or request restriction of certain processing and withdraw consent where consent is the basis; withdrawal does not undo prior processing. We aim to respond within 30 days. Browser sign-in and preferences use essential storage; optional usage analytics may be available. We do not currently implement a separate Do Not Track or Global Privacy Control signal handler. We do not intentionally enable cross-site advertising tracking, but cannot guarantee how independently loaded platform services handle cross-site signals.</p></section>
      <section><h2 className="font-serif text-lg mb-3">Brazil</h2><p>For visitors in Brazil, we rely on performance of our service for account, questions and subscription processing; legitimate interests for security and service diagnostics; and consent where required for optional communications or sensitive data. Religious beliefs and information about mental health are sensitive personal data. Specific, separate consent for sensitive-data processing is not currently collected in the app; please do not submit such data until that choice is available if you require consent before processing. Data may be transferred to the United States for processing. You may contact us to exercise LGPD rights and complain to the ANPD (Brazil's data protection authority).</p></section>
      <section><h2 className="font-serif text-lg mb-3">Children and changes</h2><p>Dabar is for ages 13 and older. Ages 13–17 need parent or guardian permission. We do not knowingly collect personal data from children under 13; if we discover it, we will delete it. We will announce material policy changes by email or in-app notice and update the effective date above.</p></section>

      <section>
        <h2 className="font-serif text-lg text-foreground tracking-wide mb-3">DaBarBible Connector for Muse</h2>
        <p>
          If you ask Meta's Muse AI agent for a Bible verse through the DaBarBible connector, Muse sends us only the
          theme you asked for (for example, 'hope'). We do not receive your name, account, messages or any other
          personal information through the connector. We record only the theme and the time of each request to count
          usage. Muse's own handling of your conversations is governed by Meta's Muse Privacy Policy. Technical details:
          <a href="/muse" className="text-gold hover:underline">dabarbible.com/muse</a>.
        </p>
      </section>

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
