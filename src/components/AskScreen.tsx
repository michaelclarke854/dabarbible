import { useState, useEffect, useRef, forwardRef } from "react";

interface AskScreenProps {
  onSeekWisdom: (question: string) => void;
  isLoading: boolean;
}

const SOUL_PROMPTS = [
  "I don't know if I'm making the right decision...",
  "I'm afraid of what's ahead...",
  "I keep failing at the same thing...",
  "I'm struggling with someone I love...",
  "I don't know what I'm supposed to do with my life...",
];

const QUESTION_PLACEHOLDERS = [
  "Why does God allow suffering?",
  "What does the Bible say about forgiveness?",
  "How do I pray when I feel nothing?",
  "What is my purpose according to scripture?",
  "How do I forgive someone who hurt me?",
  "Is God angry with me?",
  "What does the Bible say about grief?",
  "How do I trust God in uncertainty?",
  "What does scripture say about anxiety?",
  "How do I find peace in this season?",
];

const AskScreen = forwardRef<HTMLDivElement, AskScreenProps>(({ onSeekWisdom, isLoading }, ref) => {
  const [question, setQuestion] = useState("");
  const [promptIndex, setPromptIndex] = useState(() =>
    Math.floor(Math.random() * SOUL_PROMPTS.length)
  );
  const [promptVisible, setPromptVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [placeholderIndex, setPlaceholderIndex] = useState(() =>
    Math.floor(Math.random() * QUESTION_PLACEHOLDERS.length)
  );
  const placeholderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setPromptVisible(false);
      setTimeout(() => {
        setPromptIndex((prev) => (prev + 1) % SOUL_PROMPTS.length);
        setPromptVisible(true);
      }, 600);
    }, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Rotate the textarea placeholder every 4s — only when the field is empty.
  useEffect(() => {
    if (question) return;
    placeholderTimerRef.current = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % QUESTION_PLACEHOLDERS.length);
    }, 4000);
    return () => {
      if (placeholderTimerRef.current) clearInterval(placeholderTimerRef.current);
    };
  }, [question]);

  const handleSubmit = () => {
    if (question.trim() && !isLoading) {
      onSeekWisdom(question.trim());
    }
  };

  const handlePromptTap = () => {
    if (!isLoading) {
      setQuestion(SOUL_PROMPTS[promptIndex]);
    }
  };

  return (
    <div ref={ref} className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 py-12">
      <h1 className="font-serif text-4xl md:text-5xl text-foreground tracking-widest text-center">
        DABAR
      </h1>
      <p className="text-gold font-serif text-sm tracking-wider mt-1 mb-1">דָּבָר</p>
      <p className="font-['Playfair_Display'] italic text-muted-foreground text-sm tracking-wide mb-2">
        The word that finds you.
      </p>
      <div className="w-12 h-px bg-gold my-6" />

      <div className="w-full max-w-lg">
        <textarea
          data-ask-input=""
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={QUESTION_PLACEHOLDERS[placeholderIndex]}
          className="w-full min-h-[160px] bg-input border-none outline-none resize-none text-lg font-body text-foreground placeholder:text-muted-foreground/60 leading-relaxed p-4 focus:ring-0 rounded-sm"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div className="w-full h-px bg-border mb-4" />

        {!question && !isLoading && (
          <button
            onClick={handlePromptTap}
            className={`w-full text-center font-['Playfair_Display'] italic text-gold hover:text-gold-dark transition-all duration-500 mb-6 ${
              promptVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{ fontSize: '12px' }}
          >
            "{SOUL_PROMPTS[promptIndex]}"
          </button>
        )}
        {(question || isLoading) && <div className="mb-6" />}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!question.trim() || isLoading}
        className="font-serif tracking-widest text-sm uppercase px-10 py-4 bg-gold text-primary-foreground rounded-sm transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed enabled:animate-golden-pulse enabled:hover:bg-gold-dark"
      >
        {isLoading ? "Seeking…" : "Seek Wisdom"}
      </button>

      {isLoading && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-gold animate-candle-glow" />
          <span className="text-xs font-body text-muted-foreground tracking-wide">
            Be still, and wait…
          </span>
        </div>
      )}
    </div>
  );
});

AskScreen.displayName = "AskScreen";

export default AskScreen;
