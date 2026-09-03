import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MILESTONE_DAYS = [7, 14, 21, 30];

export interface StreakStats {
  psalmCount: number;
  bookCount: number;
  themeCount: number;
  themes: string[];
  books: string[];
  reflectionCount: number;
  questionCount: number;
}

export interface StreakData {
  streak: number;
  activeDays: number;
  stats: StreakStats;
  pendingMilestone: number | null;
}

/** Book → spiritual theme mapping used for "themes explored" milestones. */
const THEME_BY_BOOK: Record<string, string> = {
  psalms: "Lament & praise",
  psalm: "Lament & praise",
  proverbs: "Wisdom for daily life",
  ecclesiastes: "Wisdom for daily life",
  job: "Suffering & trust",
  lamentations: "Suffering & trust",
  isaiah: "Prophetic hope",
  jeremiah: "Prophetic hope",
  ezekiel: "Prophetic hope",
  daniel: "Prophetic hope",
  genesis: "Beginnings & covenant",
  exodus: "Deliverance",
  leviticus: "Holiness",
  numbers: "Wilderness & waiting",
  deuteronomy: "Covenant faithfulness",
  joshua: "Courage & obedience",
  judges: "Mercy in failure",
  ruth: "Providence",
  matthew: "The life of Christ",
  mark: "The life of Christ",
  luke: "The life of Christ",
  john: "The life of Christ",
  acts: "The early church",
  romans: "Grace & righteousness",
  galatians: "Grace & righteousness",
  ephesians: "Life in Christ",
  philippians: "Joy & contentment",
  colossians: "Life in Christ",
  hebrews: "Faith & endurance",
  james: "Faith at work",
  revelation: "Hope & the end",
};

const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const bookOf = (ref: string) => {
  const m = ref?.trim().match(/^(\d?\s*[A-Za-z][A-Za-z ]*)/);
  return m ? m[1].trim() : null;
};

function computeStreak(days: Set<string>): number {
  if (days.size === 0) return 0;
  const cursor = new Date();
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Allow the streak to still count if today hasn't been logged yet.
  if (!days.has(key(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(key(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(key(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function useReflectionStreak(userId?: string | null) {
  const queryClient = useQueryClient();

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 120);
    return d.toISOString();
  }, []);

  const { data } = useQuery({
    queryKey: ["reflection-streak", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<StreakData> => {
      const [reflections, sessions, milestones] = await Promise.all([
        supabase
          .from("reflection_entries")
          .select("created_at")
          .is("deleted_at", null)
          .gte("created_at", since),
        supabase
          .from("wisdom_sessions")
          .select("created_at, scripture_refs")
          .gte("created_at", since),
        supabase.from("streak_milestones").select("milestone_day, seen_at"),
      ]);

      const days = new Set<string>();
      (reflections.data ?? []).forEach((r: { created_at: string }) => days.add(localDay(r.created_at)));
      (sessions.data ?? []).forEach((s: { created_at: string }) => days.add(localDay(s.created_at)));

      const books = new Set<string>();
      const psalms = new Set<string>();
      const themes = new Set<string>();
      (sessions.data ?? []).forEach((s: { scripture_refs: string[] | null }) => {
        (s.scripture_refs ?? []).forEach((ref) => {
          const book = bookOf(ref || "");
          if (!book) return;
          books.add(book);
          const lower = book.toLowerCase();
          if (lower.startsWith("psalm")) psalms.add(ref.trim());
          const theme = THEME_BY_BOOK[lower];
          if (theme) themes.add(theme);
        });
      });

      const streak = computeStreak(days);

      const reached = MILESTONE_DAYS.filter((d) => streak >= d);
      const recorded = new Set((milestones.data ?? []).map((m: { milestone_day: number }) => m.milestone_day));
      const seen = new Set(
        (milestones.data ?? [])
          .filter((m: { seen_at: string | null }) => !!m.seen_at)
          .map((m: { milestone_day: number }) => m.milestone_day)
      );

      const stats: StreakStats = {
        psalmCount: psalms.size,
        bookCount: books.size,
        themeCount: themes.size,
        themes: Array.from(themes),
        books: Array.from(books),
        reflectionCount: reflections.data?.length ?? 0,
        questionCount: sessions.data?.length ?? 0,
      };

      // Record any newly reached milestone so it is celebrated once, ever.
      const unrecorded = reached.filter((d) => !recorded.has(d));
      if (unrecorded.length > 0 && userId) {
        await supabase.from("streak_milestones").upsert(
          unrecorded.map((d) => ({
            user_id: userId,
            milestone_day: d,
            streak_length: streak,
            stats: stats as unknown as never,
          })),
          { onConflict: "user_id,milestone_day" }
        );
      }

      const pending = reached.filter((d) => !seen.has(d));
      return {
        streak,
        activeDays: days.size,
        stats,
        pendingMilestone: pending.length ? Math.max(...pending) : null,
      };
    },
  });

  const dismissMilestone = useCallback(
    async (day: number) => {
      queryClient.setQueryData(["reflection-streak", userId], (old: StreakData | undefined) =>
        old ? { ...old, pendingMilestone: null } : old
      );
      await supabase
        .from("streak_milestones")
        .update({ seen_at: new Date().toISOString() })
        .eq("milestone_day", day);
    },
    [queryClient, userId]
  );

  return {
    streak: data?.streak ?? 0,
    stats: data?.stats,
    pendingMilestone: data?.pendingMilestone ?? null,
    dismissMilestone,
  };
}
