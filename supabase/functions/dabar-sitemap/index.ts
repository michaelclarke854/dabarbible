import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://dabarbible.com";

const STATIC_PAGES: Array<{ url: string; changefreq: string; priority: string }> = [
  { url: "/", changefreq: "weekly", priority: "1.0" },
  { url: "/blog", changefreq: "daily", priority: "0.9" },
  { url: "/pricing", changefreq: "monthly", priority: "0.8" },
  { url: "/doctrine", changefreq: "yearly", priority: "0.3" },
  { url: "/privacy", changefreq: "yearly", priority: "0.3" },
  { url: "/terms", changefreq: "yearly", priority: "0.3" },
  { url: "/support", changefreq: "monthly", priority: "0.4" },
];

// Public question pages (hand-written, KJV only). Keep in sync with
// src/data/questionPages.ts.
const QUESTION_SLUGS = [
  "what-does-the-bible-say-about-anxiety",
  "what-does-the-bible-say-about-grief",
  "what-does-the-bible-say-about-fear",
  "what-does-the-bible-say-about-loneliness",
  "what-does-the-bible-say-about-forgiveness",
  "what-does-the-bible-say-about-purpose",
  "what-does-the-bible-say-about-doubt",
  "what-does-the-bible-say-about-worry-about-money",
  "what-does-the-bible-say-about-waiting-on-god",
  "what-does-the-bible-say-about-anger",
  "what-does-the-bible-say-about-depression",
  "what-does-the-bible-say-about-hope",
  "what-does-the-bible-say-about-guilt-and-shame",
  "what-does-the-bible-say-about-temptation",
  "what-does-the-bible-say-about-patience",
  "what-does-the-bible-say-about-feeling-far-from-god",
  "what-does-the-bible-say-about-prayer-when-god-feels-silent",
  "what-does-the-bible-say-about-starting-over",
  "what-does-the-bible-say-about-trusting-god-in-uncertainty",
  "what-does-the-bible-say-about-contentment",
  "what-does-the-bible-say-about-bitterness",
  "what-does-the-bible-say-about-courage",
];

const QUESTION_PAGES = QUESTION_SLUGS.map((slug) => ({
  url: `/questions/${slug}`,
  changefreq: "monthly",
  priority: "0.8",
}));

// Launch scripture set: Psalms 1-150 (KJV).
const SCRIPTURE_PAGES = Array.from({ length: 150 }, (_, i) => ({
  url: `/scripture/psalms/${i + 1}`,
  changefreq: "monthly",
  priority: "0.6",
}));

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: posts } = await supabase
    .from("dabar_blog_posts")
    .select("slug, updated_at")
    .eq("published", true);

  const blogUrls = (posts ?? []).map((p) => ({
    url: `/blog/${p.slug}`,
    lastmod: (p.updated_at ?? "").split("T")[0],
    changefreq: "monthly",
    priority: "0.8",
  }));

  const all = [
    ...STATIC_PAGES.map((p) => ({ ...p, lastmod: undefined as string | undefined })),
    ...blogUrls,
    ...QUESTION_PAGES.map((p) => ({ ...p, lastmod: undefined as string | undefined })),
    ...SCRIPTURE_PAGES.map((p) => ({ ...p, lastmod: undefined as string | undefined })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all
  .map(
    (p) =>
      `  <url><loc>${SITE_URL}${p.url}</loc>${
        p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ""
      }<changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
});