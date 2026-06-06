import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Flame, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/trackEvent";
import { formatTimestamp } from "@/utils/formatTimestamp";

interface Prayer {
  id: string;
  request: string;
  status: "open" | "answered";
  answered_note: string | null;
  answered_at: string | null;
  created_at: string;
}

const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
  </div>
);

const PrayerLogPage = () => {
  const navigate = useNavigate();
  const { user, hasFullAccess, isHydrating } = useAuth();
  const queryClient = useQueryClient();
  const [newRequest, setNewRequest] = useState("");
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerNote, setAnswerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isHydrating && !user) {
      navigate("/", { replace: true });
    }
  }, [isHydrating, user, navigate]);

  const { data: prayers = [], isLoading } = useQuery({
    queryKey: ["prayer_log", user?.id],
    enabled: !!user && hasFullAccess,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prayer_log" as any)
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Prayer[];
    },
  });

  const sorted = useMemo(() => {
    return [...prayers].sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [prayers]);

  if (isHydrating) return <PageSpinner />;
  if (!user) return <PageSpinner />;

  if (!hasFullAccess) {
    return (
      <div className="min-h-screen px-6 py-16 max-w-2xl mx-auto flex flex-col items-center justify-center text-center">
        <Lock size={32} className="text-gold/40 mb-4" aria-hidden="true" />
        <h1 className="font-serif text-2xl text-foreground tracking-wide mb-3">
          Prayers
        </h1>
        <p className="font-body text-sm text-muted-foreground leading-relaxed max-w-xs mb-6">
          A private place to record what you're praying for, and remember what God has answered. Available on the Personal plan and above.
        </p>
        <button
          onClick={() => navigate("/pricing")}
          className="font-body text-xs tracking-[0.15em] uppercase text-primary-foreground bg-gold hover:bg-gold/90 transition-colors px-6 py-3 rounded-sm"
        >
          View Plans
        </button>
        <button
          onClick={() => navigate("/")}
          className="mt-6 font-body text-xs text-muted-foreground hover:text-gold transition-colors"
        >
          ← Back
        </button>
      </div>
    );
  }

  const handleAdd = async () => {
    const text = newRequest.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("prayer_log" as any)
        .insert({ user_id: user.id, request: text } as any);
      if (error) throw error;
      setNewRequest("");
      trackEvent("prayer_added", { screen: "prayers", userId: user.id });
      await queryClient.invalidateQueries({ queryKey: ["prayer_log", user.id] });
    } catch (e) {
      toast.error("Could not save prayer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswered = async (id: string) => {
    try {
      const { error } = await supabase
        .from("prayer_log" as any)
        .update({
          status: "answered",
          answered_at: new Date().toISOString(),
          answered_note: answerNote.trim() || null,
        } as any)
        .eq("id", id);
      if (error) throw error;
      setAnsweringId(null);
      setAnswerNote("");
      trackEvent("prayer_answered", { screen: "prayers", userId: user.id });
      toast.success("Marked as answered.");
      await queryClient.invalidateQueries({ queryKey: ["prayer_log", user.id] });
    } catch {
      toast.error("Could not update prayer.");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("prayer_log" as any)
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["prayer_log", user.id] });
    } catch {
      toast.error("Could not remove prayer.");
    }
  };

  return (
    <div className="min-h-screen px-6 py-8 pb-24 max-w-2xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 font-body text-xs text-muted-foreground hover:text-gold transition-colors"
          aria-label="Back to home"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back
        </button>
        <h1 className="font-serif text-xl text-foreground tracking-wide flex items-center gap-2">
          <Flame size={16} className="text-gold" aria-hidden="true" />
          Prayers
        </h1>
        <span className="w-10" aria-hidden="true" />
      </header>

      <section className="mb-10">
        <label htmlFor="prayer-input" className="sr-only">
          New prayer
        </label>
        <textarea
          id="prayer-input"
          value={newRequest}
          onChange={(e) => setNewRequest(e.target.value)}
          placeholder="What's on your heart to pray for?"
          rows={3}
          className="w-full bg-input border border-gold/20 rounded-sm px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-gold/60 resize-none"
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleAdd}
            disabled={!newRequest.trim() || submitting}
            className="font-body text-xs tracking-[0.15em] uppercase text-primary-foreground bg-gold hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-5 py-2.5 rounded-sm"
          >
            Add prayer
          </button>
        </div>
      </section>

      {isLoading ? (
        <PageSpinner />
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-serif italic text-lg text-muted-foreground">
            What's on your heart to pray for?
          </p>
          <p className="font-body text-xs text-muted-foreground/70 mt-3">
            Your prayers are private — only you can see them.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {sorted.map((p) => (
            <li
              key={p.id}
              className="border border-gold/15 bg-card rounded-sm p-4"
            >
              <div className="flex items-start gap-3">
                {p.status === "answered" ? (
                  <span
                    className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold"
                    aria-label="Answered"
                  >
                    <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                  </span>
                ) : (
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/60"
                    aria-hidden="true"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-foreground whitespace-pre-wrap">
                    {p.request}
                  </p>
                  <p className="mt-2 font-body text-[11px] text-muted-foreground">
                    {formatTimestamp(p.created_at)}
                  </p>
                  {p.status === "answered" && (
                    <div className="mt-3 border-l-2 border-gold/40 pl-3">
                      {p.answered_note && (
                        <p className="font-serif italic text-sm text-foreground/90">
                          {p.answered_note}
                        </p>
                      )}
                      {p.answered_at && (
                        <p className="mt-1 font-body text-[11px] text-gold">
                          Answered {formatTimestamp(p.answered_at)}
                        </p>
                      )}
                    </div>
                  )}
                  {p.status === "open" && answeringId !== p.id && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        onClick={() => {
                          setAnsweringId(p.id);
                          setAnswerNote("");
                        }}
                        className="font-body text-[11px] tracking-wider uppercase text-gold hover:text-gold-light transition-colors"
                      >
                        Mark as answered
                      </button>
                      <button
                        onClick={() => handleRemove(p.id)}
                        className="font-body text-[11px] tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                        aria-label="Remove prayer"
                      >
                        <Trash2 size={11} aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                  )}
                  {answeringId === p.id && (
                    <div className="mt-3">
                      <textarea
                        value={answerNote}
                        onChange={(e) => setAnswerNote(e.target.value)}
                        placeholder="How did God answer? (optional)"
                        rows={2}
                        className="w-full bg-input border border-gold/20 rounded-sm px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-gold/60 resize-none"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setAnsweringId(null);
                            setAnswerNote("");
                          }}
                          className="font-body text-[11px] tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAnswered(p.id)}
                          className="font-body text-[11px] tracking-[0.15em] uppercase text-primary-foreground bg-gold hover:bg-gold/90 transition-colors px-3 py-1.5 rounded-sm"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                  {p.status === "answered" && (
                    <button
                      onClick={() => handleRemove(p.id)}
                      className="mt-3 font-body text-[11px] tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                      aria-label="Remove prayer"
                    >
                      <Trash2 size={11} aria-hidden="true" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PrayerLogPage;
