import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const DEFAULT_HOUR_UTC = 13; // ~8am ET

/**
 * Shows once per user after their 3rd wisdom session.
 * Asks if they want a daily verse by email at a chosen hour.
 */
export default function DailyVerseOptIn({ userId }: { userId: string | null }) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(DEFAULT_HOUR_UTC);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("daily_verse_prompt_seen, daily_verse_opt_in")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled || !profile) return;
      if (profile.daily_verse_prompt_seen || profile.daily_verse_opt_in) return;

      const { count } = await supabase
        .from("wisdom_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (cancelled) return;
      if ((count ?? 0) >= 3) setOpen(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const markSeen = async () => {
    if (!userId) return;
    await supabase
      .from("profiles")
      .update({ daily_verse_prompt_seen: true })
      .eq("user_id", userId);
  };

  const onDecline = async () => {
    await markSeen();
    setOpen(false);
  };

  const onAccept = async () => {
    if (!userId) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        daily_verse_opt_in: true,
        daily_verse_send_hour_utc: hour,
        daily_verse_opted_in_at: new Date().toISOString(),
        daily_verse_prompt_seen: true,
      })
      .eq("user_id", userId);
    setSubmitting(false);
    if (error) {
      toast.error("Could not save preference");
      return;
    }
    toast.success("You'll receive your first verse tomorrow.");
    setOpen(false);
  };

  // 24-hour offering, displayed as UTC for clarity
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDecline(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">A verse each morning?</DialogTitle>
          <DialogDescription className="font-body pt-2">
            You've sat with three questions in DABAR. Some people find it helpful
            to carry a verse into each day. We can send one short scripture every
            morning, with a single reflection prompt.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label htmlFor="daily-verse-hour" className="text-sm font-body text-muted-foreground">
            Send hour (UTC, 24-hour)
          </label>
          <select
            id="daily-verse-hour"
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
          >
            {hours.map((h) => (
              <option key={h} value={h}>
                {h.toString().padStart(2, "0")}:00 UTC
              </option>
            ))}
          </select>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onDecline} disabled={submitting}>
            Not now
          </Button>
          <Button onClick={onAccept} disabled={submitting}>
            {submitting ? "Saving…" : "Yes, send daily"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}