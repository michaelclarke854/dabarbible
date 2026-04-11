import { Link } from "react-router-dom";
import { blogArticles } from "@/data/blogArticles";
import { Flame } from "lucide-react";

const BlogIndex = () => {
  return (
    <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <Link to="/" className="flex items-center gap-2 text-gold hover:text-gold-dark transition-colors mb-10">
        <Flame size={16} strokeWidth={1.5} />
        <span className="font-serif text-sm tracking-widest uppercase">Dabar</span>
      </Link>

      <h1 className="font-serif text-3xl md:text-4xl text-foreground tracking-wide mb-2">
        What are you carrying today?
      </h1>
      <p className="font-body text-sm text-muted-foreground mb-10">
        Scripture that meets you where you are.
      </p>

      <div className="w-12 h-px bg-gold mb-10" />

      <div className="space-y-8">
        {blogArticles.map((article) => (
          <Link
            key={article.slug}
            to={`/blog/${article.slug}`}
            className="block group"
          >
            <h2 className="font-serif text-lg md:text-xl text-foreground group-hover:text-gold transition-colors leading-relaxed">
              {article.title}
            </h2>
            <p className="font-body text-sm text-muted-foreground mt-1 leading-relaxed">
              {article.metaDescription}
            </p>
            <div className="w-8 h-px bg-border mt-6" />
          </Link>
        ))}
      </div>

      <div className="mt-16 text-center">
        <Link
          to="/"
          className="font-serif tracking-widest text-sm uppercase px-8 py-3 border border-gold text-gold rounded-sm hover:bg-gold hover:text-primary-foreground transition-all"
        >
          Ask Dabar
        </Link>
      </div>
    </div>
  );
};

export default BlogIndex;
