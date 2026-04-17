import { Link } from "react-router-dom";
import { Shield, Lock, Eye, Database, Trash2 } from "lucide-react";
import { useEffect } from "react";

const PrivacyPromisePage = () => {
  useEffect(() => {
    document.title = "Privacy Promise — Dabar";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link to="/" className="font-body text-sm text-gold/70 hover:text-gold transition-colors">
          ← Back to Dabar
        </Link>

        <div className="flex items-center gap-3 mt-10 mb-6">
          <Shield className="text-gold" size={28} />
          <h1 className="font-serif text-3xl md:text-4xl text-foreground tracking-wide">
            Your questions stay yours
          </h1>
        </div>

        <p className="font-['Playfair_Display'] italic text-muted-foreground text-base mb-12 leading-relaxed">
          Plain language. No legal hedging. This is how Dabar treats your data.
        </p>

        <div className="space-y-10">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Database size={16} className="text-gold" />
              <h2 className="font-serif text-sm text-gold uppercase tracking-widest">What we store</h2>
            </div>
            <p className="font-body text-foreground/90 leading-relaxed">
              The questions you ask, the responses you receive, your saved verses, and your journal entries —
              all encrypted and tied to your account. Nothing else.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Lock size={16} className="text-gold" />
              <h2 className="font-serif text-sm text-gold uppercase tracking-widest">What we never do</h2>
            </div>
            <ul className="space-y-2 font-body text-foreground/90 leading-relaxed">
              <li>· We never sell your questions to advertisers.</li>
              <li>· We never use your questions to train AI models.</li>
              <li>· We never share your reflections with your church, your pastor, or other members.</li>
              <li>· Your journal is private by default — only you can read it.</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Eye size={16} className="text-gold" />
              <h2 className="font-serif text-sm text-gold uppercase tracking-widest">AI transparency</h2>
            </div>
            <p className="font-body text-foreground/90 leading-relaxed">
              Dabar's responses are generated using Google Gemini through the Lovable AI Gateway.
              The model is instructed to draw exclusively from the King James Version of the Bible,
              acknowledge multiple Christian traditions, and approach Scripture with humility.
              Like any AI, it can be wrong. Always bring important questions to your pastor and your own reading of Scripture.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Trash2 size={16} className="text-gold" />
              <h2 className="font-serif text-sm text-gold uppercase tracking-widest">Your controls</h2>
            </div>
            <p className="font-body text-foreground/90 leading-relaxed mb-3">
              From <span className="text-gold">Settings → Privacy &amp; Data</span> you can:
            </p>
            <ul className="space-y-2 font-body text-foreground/90 leading-relaxed">
              <li>· Export every question, response, journal entry, and saved verse as a JSON file.</li>
              <li>· Delete all your journal entries (30-day recovery window).</li>
              <li>· Permanently delete your account and all associated data.</li>
            </ul>
          </section>

          <div className="pt-6 border-t border-gold/10">
            <p className="font-['Playfair_Display'] italic text-muted-foreground text-sm leading-relaxed">
              Questions about how your data is handled? Email{" "}
              <a href="mailto:privacy@dabarbible.com" className="text-gold hover:underline">
                privacy@dabarbible.com
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPromisePage;
