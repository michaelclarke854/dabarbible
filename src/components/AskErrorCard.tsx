import { Link } from "react-router-dom";
import { relatedReadingFor } from "@/lib/relatedReading";

interface AskErrorCardProps {
  question: string;
  showCrisis: boolean;
  onRetry: () => void;
  onDismiss: () => void;
  retrying?: boolean;
}

export function AskErrorCard({ question, showCrisis, onRetry, onDismiss, retrying }: AskErrorCardProps) {
  const reading = relatedReadingFor(question);
  return (
    <div className="px-6 pt-8">
      <div
        role="alert"
        className="dabar-glass mx-auto max-w-lg rounded-sm border border-gold/30 p-6 text-center"
      >
        <p className="font-['Playfair_Display'] italic text-sm text-muted-foreground mb-3">"{question}"</p>
        <p className="font-serif text-lg text-foreground mb-5">We couldn't reach the reflection just now.</p>

        {showCrisis && (
          <p className="font-body text-sm text-foreground leading-relaxed border border-gold/40 rounded-sm p-3 mb-5">
            You don't have to carry this alone. Call or text{" "}
            <a href="tel:988" className="text-gold underline">988</a> (Suicide &amp; Crisis Lifeline) · Text{" "}
            <a href="sms:741741?&body=HOME" className="text-gold underline">HOME to 741741</a>.
          </p>
        )}

        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="w-full bg-gold text-primary-foreground font-body font-semibold py-3 rounded-sm min-h-[48px] hover:bg-gold-light transition-colors disabled:opacity-60"
        >
          {retrying ? "Seeking…" : "Try again"}
        </button>

        <p className="font-body text-xs text-muted-foreground mt-4">
          Meanwhile, read:{" "}
          <Link to={reading.href} className="text-gold hover:underline">{reading.label}</Link>
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 text-[11px] font-body tracking-wider uppercase text-muted-foreground hover:text-gold"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default AskErrorCard;
