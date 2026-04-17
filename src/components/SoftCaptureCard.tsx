import { Bookmark } from "lucide-react";

interface SoftCaptureCardProps {
  onSignUp: () => void;
  questionsRemaining: number;
}

/**
 * Shown after Q1 (anonymous). Gentle, non-blocking nudge — the answer
 * is already visible above. Encourages account creation so the user
 * can keep their reflection.
 */
const SoftCaptureCard = ({ onSignUp, questionsRemaining }: SoftCaptureCardProps) => {
  return (
    <div className="mt-8 max-w-xl mx-auto px-4">
      <div className="border border-gold/20 rounded-sm bg-scripture-card p-5 md:p-6">
        <div className="flex items-start gap-3 mb-3">
          <Bookmark size={16} className="text-gold flex-shrink-0 mt-0.5" />
          <p className="font-serif text-sm uppercase tracking-widest text-gold">
            Keep this reflection
          </p>
        </div>
        <p className="font-body text-sm text-foreground/85 leading-relaxed mb-4">
          Create a free account to save this to your private journal — and ask
          {" "}
          {questionsRemaining > 0
            ? `${questionsRemaining} more free ${questionsRemaining === 1 ? "question" : "questions"} before any sign-up is required.`
            : "unlimited questions during your 30-day free trial."}
        </p>
        <button
          onClick={onSignUp}
          className="font-serif text-sm uppercase tracking-widest px-6 py-2.5 bg-gold text-primary-foreground rounded-sm hover:bg-gold-dark transition-colors"
        >
          Save & continue free
        </button>
        <p className="font-['Playfair_Display'] italic text-xs text-muted-foreground/70 mt-3">
          30 days free · no credit card · cancel anytime
        </p>
      </div>
    </div>
  );
};

export default SoftCaptureCard;
