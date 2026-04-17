import { useState, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { X } from "lucide-react";

const BetaFeedbackButton = forwardRef<HTMLDivElement>((_props, ref) => {
  const { isBeta, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isBeta || !user) return null;

  const submit = async () => {
    if (!feedback.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from("beta_feedback").insert({
        user_id: user.id,
        feedback_text: feedback.trim(),
        screen_context: window.location.pathname,
      });
      toast.success("Thank you for your feedback.");
      setFeedback("");
      setOpen(false);
    } catch {
      toast.error("Could not submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement> as any}
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-gold text-primary-foreground flex items-center justify-center shadow-lg hover:bg-gold-light transition-colors"
        title="Beta Feedback"
      >
        <span className="font-serif text-lg font-bold">β</span>
      </button>
    );
  }

  return (
    <div ref={ref} className="fixed bottom-24 right-4 z-40 w-80 bg-card border border-border rounded-sm shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="font-serif text-gold text-sm tracking-widest uppercase">Beta Feedback</p>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-muted-foreground text-xs font-body">What did you notice?</p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
          placeholder="Share your thoughts..."
        />
        <button
          onClick={submit}
          disabled={submitting || !feedback.trim()}
          className="w-full bg-gold text-primary-foreground font-serif text-xs uppercase tracking-widest py-2 rounded-sm hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {submitting ? "Sending..." : "Submit"}
        </button>
      </div>
    </div>
  );
});

BetaFeedbackButton.displayName = "BetaFeedbackButton";

export default BetaFeedbackButton;
