import { useState } from "react";
import { Link } from "react-router-dom";
import { Quote } from "lucide-react";
import { useCurrentGuestPrompt } from "@/hooks/useGuestPrompts";
import { trackEvent } from "@/lib/trackEvent";
import GuestPromptArchive from "@/components/GuestPromptArchive";

interface Props {
  onReflect?: (prompt: string) => void;
}

const ContributorAvatar = ({
  name,
  photoUrl,
  size = 44,
}: {
  name: string;
  photoUrl: string | null;
  size?: number;
}) =>
  photoUrl ? (
    <img
      src={photoUrl}
      alt={`Portrait of ${name}`}
      loading="lazy"
      width={size}
      height={size}
      className="rounded-full object-cover border border-gold/40 shrink-0"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      aria-hidden="true"
      className="rounded-full border border-gold/40 bg-scripture-card flex items-center justify-center font-serif text-gold shrink-0"
      style={{ width: size, height: size, fontSize: size / 2.6 }}
    >
      {name.charAt(0)}
    </div>
  );

const GuestPromptCard = ({ onReflect }: Props) => {
  const { prompt } = useCurrentGuestPrompt();
  const [archiveOpen, setArchiveOpen] = useState(false);

  if (!prompt || !prompt.contributor) return null;
  const c = prompt.contributor;

  return (
    <>
      <section className="px-6 mt-6" aria-labelledby="guest-prompt-heading">
        <article className="rounded-sm border border-gold/25 bg-card p-5">
          <p
            id="guest-prompt-heading"
            className="font-serif-display text-[10px] tracking-[0.18em] uppercase text-gold/80 mb-4"
          >
            Guest Prompt of the Week
          </p>

          <div className="flex items-center gap-3 mb-4">
            <ContributorAvatar name={c.name} photoUrl={c.photo_url} />
            <div className="min-w-0">
              <Link
                to={`/${c.slug}`}
                onClick={() =>
                  trackEvent("guest_contributor_page_opened", {
                    metadata: { slug: c.slug, from: "home_card" },
                  })
                }
                className="font-serif text-[15px] text-foreground hover:text-gold transition-colors"
              >
                {c.name}
              </Link>
              <p className="font-body text-[11px] text-muted-foreground truncate">
                {[c.title, c.church].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          <h3 className="font-serif text-lg text-foreground mb-3 leading-snug">{prompt.title}</h3>

          <div className="bg-scripture-card border-l-4 border-gold px-4 py-3 mb-4">
            <p className="font-serif-display text-[10px] tracking-[0.12em] uppercase text-gold mb-1.5">
              {prompt.scripture_ref} · KJV
            </p>
            <p className="font-['Playfair_Display'] italic text-[14px] text-foreground leading-relaxed">
              {prompt.scripture_text}
            </p>
          </div>

          <p className="font-body text-sm text-foreground/90 leading-relaxed mb-3 flex gap-2">
            <Quote size={14} className="text-gold/70 shrink-0 mt-1" aria-hidden="true" />
            <span>{prompt.prompt_body}</span>
          </p>

          {prompt.pastoral_note && (
            <p className="font-body text-[13px] text-muted-foreground leading-relaxed mb-4">
              {prompt.pastoral_note}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-5">
            {onReflect && (
              <button
                onClick={() => {
                  trackEvent("guest_prompt_reflect_clicked", {
                    metadata: { prompt_id: prompt.id, slug: c.slug },
                  });
                  onReflect(prompt.prompt_body);
                }}
                className="font-body text-[11px] tracking-[0.15em] uppercase text-parchment bg-gold hover:bg-gold/90 transition-colors px-5 py-2.5 rounded-sm"
              >
                Reflect on this
              </button>
            )}
            <button
              onClick={() => {
                trackEvent("guest_prompt_archive_opened");
                setArchiveOpen(true);
              }}
              className="font-body text-[11px] tracking-[0.15em] uppercase text-gold hover:text-gold/80 transition-colors"
            >
              View archive
            </button>
          </div>
        </article>
      </section>

      {archiveOpen && <GuestPromptArchive onClose={() => setArchiveOpen(false)} onReflect={onReflect} />}
    </>
  );
};

export { ContributorAvatar };
export default GuestPromptCard;
