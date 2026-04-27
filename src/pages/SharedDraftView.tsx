import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";

interface SharedDraft {
  title: string;
  theme: string;
  outline: string;
  scripture_refs: string[];
  created_at: string;
}

export default function SharedDraftView() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "found" | "missing">("loading");
  const [draft, setDraft] = useState<SharedDraft | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("missing");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("lookup_draft_by_share_token", {
        _share_token: token,
      });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row) {
        setStatus("missing");
        trackEvent("shared_draft_link_invalid", {
          screen: "shared_draft_view",
          metadata: { token_prefix: token.slice(0, 6) },
          userId: null,
        });
      } else {
        setDraft(row as SharedDraft);
        setStatus("found");
        trackEvent("shared_draft_link_opened", {
          screen: "shared_draft_view",
          metadata: {
            token_prefix: token.slice(0, 6),
            theme: (row as SharedDraft).theme,
          },
          userId: null,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "missing" || !draft) {
    return (
      <div className="min-h-screen bg-background px-6 py-12 flex flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-serif text-xl text-destructive tracking-wide">
          This share link is no longer valid
        </h1>
        <p className="font-body text-sm text-muted-foreground max-w-md">
          The link may have expired or been rotated. Ask the pastor to send you a
          fresh link.
        </p>
        <Link
          to="/"
          className="text-sm font-body text-gold hover:underline"
        >
          Go to DABAR →
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 xs:px-5 sm:px-6 py-8 xs:py-10 sm:py-16 md:py-20">
      <article className="max-w-2xl mx-auto animate-fade-in-up">
        {/* Eyebrow */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-10">
          <span className="h-px w-6 sm:w-8 bg-gold/40" />
          <p className="font-serif text-[9px] sm:text-[10px] text-gold uppercase tracking-[0.25em] sm:tracking-[0.3em]">
            Shared Outline
          </p>
          <span className="h-px w-6 sm:w-8 bg-gold/40" />
        </div>

        {/* Title */}
        <header className="text-center space-y-3 sm:space-y-4 pb-6 sm:pb-10">
          <h1 className="font-serif text-[22px] xs:text-2xl sm:text-3xl md:text-4xl text-foreground tracking-wide leading-[1.2] xs:leading-[1.25] sm:leading-snug break-words [overflow-wrap:anywhere] [hyphens:auto] [text-wrap:balance]">
            {draft.title}
          </h1>
          <p className="font-body text-[11px] sm:text-xs text-muted-foreground tracking-wider">
            {new Date(draft.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </header>

        {/* Scripture refs as a sacred card */}
        {draft.scripture_refs.length > 0 && (
          <div className="bg-scripture-card border-l-4 border-gold rounded-sm px-4 sm:px-5 py-3.5 xs:py-3 sm:py-4 mb-7 xs:mb-6 sm:mb-10">
            <p className="font-serif text-[9px] sm:text-[10px] text-gold uppercase tracking-[0.25em] mb-2 xs:mb-1.5 sm:mb-2">
              Scripture
            </p>
            <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1.5 xs:gap-y-1">
              {draft.scripture_refs.map((ref) => (
                <span
                  key={ref}
                  className="font-serif text-[13px] sm:text-sm text-gold-light tracking-wide [overflow-wrap:anywhere] [hyphens:auto] max-w-full"
                >
                  {ref}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Outline body */}
        {/*
          Mobile-first reading scale.
          Base (<375px, incl. 320px): 15px / 1.75 line-height with airy letter-spacing
          for maximum comfort on the smallest screens.
          Scales up gracefully through xs → sm → md.
        */}
        <div
          lang="en"
          className="font-body text-[15px] xs:text-[15px] sm:text-base md:text-[17px] text-foreground leading-[1.75] xs:leading-[1.7] sm:leading-[1.8] md:leading-[1.85] tracking-[0.012em] xs:tracking-[0.01em] [overflow-wrap:anywhere] [hyphens:auto] [text-wrap:pretty] space-y-4 xs:space-y-5 sm:space-y-6"
        >
          {draft.outline
            .split(/\n{2,}/)
            .map((para, i) => (
              <p key={i} className="whitespace-pre-wrap">
                {para.trim()}
              </p>
            ))}
        </div>

        {/* Footer */}
        <footer className="pt-8 xs:pt-10 sm:pt-12 mt-10 xs:mt-12 sm:mt-16 border-t border-border/60 text-center space-y-3">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold animate-candle-glow" />
          <Link
            to="/"
            className="block font-serif text-[10px] text-muted-foreground uppercase tracking-[0.3em] hover:text-gold transition-colors"
          >
            Shared via DABAR
          </Link>
        </footer>
      </article>
    </div>
  );
}