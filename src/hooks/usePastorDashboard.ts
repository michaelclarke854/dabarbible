import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PastoralCommunity {
  id: string;
  name: string;
  type: string;
  invite_code: string;
}

export interface CommunityTheme {
  theme: string;
  question_count: number;
  last_question_at: string;
}

export interface PastorDraft {
  id: string;
  pastor_id: string;
  community_id: string;
  title: string;
  theme: string;
  question_count: number;
  outline: string;
  scripture_refs: string[];
  status: "draft" | "saved" | "archived";
  created_at: string;
  updated_at: string;
}

interface DashboardData {
  community: PastoralCommunity | null;
  member_count: number;
  themes: CommunityTheme[];
  range?: TimeRange;
}

export type TimeRange = "week" | "month" | "year";

export function usePastorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [drafts, setDrafts] = useState<PastorDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<PastorDraft | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>("month");

  const loadThemes = useCallback(async (r: TimeRange) => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.functions.invoke(
      "pastor-dashboard",
      { body: { action: "get_themes", range: r } }
    );
    if (err || !res) {
      setError("Could not load dashboard data.");
    } else {
      setData(res as DashboardData);
    }
    setLoading(false);
  }, []);

  const loadDrafts = useCallback(async () => {
    const { data: rows } = await supabase
      .from("pastor_message_drafts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setDrafts((rows as PastorDraft[]) ?? []);
  }, []);

  const generateMessage = useCallback(
    async (theme: string, questionCount: number) => {
      setGenerating(true);
      setCurrentDraft(null);
      setGenError(null);
      const { data: res, error: err } = await supabase.functions.invoke(
        "pastor-dashboard",
        {
          body: {
            action: "generate_message",
            theme,
            question_count: questionCount,
          },
        }
      );
      if (err || !res?.draft) {
        setGenError("Could not generate outline. Please try again.");
      } else {
        setCurrentDraft(res.draft as PastorDraft);
        await loadDrafts();
      }
      setGenerating(false);
    },
    [loadDrafts]
  );

  const archiveDraft = useCallback(
    async (draftId: string) => {
      await supabase.functions.invoke("pastor-dashboard", {
        body: { action: "archive_draft", draft_id: draftId },
      });
      await loadDrafts();
    },
    [loadDrafts]
  );

  useEffect(() => {
    loadThemes(range);
    loadDrafts();
  }, [loadThemes, loadDrafts, range]);

  return {
    data,
    drafts,
    loading,
    error,
    generating,
    currentDraft,
    setCurrentDraft,
    genError,
    generateMessage,
    archiveDraft,
    range,
    setRange,
    refresh: () => {
      loadThemes(range);
      loadDrafts();
    },
  };
}