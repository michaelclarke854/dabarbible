import { useState } from "react";

interface AskScreenProps {
  onSeekWisdom: (question: string) => void;
  isLoading: boolean;
}

const AskScreen = ({ onSeekWisdom, isLoading }: AskScreenProps) => {
  const [question, setQuestion] = useState("");

  const handleSubmit = () => {
    if (question.trim() && !isLoading) {
      onSeekWisdom(question.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 py-12">
      <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2 tracking-wide text-center">
        The Voice
      </h1>
      <div className="w-12 h-px bg-gold my-6" />

      <div className="w-full max-w-lg">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What is weighing on your heart today?"
          className="w-full min-h-[160px] bg-transparent border-none outline-none resize-none text-lg font-body text-foreground placeholder:text-muted-foreground/60 leading-relaxed p-4 focus:ring-0"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div className="w-full h-px bg-border mb-8" />
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
};

export default AskScreen;
