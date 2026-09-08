import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import NotFound from "@/pages/NotFound";
import { useContributor } from "@/hooks/useGuestPrompts";
import { ContributorAvatar } from "@/components/GuestPromptCard";
import { trackEvent } from "@/lib/trackEvent";

const formatWeek = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const ContributorPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { contributor, prompts, loading } = useContributor(slug);

  useEffect(() => {
    if (contributor) {
      trackEvent("contributor_page_view", { metadata: { slug: contributor.slug } });
    }
  }, [contributor]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!contributor) return <NotFound />;

  const role = [contributor.title, contributor.church].filter(Boolean).join(", ");
  const canonical = `https://dabarbible.com/${contributor.slug}`;
  const links = [
    { href: contributor.website_url, label: "Website" },
    { href: contributor.instagram_url, label: "Instagram" },
    { href: contributor.youtube_url, label: "YouTube" },
  ].filter((l) => !!l.href);

  return (
    <div className="min-h-screen">
      <SEO
        title={`${contributor.name} — Guest Reflection Prompts | Dabar`}
        description={`KJV reflection prompts from ${contributor.name}${
          role ? `, ${role}` : ""
        }. Read this week's guest prompt and reflect with Dabar.`}
        canonical={canonical}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            name: contributor.name,
            jobTitle: contributor.title ?? undefined,
            worksFor: contributor.church ?? undefined,
            description: contributor.bio,
            image: contributor.photo_url ?? undefined,
            url: canonical,
          },
        }}
      />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          to="/"
          className="font-serif-display text-[11px] tracking-[0.2em] uppercase text-gold hover:text-gold/80 transition-colors"
        >
          Dabar
        </Link>

        <header className="mt-10 flex items-start gap-5">
          <ContributorAvatar name={contributor.name} photoUrl={contributor.photo_url} size={84} />
          <div>
            <h1 className="font-serif text-3xl text-foreground leading-tight">{contributor.name}</h1>
            {role && <p className="font-body text-sm text-muted-foreground mt-1">{role}</p>}
            {contributor.location && (
              <p className="font-body text-[13px] text-muted-foreground/80">{contributor.location}</p>
            )}
          </div>
        </header>

        <p className="font-body text-[15px] text-foreground/90 leading-relaxed mt-8 whitespace-pre-line">
          {contributor.bio}
        </p>

        {links.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-5">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href as string}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-[11px] tracking-[0.15em] uppercase text-gold hover:text-gold/80 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>
        )}

        <div className="mt-10">
          <Link
            to="/"
            onClick={() => trackEvent("contributor_page_cta_clicked", { metadata: { slug: contributor.slug } })}
            className="inline-block font-body text-[11px] tracking-[0.15em] uppercase text-parchment bg-gold hover:bg-gold/90 transition-colors px-6 py-3 rounded-sm"
          >
            Reflect with Dabar
          </Link>
        </div>

        <section className="mt-14" aria-labelledby="prompts-heading">
          <h2
            id="prompts-heading"
            className="font-serif-display text-[11px] tracking-[0.18em] uppercase text-gold/80 mb-6"
          >
            Reflection prompts from {contributor.name.split(" ").slice(-1)[0]}
          </h2>

          {prompts.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground">
              The first prompt from this voice arrives soon.
            </p>
          ) : (
            <ul className="space-y-6">
              {prompts.map((p) => (
                <li key={p.id} className="rounded-sm border border-gold/20 bg-card p-6">
                  <p className="font-body text-[11px] text-muted-foreground mb-2">
                    {formatWeek(p.week_start)}
                  </p>
                  <h3 className="font-serif text-lg text-foreground mb-4 leading-snug">{p.title}</h3>
                  <div className="bg-scripture-card border-l-4 border-gold px-4 py-3 mb-4">
                    <p className="font-serif-display text-[10px] tracking-[0.12em] uppercase text-gold mb-1.5">
                      {p.scripture_ref} · KJV
                    </p>
                    <p className="font-['Playfair_Display'] italic text-[15px] text-foreground leading-relaxed">
                      {p.scripture_text}
                    </p>
                  </div>
                  <p className="font-body text-sm text-foreground/90 leading-relaxed">{p.prompt_body}</p>
                  {p.pastoral_note && (
                    <p className="font-body text-[13px] text-muted-foreground leading-relaxed mt-3">
                      {p.pastoral_note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default ContributorPage;
