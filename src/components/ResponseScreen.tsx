import { useEffect, useState } from "react";

interface ResponseScreenProps {
  question: string;
  response: string;
  scriptures: string[];
  onAskAgain: () => void;
  onReflect: () => void;
  isSaving: boolean;
  isSaved: boolean;
}

const ResponseScreen = ({
  question,
  response,
  scriptures,
  onAskAgain,
  onReflect,
  isSaving,
  isSaved,
}: ResponseScreenProps) => {
  const [visibleLines, setVisibleLines] = useState(0);
  const lines = response.split("\n").filter((l) => l.trim());

  useEffect(() => {
    setVisibleLines(0);
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= lines.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [response, lines.length]);

  return (
    <div className="min-h-[calc(100vh-80px)] px-6 py-12 max-w-2xl mx-auto">
      <p className="font-body text-sm text-muted-foreground italic mb-8 leading-relaxed">
        "{question}"
      </p>

      <div className="w-8 h-px bg-gold mb-8" />

      <div className="space-y-4 mb-8">
        {lines.map((line, i) => (
          <p
            key={i}
            className={`font-serif text-lg md:text-xl leading-relaxed text-foreground transition-all duration-700 ${
              i < visibleLines ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            {line}
          </p>
        ))}
      </div>

      {scriptures.length > 0 && visibleLines >= lines.length && (
        <div className="animate-fade-in-up mb-12">
          <div className="w-8 h-px bg-gold mb-4" />
          {scriptures.map((ref, i) => (
            <p key={i} className="text-gold font-serif text-sm tracking-wide mb-1">
              — {ref}
            </p>
          ))}
        </div>
      )}

      {visibleLines >= lines.length && (
        <div className="animate-fade-in-up flex flex-col sm:flex-row gap-4 pt-4">
          <button
            onClick={onReflect}
            disabled={isSaving || isSaved}
            className="font-body text-sm tracking-wide px-6 py-3 border border-gold text-gold rounded-sm transition-all hover:bg-gold hover:text-primary-foreground disabled:opacity-50"
          >
            {isSaved ? "Saved to journal" : isSaving ? "Saving…" : "Reflect on this"}
          </button>
          <button
            onClick={onAskAgain}
            className="font-body text-sm tracking-wide px-6 py-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            Ask Again
          </button>
        </div>
      )}
    </div>
  );
};

export default ResponseScreen;
