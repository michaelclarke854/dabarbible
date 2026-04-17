import { useState } from "react";
import { Flag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResponseFlagButtonProps {
  sessionId: string | null;
  userId: string | null;
}

const FLAG_TYPES = [
  { value: "theological_inaccuracy", label: "Theologically inaccurate" },
  { value: "wrong_scripture", label: "Wrong scripture reference" },
  { value: "insensitive", label: "Insensitive or harmful" },
  { value: "denominational", label: "Denominational assumption" },
  { value: "other", label: "Other" },
];

const ResponseFlagButton = ({ sessionId, userId }: ResponseFlagButtonProps) => {
  const [open, setOpen] = useState(false);
  const [flagType, setFlagType] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!sessionId || !userId) return null;

  const handleSubmit = async () => {
    if (!flagType) {
      toast.error("Please select a reason.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("response_flags").insert({
        session_id: sessionId,
        user_id: userId,
        flag_type: flagType,
        flag_notes: notes.trim() || null,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Could not send feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-body text-muted-foreground/60 hover:text-gold transition-colors"
        aria-label="Flag this response"
      >
        <Flag size={11} />
        Flag this response
      </button>
    );
  }

  return (
    <div className="border border-gold/20 rounded-sm p-4 bg-scripture-card">
      <div className="flex items-center justify-between mb-3">
        <p className="font-serif text-xs uppercase tracking-widest text-gold">Flag this response</p>
        <button
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      {submitted ? (
        <p className="font-body text-sm text-foreground/90 py-2">
          Thank you — a real human reviews every flag.
        </p>
      ) : (
        <div className="space-y-3">
          <select
            value={flagType}
            onChange={(e) => setFlagType(e.target.value)}
            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:border-gold"
          >
            <option value="">Select a reason…</option>
            {FLAG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tell us more (optional)"
            rows={2}
            maxLength={1000}
            className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-gold"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !flagType}
            className="w-full border border-gold/30 text-gold text-sm font-body py-2 rounded-sm hover:bg-gold/10 transition-colors disabled:opacity-30"
          >
            {submitting ? "Sending…" : "Send feedback"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ResponseFlagButton;
