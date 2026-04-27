import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
      } else {
        setDraft(row as SharedDraft);
        setStatus("found");
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
    <div className="min-h-screen bg-background px-6 py-12">
      <article className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-3 pb-4 border-b border-border">
          <p className="font-body text-xs text-gold uppercase tracking-widest">
            Shared message outline
          </p>
          <h1 className="font-serif text-3xl text-foreground tracking-wide leading-snug">
            {draft.title}
          </h1>
          <p className="font-body text-xs text-muted-foreground">
            {new Date(draft.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </header>

        {draft.scripture_refs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {draft.scripture_refs.map((ref) => (
              <span
                key={ref}
                className="text-xs font-body px-2 py-1 bg-gold/10 text-gold rounded-sm"
              >
                {ref}
              </span>
            ))}
          </div>
        )}

        <pre className="font-body text-base text-foreground whitespace-pre-wrap leading-relaxed">
          {draft.outline}
        </pre>

        <footer className="pt-8 mt-8 border-t border-border text-center">
          <Link
            to="/"
            className="text-xs font-body text-muted-foreground hover:text-foreground"
          >
            Shared via DABAR · dabarbible.com
          </Link>
        </footer>
      </article>
    </div>
  );
}