import { useEffect, useState } from "react";
import { Bell, BookOpen, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { isIOSNative } from "@/lib/platform";
import { loadLastReflection, loadPracticeHour, nativeTap, scheduleDailyPractice } from "@/lib/nativePractice";

const DEFAULT_HOUR = 8;

const NativeDailyPractice = () => {
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(DEFAULT_HOUR);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isIOSNative()) return;
    setEnabled(true);
    loadPracticeHour().then((savedHour) => {
      if (savedHour !== null) setHour(savedHour);
    });
    loadLastReflection().then((reflection) => {
      if (reflection?.savedAt) setLastSaved(new Date(reflection.savedAt).toLocaleDateString());
    });
  }, []);

  if (!enabled) return null;

  const handleSchedule = async () => {
    setSaving(true);
    try {
      await nativeTap();
      const ok = await scheduleDailyPractice(hour);
      if (ok) {
        toast.success("Daily practice reminder set.");
      } else {
        toast.error("Notifications are not enabled for DABAR.");
      }
    } catch {
      toast.error("Could not set the reminder.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-6 mt-16 mb-4 rounded-sm border border-gold/20 bg-card/60 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-sm bg-gold/10 text-gold">
          <BookOpen size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-base text-foreground">Daily scripture practice</p>
          <p className="mt-1 font-body text-xs leading-relaxed text-muted-foreground">
            Your iPhone can keep a local reminder and remember the last reflection you saved for offline review.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-sm border border-gold/20 px-3 py-2 text-xs text-muted-foreground">
              <Clock size={14} aria-hidden="true" />
              <select
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="bg-transparent text-foreground outline-none"
                aria-label="Daily practice hour"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {new Date(2026, 0, 1, h).toLocaleTimeString([], { hour: "numeric" })}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleSchedule}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-sm bg-gold px-3 py-2 font-body text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Bell size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
              {saving ? "Saving" : "Set reminder"}
            </button>
          </div>
          {lastSaved && (
            <p className="mt-3 font-body text-[11px] text-muted-foreground">
              Last reflection saved locally on {lastSaved}.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default NativeDailyPractice;
