import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Flame, ChevronLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { ArticlesFooter, ALL_ARTICLES } from "@/components/ArticlesFooter";

const AUTHOR = {
  name: "The Dabar Editorial Team",
  description:
    "Written by pastors, theologians, and writers who believe scripture speaks with living authority into every human moment. All articles use the King James Version exclusively.",
};

interface Post {
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  content: string;
  excerpt: string | null;
  published_at: string | null;
  reading_time_minutes: number | null;
  author_name: string;
  primary_keyword: string | null;
  schema_faq: Array<{ question: string; answer: string }> | null;
}

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Post | null>(null);
  const [neighbors, setNeighbors] = useState<{ prev: { slug: string; title: string } | null; next: { slug: string; title: string } | null }>({ prev: null, next: null });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    window.scrollTo(0, 0);
    (async () => {
      const { data, error } = await supabase
        .from("dabar_blog_posts")
        .select("slug,title,meta_title,meta_description,og_title,content,excerpt,published_at,reading_time_minutes,author_name,primary_keyword,schema_faq")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setArticle(data as Post);
      // fetch neighbors by published_at order
      const { data: list } = await supabase
        .from("dabar_blog_posts")
        .select("slug,title,published_at")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (list) {
        const idx = list.findIndex((p) => p.slug === slug);
        setNeighbors({
          prev: idx > 0 ? { slug: list[idx - 1].slug, title: list[idx - 1].title } : null,
          next: idx >= 0 && idx < list.length - 1 ? { slug: list[idx + 1].slug, title: list[idx + 1].title } : null,
        });
      }
      setLoading(false);
    })();
  }, [slug]);

  if (notFound) return <Navigate to="/blog" replace />;
  if (loading || !article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  const canonical = `https://dabarbible.com/blog/${article.slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.meta_title || article.title,
    description: article.meta_description || article.excerpt,
    keywords: article.primary_keyword,
    author: { "@type": "Organization", name: AUTHOR.name, url: "https://dabarbible.com" },
    publisher: { "@type": "Organization", name: "Dabar Bible", url: "https://dabarbible.com" },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    datePublished: article.published_at,
    inLanguage: "en",
  };
  const faqJsonLd =
    article.schema_faq && article.schema_faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: article.schema_faq.map((q) => ({
            "@type": "Question",
            name: q.question,
            acceptedAnswer: { "@type": "Answer", text: q.answer },
          })),
        }
      : null;

  return (
    <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <Helmet>
        <title>{article.meta_title || `${article.title} | Dabar Bible`}</title>
        <meta name="description" content={article.meta_description || article.excerpt || ""} />
        {article.primary_keyword ? <meta name="keywords" content={article.primary_keyword} /> : null}
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={article.og_title || article.meta_title || article.title} />
        <meta property="og:description" content={article.meta_description || article.excerpt || ""} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonical} />
        <script type="application/ld+json">{JSON.stringify(articleJsonLd)}</script>
        {faqJsonLd ? <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script> : null}
      </Helmet>

      <div className="flex items-center justify-between mb-10">
        <Link
          to="/blog"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} />
          <span className="font-body text-sm">All articles</span>
        </Link>
        <Link
          to="/"
          className="flex items-center gap-2 text-gold hover:text-gold-dark transition-colors"
        >
          <Flame size={16} strokeWidth={1.5} />
          <span className="font-serif text-sm tracking-widest uppercase">Dabar</span>
        </Link>
      </div>

      <article>
        <h1 className="font-serif text-2xl md:text-3xl text-foreground tracking-wide leading-relaxed mb-4">
          {article.title}
        </h1>

        <p className="font-body text-xs text-muted-foreground/60 uppercase tracking-wider mb-8">
          By {article.author_name || AUTHOR.name}
          {article.published_at
            ? ` · ${new Date(article.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
            : ""}
          {article.reading_time_minutes ? ` · ${article.reading_time_minutes} min read` : ""}
        </p>

        <div className="w-12 h-px bg-gold mb-8" />

        <div className="prose prose-dabar max-w-none">
          <ReactMarkdown
            components={{
              h2: ({ children }) => (
                <h2 className="font-serif text-xl text-foreground tracking-wide mt-10 mb-4">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="font-serif text-lg text-gold tracking-wide mt-8 mb-3">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="font-body text-base text-foreground/90 leading-relaxed mb-4">
                  {children}
                </p>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-6 pl-4 border-l-2 border-gold/40 italic">
                  {children}
                </blockquote>
              ),
              em: ({ children }) => (
                <em className="font-['Playfair_Display'] text-foreground/80">{children}</em>
              ),
              strong: ({ children }) => (
                <strong className="font-serif text-gold">{children}</strong>
              ),
            }}
          >
            {article.content}
          </ReactMarkdown>
        </div>
      </article>

      {/* Author Bio */}
      <div className="mt-12 pt-8 border-t border-border">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
            <Flame size={16} className="text-gold" />
          </div>
          <div>
            <p className="font-serif text-sm text-foreground tracking-wide">
              {article.author_name || AUTHOR.name}
            </p>
            <p className="font-body text-xs text-muted-foreground leading-relaxed mt-1">
              {AUTHOR.description}
            </p>
          </div>
        </div>
      </div>

      {/* Related Articles */}
      {(neighbors.prev || neighbors.next) && (
        <div className="mt-10 pt-8 border-t border-border">
          <p className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-4">
            Continue reading
          </p>
          <div className="space-y-3">
            {neighbors.next && (
              <Link
                to={`/blog/${neighbors.next.slug}`}
                className="block font-serif text-base text-foreground hover:text-gold transition-colors"
              >
                {neighbors.next.title} →
              </Link>
            )}
            {neighbors.prev && (
              <Link
                to={`/blog/${neighbors.prev.slug}`}
                className="block font-serif text-base text-foreground hover:text-gold transition-colors"
              >
                ← {neighbors.prev.title}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Related reading — surfaces 4 other posts as crawlable internal links */}
      <section aria-label="Related reading" className="mt-10 pt-8 border-t border-border">
        <p className="font-body text-xs uppercase tracking-widest text-gold/80 mb-4">
          Related reading
        </p>
        <ul className="space-y-3">
          {ALL_ARTICLES.filter((a) => a.slug !== article.slug)
            .slice(0, 4)
            .map((a) => (
              <li key={a.slug}>
                <Link
                  to={`/blog/${a.slug}`}
                  className="font-serif text-base text-foreground hover:text-gold transition-colors leading-snug"
                >
                  {a.title}
                </Link>
              </li>
            ))}
        </ul>
      </section>

      {/* CTA */}
      <div className="mt-12 pt-8 border-t border-border text-center">
        <p className="font-serif text-xl text-foreground tracking-wide mb-2">
          What are you carrying today?
        </p>
        <p className="font-body text-sm text-muted-foreground/70 mb-6">
          Bring it here. The word finds you.
        </p>
        <Link
          to="/"
          className="inline-block font-serif tracking-widest text-sm uppercase px-8 py-3 bg-gold text-primary-foreground rounded-sm hover:bg-gold-dark transition-all"
        >
          Ask Dabar
        </Link>
      </div>

      <ArticlesFooter />
    </div>
  );
};

export default BlogArticle;
