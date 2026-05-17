import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  structuredData?: object;
}

const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/V110zuRmJDZo5ji8KbCobIl5nJB2/social-images/social-1775932981978-Image_13.webp";

export const SEO = ({
  title = "Dabar Bible — AI-Powered Bible Study, Devotionals & Scripture Search",
  description = "Ask the Bible anything. Dabar gives you AI-powered scripture answers, daily devotionals, Bible reading plans, and KJV verse search — all in one spiritual companion app.",
  keywords = "bible app, free bible, online bible, bible verses, daily devotional, bible reading plan, KJV bible, audio bible, bible study app, ask the bible, AI bible, scripture search, Christian app, devotional app",
  canonical = "https://dabarbible.com",
  ogImage = DEFAULT_OG_IMAGE,
  structuredData,
}: SEOProps) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta name="keywords" content={keywords} />
    <link rel="canonical" href={canonical} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={ogImage} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonical} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={ogImage} />
    {structuredData && (
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    )}
  </Helmet>
);

export default SEO;