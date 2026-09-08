import { X, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestPromptArchive } from "@/hooks/useGuestPrompts";
import { trackEvent } from "@/lib/trackEvent";

interface Props {
  onClose: () => void;
  onReflect?: (prompt: string) => void;
}

const formatWeek = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const GuestPromptArchive = ({ onClose, onReflect }: Props) => {
  const { hasFullAccess } = useAuth();
  const { prompts, contributors, contributorId, setContributorId, loading } =
    useGuestPromptArchive(hasFullAccess);

  return (
    <div className="fixed inset-0 z-50 bg-background/97 backdrop-blur-sm overflow-y-auto animate-fade-in-up">
      <div className="max-w-md mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="font-serif-display text-[10px] tracking-[0.18em] uppercase text-gold/80 mb-1">
              Guest Voices
            </p>
            <h2 className="font-serif text-2xl text-foreground">Prompt Archive</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close archive"
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {!hasFullAccess ? (
          <div className="rounded-sm border border-gold/25 bg-card p-6 text-center">
            <Lock size={18} className="text-gold mx-auto mb-4" aria-hidden="true" />
            <h3 className="font-serif text-lg text-foreground mb-3">The full archive is part of Dabar</h3>
            <p className="font-body text-sm text-muted-foreground leading-relaxed mb-6">
              Every guest prompt stays available to members — browse past weeks and read by contributor.
              This week's prompt is always free.
            </p>
            <Link
              to="/pricing"
              onClick={() => trackEvent("guest_archive_paywall_clicked")}
              className="inline-block font-body text-[11px] tracking-[0.15em] uppercase text-parchment bg-gold hover:bg-gold/90 transition-colors px-6 py-3 rounded-sm"
            >
              See plans
            </Link>
          </div>
        ) : (
          <>
            {contributors.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setContributorId("all")}
                  className={`font-body text-[11px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-sm border transition-colors ${
                    contributorId === "all"
                      ? "border-gold text-parchment bg-gold"
                      : "border-gold/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All voices
                </button>
                {contributors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setContributorId(c.id);
                      trackEvent("guest_archive_filtered", { metadata: { slug: c.slug } });
                    }}
                    className={`font-body text-[11px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-sm border transition-colors ${
                      contributorId === c.id
                        ? "border-gold text-parchment bg-gold"
                        : "border-gold/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <p className="font-body text-sm text-muted-foreground">Loading the archive…</p>
            ) : prompts.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">
                No guest prompts here yet. New voices arrive each month.
              </p>
            ) : (
              <ul className="space-y-5">
                {prompts.map((p) => (
                  <li key={p.id} className="rounded-sm border border-gold/20 bg-card p-5">
                    <p className="font-body text-[11px] text-muted-foreground mb-2">
                      {formatWeek(p.week_start)}
                      {p.contributor ? ` · ${p.contributor.name}` : ""}
                    </p>
                    <h3 className="font-serif text-base text-foreground mb-3 leading-snug">{p.title}</h3>
                    <div className="bg-scripture-card border-l-4 border-gold px-4 py-3 mb-3">
                      <p className="font-serif-display text-[10px] tracking-[0.12em] uppercase text-gold mb-1.5">
                        {p.scripture_ref} · KJV
                      </p>
                      <p className="font-['Playfair_Display'] italic text-[14px] text-foreground leading-relaxed">
                        {p.scripture_text}
                      </p>
                    </div>
                    <p className="font-body text-sm text-foreground/90 leading-relaxed">{p.prompt_body}</p>
                    <div className="flex flex-wrap gap-4 mt-4">
                      {onReflect && (
                        <button
                          onClick={() => {
                            onReflect(p.prompt_body);
                            onClose();
                          }}
                          className="font-body text-[11px] tracking-[0.15em] uppercase text-gold hover:text-gold/80 transition-colors"
                        >
                          Reflect on this
                        </button>
                      )}
                      {p.contributor && (
                        <Link
                          to={`/${p.contributor.slug}`}
                          className="font-body text-[11px] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                        >
                          About {p.contributor.name.split(" ").slice(-1)[0]}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GuestPromptArchive;
