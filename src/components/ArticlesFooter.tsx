import { Link } from "react-router-dom";

/**
 * Site-wide internal-link footer for SEO crawlability.
 * Surfaces the /blog hub and the top KJV reflection articles as real
 * <a href> links (via react-router <Link>) so Googlebot can discover
 * and index every blog post from any page that renders this footer.
 */
export const FEATURED_ARTICLES: { slug: string; title: string }[] = [
  { slug: "daily-bible-reflection-app", title: "The Best Daily Bible Reflection App in 2026" },
  { slug: "what-does-the-bible-say-about-anxiety", title: "What Does the Bible Say About Anxiety?" },
  { slug: "kjv-bible-verses-for-grief-and-loss", title: "KJV Bible Verses for Grief and Loss" },
  { slug: "bible-verses-for-loneliness-kjv", title: "Bible Verses for Loneliness — KJV" },
  { slug: "what-does-the-bible-say-about-fear", title: "What Does the Bible Say About Fear?" },
  { slug: "how-to-hear-from-god-in-daily-life", title: "How to Hear From God in Daily Life" },
  { slug: "what-does-the-bible-say-about-purpose", title: "What Does the Bible Say About Purpose?" },
  { slug: "how-to-forgive-someone-who-hurt-you-biblical-guidance", title: "How to Forgive Someone Who Hurt You" },
];

export const ALL_ARTICLES: { slug: string; title: string }[] = [
  ...FEATURED_ARTICLES,
  { slug: "what-does-the-bible-say-about-feeling-lost", title: "What Does the Bible Say About Feeling Lost?" },
  { slug: "daily-bible-devotional-vs-ai-bible-app", title: "Daily Bible Devotional vs AI Bible App" },
  { slug: "what-is-the-kjv-bible-why-it-still-matters", title: "What Is the KJV Bible? Why It Still Matters" },
];

export function ArticlesFooter() {
  return (
    <nav
      aria-label="Articles"
      className="w-full mt-12 pt-8 border-t border-gold/15 text-left"
    >
      <div className="flex items-baseline justify-between mb-4">
        <p className="font-body text-[11px] tracking-[0.25em] uppercase text-gold/80">
          Read
        </p>
        <Link
          to="/blog"
          className="font-body text-[11px] tracking-wider uppercase text-muted-foreground hover:text-gold transition-colors"
        >
          All articles →
        </Link>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {FEATURED_ARTICLES.map((a) => (
          <li key={a.slug}>
            <Link
              to={`/blog/${a.slug}`}
              className="font-serif text-sm text-foreground/85 hover:text-gold transition-colors leading-snug"
            >
              {a.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default ArticlesFooter;