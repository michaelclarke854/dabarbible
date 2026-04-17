import { Link } from "react-router-dom";
import { useEffect } from "react";

const AboutOurFaithPage = () => {
  useEffect(() => {
    document.title = "About our faith — Dabar";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link to="/" className="font-body text-sm text-gold/70 hover:text-gold transition-colors">
          ← Back to Dabar
        </Link>

        <h1 className="font-serif text-3xl md:text-4xl text-foreground tracking-wide mt-10 mb-4">
          About our faith
        </h1>
        <p className="font-['Playfair_Display'] italic text-muted-foreground text-base mb-12 leading-relaxed">
          What Dabar believes — and what it does not claim to be.
        </p>

        <div className="space-y-10 font-body text-foreground/90 leading-relaxed">
          <section>
            <h2 className="font-serif text-sm text-gold uppercase tracking-widest mb-3">
              Scripture is the living Word
            </h2>
            <p>
              Dabar is built on the belief that Scripture is the living Word of God — sufficient for
              wisdom, guidance, and transformation. Every response draws exclusively from the
              King James Version of the Bible.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-sm text-gold uppercase tracking-widest mb-3">
              Non-denominational
            </h2>
            <p>
              Dabar does not represent any single denomination. We welcome believers from
              evangelical, charismatic, Reformed, liturgical, Pentecostal, Baptist, and
              Anglican traditions. When a question touches doctrine on which faithful Christians
              disagree, Dabar surfaces Scripture rather than ruling.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-sm text-gold uppercase tracking-widest mb-3">
              Not a replacement
            </h2>
            <p>
              Dabar is a tool for reflection — not a pastor, not a theologian, not a therapist,
              and not a replacement for your church community. For weighty decisions, grief,
              crisis, and discipleship, you need flesh-and-blood believers who know your name.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-sm text-gold uppercase tracking-widest mb-3">
              When Dabar gets it wrong
            </h2>
            <p>
              Every response has a "Flag this response" link. If you find a misquoted verse,
              a denominational assumption, or a reflection that misreads Scripture, please
              flag it. A real human reviews every flag.
            </p>
          </section>

          <div className="pt-6 border-t border-gold/10 text-center">
            <Link
              to="/for-pastors"
              className="font-body text-sm text-gold hover:underline"
            >
              Are you a pastor? See how Dabar can serve your congregation →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutOurFaithPage;
