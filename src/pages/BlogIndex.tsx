import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PostRow {
  slug: string;
  title: string;
  excerpt: string | null;
  meta_description: string | null;
  published_at: string | null;
  reading_time_minutes: number | null;
}

const BlogIndex = () => {
  const [posts, setPosts] = useState<PostRow[]>([]);

  useEffect(() => {
    supabase
      .from("dabar_blog_posts")
      .select("slug,title,excerpt,meta_description,published_at,reading_time_minutes")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .then(({ data }) => setPosts((data as PostRow[] | null) || []));
  }, []);

  return (
    <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <Helmet>
        <title>The Dabar Bible Blog — KJV Wisdom for Every Season</title>
        <meta
          name="description"
          content="Scripture that meets you where you are. KJV-grounded reflections on anxiety, grief, purpose, prayer, and the practice of daily Bible reading."
        />
        <link rel="canonical" href="https://dabarbible.com/blog" />
      </Helmet>

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
        {posts.map((article) => (
          <Link
            key={article.slug}
            to={`/blog/${article.slug}`}
            className="block group"
          >
            <h2 className="font-serif text-lg md:text-xl text-foreground group-hover:text-gold transition-colors leading-relaxed">
              {article.title}
            </h2>
            <p className="font-body text-sm text-muted-foreground mt-1 leading-relaxed">
              {article.excerpt || article.meta_description}
            </p>
            {article.reading_time_minutes ? (
              <p className="font-body text-xs text-muted-foreground/60 mt-2 uppercase tracking-widest">
                {article.reading_time_minutes} min read
              </p>
            ) : null}
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
