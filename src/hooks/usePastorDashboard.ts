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
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface CongregationPulse {
  id: string;
  week_start: string;
  struggling: number;
  searching: number;
  grateful: number;
  top_categories: Array<{ category: string; count: number }> | null;
  ai_draft: string | null;
  ai_verses: string[] | null;
  ai_word_count: number | null;
  had_activity: boolean;
  broadcast_sent: boolean;
  broadcast_sent_at: string | null;
  created_at: string;
}

export interface ThresholdAlert {
  id: string;
  alert_type: "persistent_struggling" | "crisis_escalation";
  signal_count: number;
  status: "pending" | "revealed" | "contacted" | "dismissed";
  created_at: string;
  revealed_at: string | null;
  contacted_at: string | null;
  member_id?: string;
}

export interface CheckinRequest {
  id: string;
  member_id: string;
  mood_signal: "struggling" | "searching" | "grateful";
  trigger_type: "post_reflection" | "manual";
  status: "pending" | "acknowledged" | "resolved";
  requested_at: string;
  resolved_at: string | null;
}

export interface Announcement {
  id: string;
  message_body: string;
  scripture_refs: string[];
  recipient_count: number;
  delivered_count: number;
  sent_at: string;
  pulse_id: string | null;
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

  const [pulse, setPulse] = useState<CongregationPulse | null>(null);
  const [pulseLoading, setPulseLoading] = useState(false);
  const [pulseRegenerating, setPulseRegenerating] = useState(false);
  const [alerts, setAlerts] = useState<ThresholdAlert[]>([]);
  const [checkins, setCheckins] = useState<CheckinRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

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

  const loadPulse = useCallback(async () => {
    setPulseLoading(true);
    const { data: res } = await supabase.functions.invoke("pastor-dashboard", {
      body: { action: "get_pulse" },
    });
    setPulse((res?.pulse as CongregationPulse | null) ?? null);
    setPulseLoading(false);
  }, []);

  const regeneratePulse = useCallback(async (): Promise<boolean> => {
    setPulseRegenerating(true);
    const { data: res, error: err } = await supabase.functions.invoke(
      "pastor-dashboard",
      { body: { action: "regenerate_pulse" } }
    );
    setPulseRegenerating(false);
    if (err || !res?.success) return false;
    await loadPulse();
    return true;
  }, [loadPulse]);

  const loadAlerts = useCallback(async (status: "pending" | "revealed" | "contacted" | "dismissed" = "pending") => {
    const { data: res } = await supabase.functions.invoke("pastor-dashboard", {
      body: { action: "list_alerts", status },
    });
    setAlerts((res?.alerts as ThresholdAlert[]) ?? []);
  }, []);

  const revealAlert = useCallback(async (alertId: string) => {
    const { data: res } = await supabase.functions.invoke("pastor-dashboard", {
      body: { action: "reveal_alert", alert_id: alertId },
    });
    await loadAlerts("pending");
    return (res?.alert as ThresholdAlert | undefined) ?? null;
  }, [loadAlerts]);

  const dismissAlert = useCallback(async (alertId: string) => {
    await supabase.functions.invoke("pastor-dashboard", {
      body: { action: "dismiss_alert", alert_id: alertId },
    });
    await loadAlerts("pending");
  }, [loadAlerts]);

  const markAlertContacted = useCallback(async (alertId: string) => {
    await supabase.functions.invoke("pastor-dashboard", {
      body: { action: "mark_alert_contacted", alert_id: alertId },
    });
    await loadAlerts("pending");
  }, [loadAlerts]);

  const loadCheckins = useCallback(async (status: "pending" | "acknowledged" | "resolved" = "pending") => {
    const { data: res } = await supabase.functions.invoke("pastor-dashboard", {
      body: { action: "list_checkins", status },
    });
    setCheckins((res?.checkins as CheckinRequest[]) ?? []);
  }, []);

  const acknowledgeCheckin = useCallback(
    async (checkinId: string, status: "acknowledged" | "resolved" = "acknowledged") => {
      await supabase.functions.invoke("pastor-dashboard", {
        body: { action: "acknowledge_checkin", checkin_id: checkinId, status },
      });
      await loadCheckins("pending");
    },
    [loadCheckins]
  );

  const loadAnnouncements = useCallback(async () => {
    const { data: res } = await supabase.functions.invoke("pastor-dashboard", {
      body: { action: "list_announcements", limit: 20 },
    });
    setAnnouncements((res?.announcements as Announcement[]) ?? []);
  }, []);

  const sendAnnouncement = useCallback(
    async (params: { messageBody: string; scriptureRefs?: string[]; pulseId?: string | null }): Promise<boolean> => {
      setSendingAnnouncement(true);
      const { data: res, error: err } = await supabase.functions.invoke("pastor-dashboard", {
        body: {
          action: "send_announcement",
          message_body: params.messageBody,
          scripture_refs: params.scriptureRefs ?? [],
          pulse_id: params.pulseId ?? null,
        },
      });
      setSendingAnnouncement(false);
      if (err || !res?.announcement) return false;
      await Promise.all([loadAnnouncements(), loadPulse()]);
      return true;
    },
    [loadAnnouncements, loadPulse]
  );

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

  const rotateShareToken = useCallback(
    async (draftId: string): Promise<string | null> => {
      // Generate a 48-char hex token client-side, then update.
      // RLS only lets the pastor update their own drafts.
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      const newToken = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const { data, error } = await supabase
        .from("pastor_message_drafts")
        .update({ share_token: newToken })
        .eq("id", draftId)
        .select("share_token")
        .single();
      if (error || !data) return null;
      await loadDrafts();
      // Also refresh currentDraft if it matches
      setCurrentDraft((prev) =>
        prev && prev.id === draftId
          ? { ...prev, share_token: (data as { share_token: string }).share_token }
          : prev
      );
      return (data as { share_token: string }).share_token;
    },
    [loadDrafts]
  );

  useEffect(() => {
    loadThemes(range);
    loadDrafts();
  }, [loadThemes, loadDrafts, range]);

  // Load pulse, alerts, checkins, announcements once on mount
  useEffect(() => {
    loadPulse();
    loadAlerts("pending");
    loadCheckins("pending");
    loadAnnouncements();
  }, [loadPulse, loadAlerts, loadCheckins, loadAnnouncements]);

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
    rotateShareToken,
    range,
    setRange,
    // Pulse + portal additions
    pulse,
    pulseLoading,
    pulseRegenerating,
    regeneratePulse,
    refreshPulse: loadPulse,
    alerts,
    refreshAlerts: loadAlerts,
    revealAlert,
    dismissAlert,
    markAlertContacted,
    checkins,
    refreshCheckins: loadCheckins,
    acknowledgeCheckin,
    announcements,
    refreshAnnouncements: loadAnnouncements,
    sendAnnouncement,
    sendingAnnouncement,
    refresh: () => {
      loadThemes(range);
      loadDrafts();
      loadPulse();
      loadAlerts("pending");
      loadCheckins("pending");
      loadAnnouncements();
    },
  };
}