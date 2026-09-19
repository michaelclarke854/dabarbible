import { Link, useNavigate, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import PublicSafetyFooter from "@/components/PublicSafetyFooter";
import ArticlesFooter from "@/components/ArticlesFooter";
import {
  bookToSlug,
  getQuestionPage,
  questionPages,
} from "@/data/questionPages";

export default function QuestionPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const page = getQuestionPage(slug);

  if (!page) {
    return (
      <main className="min-h-screen px-5 py-12 max-w-2xl mx-auto">
        <SEO
          title="Question not found — DaBar Bible"
          description="That page wasn't found."
          canonical="https://dabarbible.com/"
        />
        <h1 className="font-serif-display text-2xl text-foreground">
          That page wasn't found
        </h1>
        <ul className="mt-6 space-y-2">
          {questionPages.slice(0, 8).map((q) => (
            <li key={q.slug}>
              <Link
                to={`/questions/${q.slug}`}
                className="font-serif text-sm text-foreground/85 hover:text-gold transition-colors"
              >
                {q.question}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const canonical = `https://dabarbible.com/questions/${page.slug}`;
  const related = page.related
    .map((s) => getQuestionPage(s))
    .filter(Boolean) as ReturnType<typeof getQuestionPage>[];

  return (
    <main className="min-h-screen px-5 py-10 sm:py-14 max-w-2xl mx-auto">
      <SEO
        title={`${page.question} (KJV) | DaBar Bible`}
        description={page.metaDescription}
        canonical={canonical}
        keywords={`${page.question}, KJV, King James Version, bible verses`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: page.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: `${page.intro.join(" ")} ${page.passages
                  .map((p) => `${p.ref}: ${p.text}`)
                  .join(" ")}`,
              },
            },
          ],
        }}
      />

      <nav className="mb-6">
        <Link
          to="/"
          className="font-body text-[11px] tracking-[0.2em] uppercase text-muted-foreground hover:text-gold transition-colors"
        >
          ← DaBar Bible
        </Link>
      </nav>

      <h1 className="font-serif-display text-3xl sm:text-4xl text-foreground leading-tight">
        {page.question}
      </h1>

      <div className="mt-6 space-y-3">
        {page.intro.map((p, i) => (
          <p key={i} className="font-body text-[15px] leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </div>

      <div className="mt-10 space-y-8">
        {page.passages.map((p) => (
          <article key={p.ref}>
            <Link
              to={`/scripture/${bookToSlug(p.book)}/${p.chapter}`}
              className="font-body text-[11px] tracking-[0.2em] uppercase text-gold/90 hover:text-gold transition-colors"
            >
              {p.ref}
            </Link>
            <blockquote className="mt-3 border-l border-gold/30 pl-4">
              <p className="font-serif text-[17px] leading-[1.85] text-foreground/90">
                {p.text}
              </p>
            </blockquote>
            <p className="font-body text-sm text-muted-foreground mt-3">{p.note}</p>
          </article>
        ))}
      </div>

      <p className="font-body text-[15px] leading-relaxed text-muted-foreground mt-10">
        {page.closing}
      </p>

      <section className="mt-10 pt-8 border-t border-gold/15">
        <p className="font-serif text-lg text-foreground/90 leading-relaxed">
          If this is your question today, you can ask it in your own words.
        </p>
        <p className="font-body text-sm text-muted-foreground mt-2">
          You'll get a reflection grounded in scripture. No account needed to begin.
        </p>
        <button
          type="button"
          onClick={() => navigate(`/?q=${encodeURIComponent(page.question)}`)}
          className="mt-5 inline-flex items-center rounded-sm border border-gold/40 bg-gold/10 px-5 py-3 font-body text-sm tracking-wide text-gold hover:bg-gold/15 transition-colors"
        >
          Ask the Bible anything
        </button>
      </section>

      {related.length > 0 && (
        <nav aria-label="Related questions" className="mt-12 pt-8 border-t border-gold/15">
          <p className="font-body text-[11px] tracking-[0.25em] uppercase text-gold/80 mb-4">
            Related questions
          </p>
          <ul className="space-y-2">
            {related.map((q) => (
              <li key={q!.slug}>
                <Link
                  to={`/questions/${q!.slug}`}
                  className="font-serif text-sm text-foreground/85 hover:text-gold transition-colors"
                >
                  {q!.question}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <PublicSafetyFooter />
      <ArticlesFooter />
    </main>
  );
}
