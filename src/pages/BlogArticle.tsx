import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { blogArticles } from "@/data/blogArticles";
import { Flame, ChevronLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";

const AUTHOR = {
  name: "The Dabar Editorial Team",
  description:
    "Written by pastors, theologians, and writers who believe scripture speaks with living authority into every human moment. All articles use the King James Version exclusively.",
};

function ArticleJsonLd({ article }: { article: (typeof blogArticles)[0] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    keywords: article.keywords,
    author: {
      "@type": "Organization",
      name: AUTHOR.name,
      url: "https://dabar.app",
    },
    publisher: {
      "@type": "Organization",
      name: "Dabar",
      url: "https://dabar.app",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://dabar.app/blog/${article.slug}`,
    },
    inLanguage: "en",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = blogArticles.find((a) => a.slug === slug);
  const articleIndex = blogArticles.findIndex((a) => a.slug === slug);
  const nextArticle = articleIndex >= 0 && articleIndex < blogArticles.length - 1 ? blogArticles[articleIndex + 1] : null;
  const prevArticle = articleIndex > 0 ? blogArticles[articleIndex - 1] : null;

  useEffect(() => {
    if (article) {
      document.title = `${article.title} | Dabar — Biblical Wisdom & Prayer`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", article.metaDescription);
      const metaKw = document.querySelector('meta[name="keywords"]');
      if (metaKw) metaKw.setAttribute("content", article.keywords);
    }
    window.scrollTo(0, 0);
    return () => {
      document.title = "Dabar — Biblical Wisdom & Prayer";
    };
  }, [article, slug]);

  if (!article) return <Navigate to="/blog" replace />;

  return (
    <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <ArticleJsonLd article={article} />

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
          By {AUTHOR.name}
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
              {AUTHOR.name}
            </p>
            <p className="font-body text-xs text-muted-foreground leading-relaxed mt-1">
              {AUTHOR.description}
            </p>
          </div>
        </div>
      </div>

      {/* Related Articles */}
      {(prevArticle || nextArticle) && (
        <div className="mt-10 pt-8 border-t border-border">
          <p className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-4">
            Continue reading
          </p>
          <div className="space-y-3">
            {nextArticle && (
              <Link
                to={`/blog/${nextArticle.slug}`}
                className="block font-serif text-base text-foreground hover:text-gold transition-colors"
              >
                {nextArticle.title} →
              </Link>
            )}
            {prevArticle && (
              <Link
                to={`/blog/${prevArticle.slug}`}
                className="block font-serif text-base text-foreground hover:text-gold transition-colors"
              >
                ← {prevArticle.title}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 pt-8 border-t border-border text-center">
        <p className="font-['Playfair_Display'] italic text-muted-foreground text-base mb-2">
          The word that finds you.
        </p>
        <p className="font-body text-sm text-muted-foreground/70 mb-6">
          Bring your real question. Not the polished version — the raw one.
        </p>
        <Link
          to="/"
          className="inline-block font-serif tracking-widest text-sm uppercase px-8 py-3 bg-gold text-primary-foreground rounded-sm hover:bg-gold-dark transition-all"
        >
          Ask Dabar
        </Link>
      </div>
    </div>
  );
};

export default BlogArticle;
