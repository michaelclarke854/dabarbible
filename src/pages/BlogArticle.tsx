import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { blogArticles } from "@/data/blogArticles";
import { Flame, ChevronLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = blogArticles.find((a) => a.slug === slug);

  useEffect(() => {
    if (article) {
      document.title = `${article.title} | Dabar — Biblical Wisdom & Prayer`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", article.metaDescription);
      const metaKw = document.querySelector('meta[name="keywords"]');
      if (metaKw) metaKw.setAttribute("content", article.keywords);
    }
    return () => {
      document.title = "Dabar — Biblical Wisdom & Prayer";
    };
  }, [article]);

  if (!article) return <Navigate to="/blog" replace />;

  return (
    <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <Link to="/blog" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={16} />
          <span className="font-body text-sm">All articles</span>
        </Link>
        <Link to="/" className="flex items-center gap-2 text-gold hover:text-gold-dark transition-colors">
          <Flame size={16} strokeWidth={1.5} />
          <span className="font-serif text-sm tracking-widest uppercase">Dabar</span>
        </Link>
      </div>

      <article>
        <h1 className="font-serif text-2xl md:text-3xl text-foreground tracking-wide leading-relaxed mb-8">
          {article.title}
        </h1>

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

      <div className="mt-16 pt-8 border-t border-border text-center">
        <p className="font-['Playfair_Display'] italic text-muted-foreground text-sm mb-4">
          The word that finds you.
        </p>
        <Link
          to="/"
          className="inline-block font-serif tracking-widest text-sm uppercase px-8 py-3 border border-gold text-gold rounded-sm hover:bg-gold hover:text-primary-foreground transition-all"
        >
          Ask Dabar
        </Link>
      </div>
    </div>
  );
};

export default BlogArticle;
