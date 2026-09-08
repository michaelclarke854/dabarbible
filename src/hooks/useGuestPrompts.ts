import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GuestContributor {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  church: string | null;
  location: string | null;
  bio: string;
  photo_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
}

export interface GuestPrompt {
  id: string;
  contributor_id: string;
  week_start: string;
  scripture_ref: string;
  scripture_text: string;
  title: string;
  prompt_body: string;
  pastoral_note: string | null;
  contributor: GuestContributor | null;
}

const SELECT = `
  id, contributor_id, week_start, scripture_ref, scripture_text, title, prompt_body, pastoral_note,
  contributor:guest_contributors!inner (
    id, slug, name, title, church, location, bio, photo_url, website_url, instagram_url, youtube_url
  )
`;

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

type Row = Omit<GuestPrompt, "contributor"> & {
  contributor: GuestContributor | GuestContributor[] | null;
};

const normalize = (rows: Row[] | null): GuestPrompt[] =>
  (rows ?? []).map((r) => ({
    ...r,
    contributor: Array.isArray(r.contributor) ? r.contributor[0] ?? null : r.contributor,
  }));

/** Current "Guest Prompt of the Week" — the most recent published prompt whose week has started. */
export function useCurrentGuestPrompt() {
  const [prompt, setPrompt] = useState<GuestPrompt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("guest_prompts")
        .select(SELECT)
        .eq("published", true)
        .lte("week_start", todayISO())
        .order("week_start", { ascending: false })
        .limit(1);
      if (cancelled) return;
      setPrompt(normalize(data as unknown as Row[])[0] ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { prompt, loading };
}

/** Full archive of guest prompts, optionally filtered by contributor. */
export function useGuestPromptArchive(enabled: boolean) {
  const [prompts, setPrompts] = useState<GuestPrompt[]>([]);
  const [contributors, setContributors] = useState<GuestContributor[]>([]);
  const [contributorId, setContributorId] = useState<string | "all">("all");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: promptRows }, { data: contributorRows }] = await Promise.all([
      supabase
        .from("guest_prompts")
        .select(SELECT)
        .eq("published", true)
        .lte("week_start", todayISO())
        .order("week_start", { ascending: false })
        .limit(200),
      supabase
        .from("guest_contributors")
        .select(
          "id, slug, name, title, church, location, bio, photo_url, website_url, instagram_url, youtube_url"
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);
    setPrompts(normalize(promptRows as unknown as Row[]));
    setContributors((contributorRows as GuestContributor[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const filtered =
    contributorId === "all" ? prompts : prompts.filter((p) => p.contributor_id === contributorId);

  return { prompts: filtered, contributors, contributorId, setContributorId, loading };
}

/** A single contributor and their published prompts, for the co-branded page. */
export function useContributor(slug: string | undefined) {
  const [contributor, setContributor] = useState<GuestContributor | null>(null);
  const [prompts, setPrompts] = useState<GuestPrompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!slug) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data: c } = await supabase
        .from("guest_contributors")
        .select(
          "id, slug, name, title, church, location, bio, photo_url, website_url, instagram_url, youtube_url"
        )
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled) return;
      const found = (c as GuestContributor | null) ?? null;
      setContributor(found);
      if (found) {
        const { data: p } = await supabase
          .from("guest_prompts")
          .select(SELECT)
          .eq("published", true)
          .eq("contributor_id", found.id)
          .lte("week_start", todayISO())
          .order("week_start", { ascending: false })
          .limit(50);
        if (!cancelled) setPrompts(normalize(p as unknown as Row[]));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { contributor, prompts, loading };
}
