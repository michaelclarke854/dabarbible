import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CongregationPulse,
  ThresholdAlert,
  CheckinRequest,
  Announcement,
} from "@/hooks/usePastorDashboard";

const CATEGORY_LABELS: Record<string, string> = {
  grief_and_loss: "Grief & Loss",
  anxiety_and_fear: "Anxiety & Fear",
  doubt_and_faith: "Doubt & Faith",
  relationships: "Relationships",
  purpose_and_calling: "Purpose & Calling",
  forgiveness: "Forgiveness",
  suffering_and_theodicy: "Suffering",
  spiritual_growth: "Spiritual Growth",
  identity: "Identity",
  sin_and_repentance: "Sin & Repentance",
  gratitude_and_joy: "Gratitude & Joy",
  general: "General",
  crisis_escalated: "Crisis (Escalated)",
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* ───────────────────────── PULSE ───────────────────────── */

interface PulseProps {
  pulse: CongregationPulse | null;
  loading: boolean;
  regenerating: boolean;
  onRegenerate: () => Promise<boolean>;
  onUseDraft: (pulse: CongregationPulse) => void;
}

export function PulseSection({ pulse, loading, regenerating, onRegenerate, onUseDraft }: PulseProps) {
  const total = pulse ? pulse.struggling + pulse.searching + pulse.grateful : 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const handleRegenerate = async () => {
    const ok = await onRegenerate();
    if (ok) toast.success("Pulse refreshed.");
    else toast.error("Could not refresh pulse.");
  };

  return (
    <section className="space-y-4 pt-6 border-t border-border">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-serif text-sm text-gold uppercase tracking-widest">
          Congregation pulse
        </h2>
        <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? "Regenerating..." : "Regenerate this week"}
        </Button>
      </div>

      {loading && <div className="h-32 bg-muted animate-pulse rounded-sm" />}

      {!loading && !pulse && (
        <div className="border border-dashed border-border rounded-sm p-6 text-center">
          <p className="font-body text-sm text-muted-foreground">
            No pulse generated yet. Pulses run automatically each Monday once your community has activity.
          </p>
        </div>
      )}

      {!loading && pulse && !pulse.had_activity && (
        <div className="border border-border rounded-sm p-6 text-center">
          <p className="font-body text-sm text-muted-foreground">
            No reflections this week ({new Date(pulse.week_start).toLocaleDateString()}).
          </p>
        </div>
      )}

      {!loading && pulse && pulse.had_activity && (
        <div className="border border-border rounded-sm p-6 space-y-5">
          <p className="font-body text-xs text-muted-foreground">
            Week of {new Date(pulse.week_start).toLocaleDateString()} · {total} reflection{total !== 1 ? "s" : ""}
          </p>

          {/* Mood bar */}
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              <div className="bg-destructive/70" style={{ width: `${pct(pulse.struggling)}%` }} />
              <div className="bg-gold/70" style={{ width: `${pct(pulse.searching)}%` }} />
              <div className="bg-emerald-600/70" style={{ width: `${pct(pulse.grateful)}%` }} />
            </div>
            <div className="flex justify-between text-xs font-body text-muted-foreground">
              <span>Struggling {pulse.struggling}</span>
              <span>Searching {pulse.searching}</span>
              <span>Grateful {pulse.grateful}</span>
            </div>
          </div>

          {/* Top categories */}
          {Array.isArray(pulse.top_categories) && pulse.top_categories.length > 0 && (
            <div className="space-y-2">
              <p className="font-serif text-xs text-gold uppercase tracking-widest">Top themes</p>
              <div className="flex flex-wrap gap-2">
                {pulse.top_categories.map((c) => (
                  <span
                    key={c.category}
                    className="text-xs font-body px-2 py-1 bg-muted rounded-sm text-foreground"
                  >
                    {CATEGORY_LABELS[c.category] ?? c.category} · {c.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI draft */}
          {pulse.ai_draft && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="font-serif text-xs text-gold uppercase tracking-widest">
                Suggested pastoral message
              </p>
              <pre className="font-body text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {pulse.ai_draft}
              </pre>
              {Array.isArray(pulse.ai_verses) && pulse.ai_verses.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {pulse.ai_verses.map((v) => (
                    <span key={v} className="text-xs font-body px-2 py-1 bg-gold/10 text-gold rounded-sm">
                      {v}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => onUseDraft(pulse)} className="flex-1">
                  Use as announcement
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={async () => {
                    await navigator.clipboard.writeText(pulse.ai_draft ?? "");
                    toast.success("Draft copied.");
                  }}
                >
                  Copy
                </Button>
              </div>
              {pulse.broadcast_sent && pulse.broadcast_sent_at && (
                <p className="font-body text-xs text-muted-foreground italic">
                  Sent to congregation {formatRelative(pulse.broadcast_sent_at)}.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ───────────────────────── ALERTS ───────────────────────── */

interface AlertsProps {
  alerts: ThresholdAlert[];
  onReveal: (id: string) => Promise<ThresholdAlert | null>;
  onContacted: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

export function AlertsSection({ alerts, onReveal, onContacted, onDismiss }: AlertsProps) {
  if (alerts.length === 0) {
    return (
      <section className="space-y-3 pt-6 border-t border-border">
        <h2 className="font-serif text-sm text-gold uppercase tracking-widest">
          Pastoral attention
        </h2>
        <p className="font-body text-sm text-muted-foreground">
          No members currently flagged. Alerts appear when someone shows persistent struggle or escalates a crisis signal.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 pt-6 border-t border-border">
      <h2 className="font-serif text-sm text-gold uppercase tracking-widest">
        Pastoral attention ({alerts.length})
      </h2>
      <p className="font-body text-xs text-muted-foreground">
        Identities are hidden until you choose to reveal. Reveal only if you intend to reach out personally.
      </p>
      <div className="space-y-2">
        {alerts.map((a) => (
          <AlertCard key={a.id} alert={a} onReveal={onReveal} onContacted={onContacted} onDismiss={onDismiss} />
        ))}
      </div>
    </section>
  );
}

function AlertCard({
  alert,
  onReveal,
  onContacted,
  onDismiss,
}: {
  alert: ThresholdAlert;
  onReveal: (id: string) => Promise<ThresholdAlert | null>;
  onContacted: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}) {
  const [revealedId, setRevealedId] = useState<string | null>(alert.member_id ?? null);
  const [busy, setBusy] = useState(false);

  const isCrisis = alert.alert_type === "crisis_escalation";

  return (
    <div
      className={`p-3 border rounded-sm space-y-2 ${
        isCrisis ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"
      }`}
    >
      <div className="flex justify-between items-start gap-3 flex-wrap">
        <div>
          <p className="font-body text-sm text-foreground">
            {isCrisis ? "Crisis signal escalated" : `Persistent struggle (${alert.signal_count} signals)`}
          </p>
          <p className="font-body text-xs text-muted-foreground">
            Flagged {formatRelative(alert.created_at)}
            {revealedId && ` · Member ID …${revealedId.slice(-6)}`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!revealedId && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const res = await onReveal(alert.id);
                setBusy(false);
                if (res?.member_id) setRevealedId(res.member_id);
              }}
            >
              Reveal
            </Button>
          )}
          {revealedId && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onContacted(alert.id);
                setBusy(false);
                toast.success("Marked as contacted.");
              }}
            >
              Mark contacted
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onDismiss(alert.id);
              setBusy(false);
            }}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── CHECK-INS ───────────────────────── */

interface CheckinsProps {
  checkins: CheckinRequest[];
  onAcknowledge: (id: string, status?: "acknowledged" | "resolved") => Promise<void>;
}

export function CheckinsSection({ checkins, onAcknowledge }: CheckinsProps) {
  if (checkins.length === 0) {
    return (
      <section className="space-y-3 pt-6 border-t border-border">
        <h2 className="font-serif text-sm text-gold uppercase tracking-widest">
          Check-in requests
        </h2>
        <p className="font-body text-sm text-muted-foreground">
          No pending check-in requests.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 pt-6 border-t border-border">
      <h2 className="font-serif text-sm text-gold uppercase tracking-widest">
        Check-in requests ({checkins.length})
      </h2>
      <div className="space-y-2">
        {checkins.map((c) => (
          <div key={c.id} className="p-3 border border-border bg-card rounded-sm flex justify-between items-start gap-3 flex-wrap">
            <div>
              <p className="font-body text-sm text-foreground capitalize">
                Mood: {c.mood_signal} · {c.trigger_type === "manual" ? "Member requested" : "Post-reflection"}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                Member …{c.member_id.slice(-6)} · {formatRelative(c.requested_at)}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await onAcknowledge(c.id, "acknowledged");
                  toast.success("Acknowledged.");
                }}
              >
                Acknowledge
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await onAcknowledge(c.id, "resolved");
                  toast.success("Resolved.");
                }}
              >
                Resolved
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── ANNOUNCEMENTS ───────────────────────── */

interface AnnouncementsProps {
  announcements: Announcement[];
  sending: boolean;
  onSend: (params: { messageBody: string; scriptureRefs?: string[]; pulseId?: string | null }) => Promise<boolean>;
  composerInitial: { messageBody: string; scriptureRefs: string[]; pulseId: string | null } | null;
  onComposerConsumed: () => void;
}

export function AnnouncementsSection({
  announcements,
  sending,
  onSend,
  composerInitial,
  onComposerConsumed,
}: AnnouncementsProps) {
  const [body, setBody] = useState("");
  const [refsInput, setRefsInput] = useState("");
  const [pulseId, setPulseId] = useState<string | null>(null);

  // When parent passes a draft (from "Use as announcement"), prefill composer
  useEffect(() => {
    if (composerInitial) {
      setBody(composerInitial.messageBody);
      setRefsInput(composerInitial.scriptureRefs.join(", "));
      setPulseId(composerInitial.pulseId);
      onComposerConsumed();
      // Scroll composer into view
      setTimeout(() => {
        document.getElementById("announcement-composer")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [composerInitial, onComposerConsumed]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (trimmed.length < 10) {
      toast.error("Message is too short.");
      return;
    }
    const refs = refsInput
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean)
      .slice(0, 12);
    const ok = await onSend({ messageBody: trimmed, scriptureRefs: refs, pulseId });
    if (ok) {
      toast.success("Announcement sent to congregation.");
      setBody("");
      setRefsInput("");
      setPulseId(null);
    } else {
      toast.error("Could not send announcement.");
    }
  };

  return (
    <section className="space-y-4 pt-6 border-t border-border">
      <h2 className="font-serif text-sm text-gold uppercase tracking-widest">
        Pastoral announcements
      </h2>

      <div id="announcement-composer" className="border border-border rounded-sm p-4 space-y-3">
        <p className="font-body text-xs text-muted-foreground">
          Write a brief pastoral note for your congregation. Members will see it inside DABAR.
        </p>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Beloved, this week I've been sitting with…"
          rows={6}
          className="font-body text-sm"
        />
        <input
          value={refsInput}
          onChange={(e) => setRefsInput(e.target.value)}
          placeholder="Scripture refs (comma-separated, e.g. Psalm 23:1, Romans 8:28)"
          className="w-full font-body text-sm bg-background border border-border rounded-sm px-3 py-2"
        />
        <div className="flex justify-between items-center gap-2">
          <p className="font-body text-xs text-muted-foreground">
            {body.trim().length} characters {pulseId && "· linked to current pulse"}
          </p>
          <Button onClick={handleSend} disabled={sending || body.trim().length < 10}>
            {sending ? "Sending..." : "Send to congregation"}
          </Button>
        </div>
      </div>

      {announcements.length > 0 && (
        <div className="space-y-2">
          <p className="font-serif text-xs text-gold uppercase tracking-widest">Recent announcements</p>
          {announcements.map((a) => (
            <div key={a.id} className="p-3 border border-border bg-card rounded-sm space-y-2">
              <p className="font-body text-xs text-muted-foreground">
                {new Date(a.sent_at).toLocaleString()} · sent to {a.recipient_count} member
                {a.recipient_count !== 1 ? "s" : ""}
              </p>
              <pre className="font-body text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {a.message_body}
              </pre>
              {a.scripture_refs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {a.scripture_refs.map((r) => (
                    <span key={r} className="text-xs font-body px-2 py-1 bg-gold/10 text-gold rounded-sm">
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}