import { Link } from "react-router-dom";
import { useEffect } from "react";

const HowItWorksPage = () => {
  useEffect(() => {
    document.title = "How Dabar works — Dabar";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link to="/" className="font-body text-sm text-gold/70 hover:text-gold transition-colors">
          ← Back to Dabar
        </Link>

        <h1 className="font-serif text-3xl md:text-4xl text-foreground tracking-wide mt-10 mb-4">
          How Dabar works
        </h1>
        <p className="font-['Playfair_Display'] italic text-muted-foreground text-base mb-12 leading-relaxed">
          What happens between your question and the answer you receive.
        </p>

        <div className="space-y-10 font-body text-foreground/90 leading-relaxed">
          <section>
            <h2 className="font-serif text-sm text-gold uppercase tracking-widest mb-3">
              The technology
            </h2>
            <p>
              Dabar is powered by Google Gemini through the Lovable AI Gateway. The model is
              instructed by a custom system prompt that anchors every response to the King James
              Version of the Bible and asks it to approach Scripture with humility.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-sm text-gold uppercase tracking-widest mb-3">
              The flow
            </h2>
            <ol className="space-y-3 list-decimal list-inside marker:text-gold">
              <li>You ask a question.</li>
              <li>Your question is sent to Dabar's secure backend along with your private question history.</li>
              <li>The model returns a streaming response in four parts: the Mirror, the Scripture, the Wisdom Bridge, and the Threshold Question.</li>
              <li>The response is saved to your private journal — only you can read it.</li>
            </ol>
          </section>

          <section>
            <h2 className="font-serif text-sm text-gold uppercase tracking-widest mb-3">
              What AI can do well here
            </h2>
            <ul className="space-y-2 list-disc list-inside marker:text-gold">
              <li>Surface Scripture you might not have remembered.</li>
              <li>Connect Old Testament prophets to New Testament fulfilment.</li>
              <li>Personalise reflection to your specific question.</li>
              <li>Stay with you at 2am when no one else is awake.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-sm text-gold uppercase tracking-widest mb-3">
              What AI cannot do
            </h2>
            <ul className="space-y-2 list-disc list-inside marker:text-gold">
              <li>It can misquote or misattribute Scripture — always verify references.</li>
              <li>It cannot replace your pastor, your church, or your community.</li>
              <li>It may not handle highly denominational questions perfectly.</li>
              <li>It does not know you the way another believer does.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-sm text-gold uppercase tracking-widest mb-3">
              Feedback
            </h2>
            <p>
              Every response has a "Flag this response" button. We review every flag and use them
              to refine Dabar's instructions. See our{" "}
              <Link to="/about-our-faith" className="text-gold hover:underline">
                statement of faith
              </Link>{" "}
              and our{" "}
              <Link to="/privacy-promise" className="text-gold hover:underline">
                privacy promise
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
