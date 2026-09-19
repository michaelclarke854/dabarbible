import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import PublicSafetyFooter from "@/components/PublicSafetyFooter";
import ArticlesFooter from "@/components/ArticlesFooter";
import { fetchScripture, type VerseData } from "@/lib/fetchScripture";
import { __canonicalBooks } from "@/lib/scriptureParser";
import { questionPages } from "@/data/questionPages";

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function findBookBySlug(slug: string) {
  const s = (slug || "").toLowerCase();
  return (
    __canonicalBooks.find((b) => slugify(b.name) === s) ??
    __canonicalBooks.find((b) => b.aliases?.includes(s)) ??
    null
  );
}

export default function ScripturePage() {
  const { book: bookSlug = "", chapter: chapterParam = "" } = useParams();
  const navigate = useNavigate();
  const book = useMemo(() => findBookBySlug(bookSlug), [bookSlug]);
  const chapter = Number(chapterParam);
  const valid =
    !!book && Number.isFinite(chapter) && chapter >= 1 && chapter <= (book?.chapters ?? 0);

  const [verses, setVerses] = useState<VerseData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!valid || !book) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setVerses(null);
    fetchScripture(book.id, chapter, "kjv").then((res) => {
      if (cancelled) return;
      if (res.success && res.verses) setVerses(res.verses);
      else setError(res.friendlyMessage ?? "Unable to load this chapter right now.");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [book, chapter, valid]);

  if (!valid || !book) {
    return (
      <main className="min-h-screen px-5 py-12 max-w-2xl mx-auto">
        <SEO
          title="Chapter not found — DaBar Bible"
          description="That chapter wasn't found. Please check the book and chapter."
          canonical="https://dabarbible.com/"
        />
        <h1 className="font-serif-display text-2xl text-foreground">
          That chapter wasn't found
        </h1>
        <p className="font-body text-sm text-muted-foreground mt-3">
          Please check the book and chapter.{" "}
          <Link to="/" className="text-gold underline underline-offset-4">
            Return home
          </Link>
          .
        </p>
      </main>
    );
  }

  const title = `${book.name} ${chapter} (KJV) — Read the full chapter | DaBar Bible`;
  const canonical = `https://dabarbible.com/scripture/${slugify(book.name)}/${chapter}`;
  const description = `${book.name} chapter ${chapter} in the public-domain King James Version (1769), quoted in full.`;

  const relatedQuestions = questionPages
    .filter((q) => q.passages.some((p) => p.book === book.name))
    .slice(0, 4);

  const prev = chapter > 1 ? chapter - 1 : null;
  const next = chapter < book.chapters ? chapter + 1 : null;

  return (
    <main className="min-h-screen px-5 py-10 sm:py-14 max-w-2xl mx-auto">
      <SEO
        title={title}
        description={description}
        canonical={canonical}
        keywords={`${book.name} ${chapter}, ${book.name} ${chapter} KJV, King James Version, read ${book.name} ${chapter}`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `${book.name} ${chapter} (King James Version)`,
          description,
          url: canonical,
          isAccessibleForFree: true,
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
        {book.name} {chapter}
      </h1>
      <p className="font-body text-xs tracking-[0.18em] uppercase text-gold/80 mt-3">
        King James Version
      </p>

      <div className="mt-8">
        {loading && (
          <p className="font-body text-sm text-muted-foreground">Loading the chapter…</p>
        )}
        {error && !loading && (
          <p className="font-body text-sm text-muted-foreground">{error}</p>
        )}
        {verses && (
          <div className="space-y-3">
            {verses.map((v) => (
              <p
                key={v.verse}
                className="font-serif text-[17px] leading-[1.85] text-foreground/90"
              >
                <sup className="font-body text-[10px] text-gold/80 mr-1.5 align-super">
                  {v.verse}
                </sup>
                {v.text}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 mt-10 pt-6 border-t border-gold/15">
        {prev ? (
          <Link
            to={`/scripture/${slugify(book.name)}/${prev}`}
            className="font-body text-sm text-muted-foreground hover:text-gold transition-colors"
          >
            ← {book.name} {prev}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to={`/scripture/${slugify(book.name)}/${next}`}
            className="font-body text-sm text-muted-foreground hover:text-gold transition-colors text-right"
          >
            {book.name} {next} →
          </Link>
        ) : (
          <span />
        )}
      </div>

      <section className="mt-12">
        <p className="font-serif text-lg text-foreground/90 leading-relaxed">
          Is something in this chapter sitting with you?
        </p>
        <p className="font-body text-sm text-muted-foreground mt-2">
          You can bring it as a question, in your own words, and read a reflection
          grounded in scripture. No account needed to begin.
        </p>
        <button
          type="button"
          onClick={() =>
            navigate(`/?q=${encodeURIComponent(`What does ${book.name} ${chapter} mean for me today?`)}`)
          }
          className="mt-5 inline-flex items-center rounded-sm border border-gold/40 bg-gold/10 px-5 py-3 font-body text-sm tracking-wide text-gold hover:bg-gold/15 transition-colors"
        >
          Ask the Bible anything
        </button>
      </section>

      {relatedQuestions.length > 0 && (
        <nav aria-label="Related questions" className="mt-12 pt-8 border-t border-gold/15">
          <p className="font-body text-[11px] tracking-[0.25em] uppercase text-gold/80 mb-4">
            Related questions
          </p>
          <ul className="space-y-2">
            {relatedQuestions.map((q) => (
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
        </nav>
      )}

      <PublicSafetyFooter />
      <ArticlesFooter />
    </main>
  );
}
