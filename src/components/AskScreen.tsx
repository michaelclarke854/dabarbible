import { useState, useEffect, useRef, forwardRef } from "react";
import { Link } from "react-router-dom";
import { HardQuestionMode } from "@/components/HardQuestionMode";
import { trackEvent } from "@/lib/trackEvent";
import {
  parseScriptureReference,
  looksLikeScriptureReference,
  type ScriptureParseResult,
} from "@/lib/scriptureParser";

interface AskScreenProps {
  onSeekWisdom: (question: string) => void;
  isLoading: boolean;
  guestQuestionsUsed?: number;
  guestLimit?: number;
  onScriptureRef?: (ref: string) => void;
  onBackToResponse?: () => void;
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

const isCapacitor =
  typeof window !== "undefined" &&
  !!(window as any).Capacitor?.isNativePlatform?.();
const isDev = (import.meta as any)?.env?.DEV || false;

const AskScreen = forwardRef<HTMLDivElement, AskScreenProps>(({ onSeekWisdom, isLoading, guestQuestionsUsed, guestLimit, onScriptureRef, onBackToResponse }, ref) => {
  const [question, setQuestion] = useState("");
  const [scriptureHint, setScriptureHint] = useState<ScriptureParseResult | null>(null);
  const [promptIndex, setPromptIndex] = useState(() =>
    Math.floor(Math.random() * SOUL_PROMPTS.length)
  );
  const [promptVisible, setPromptVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [placeholderIndex, setPlaceholderIndex] = useState(() =>
    Math.floor(Math.random() * QUESTION_PLACEHOLDERS.length)
  );
  const [hardModeOpen, setHardModeOpen] = useState(false);

  // Track latest "has input" without re-subscribing the interval on every
  // keystroke (which caused input lag on Android WebView).
  const hasInputRef = useRef(false);
  useEffect(() => {
    hasInputRef.current = !!question;
  }, [question]);

  // Combined ticker for both rotating prompts and placeholder.
  // Pauses when the document is hidden (background tab / locked screen) and
  // when the textarea has user input, so we don't burn battery/CPU on Android
  // 8 WebView re-rendering invisible UI. Effect runs ONCE per mount.
  useEffect(() => {
    const start = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        setPromptVisible(false);
        setTimeout(() => {
          setPromptIndex((prev) => (prev + 1) % SOUL_PROMPTS.length);
          setPromptVisible(true);
        }, 600);
        if (!hasInputRef.current) {
          setPlaceholderIndex((prev) => (prev + 1) % QUESTION_PLACEHOLDERS.length);
        }
      }, 4000);
    };
    const stop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    start();
    const onVis = () => {
      if (typeof document !== "undefined" && document.hidden) stop();
      else start();
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
    }
    return () => {
      stop();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
    };
  }, []);

  const routeScripture = (bookName: string, chapter: number, verse?: number) => {
    if (!onScriptureRef) return false;
    // Existing deep-link parser requires `:verse`; default to verse 1 so the
    // scripture screen opens at the top of the chapter.
    const ref = `${bookName} ${chapter}:${verse ?? 1}`;
    onScriptureRef(ref);
    return true;
  };

  const handleSubmit = () => {
    const text = question.trim();
    if (!text || isLoading) return;

    // Only treat input as a scripture reference if it looks like one.
    // Long-form wisdom questions ("Why does God allow suffering?") fall through.
    if (looksLikeScriptureReference(text)) {
      const parsed = parseScriptureReference(text);
      if (parsed.state === "valid" && parsed.bookName && parsed.chapter) {
        setScriptureHint(null);
        if (routeScripture(parsed.bookName, parsed.chapter, parsed.verse)) return;
        // No handler wired — fall through to wisdom flow
      } else if (
        parsed.state === "ambiguous" ||
        parsed.state === "missingChapter" ||
        (parsed.state === "invalid" && parsed.fuzzyMatch)
      ) {
        setScriptureHint(parsed);
        return;
      }
      // 'invalid' without fuzzyMatch but looked scripture-like — show gentle hint
      if (parsed.state === "invalid" && !parsed.fuzzyMatch) {
        setScriptureHint(parsed);
        return;
      }
    }

    setScriptureHint(null);
    onSeekWisdom(text);
  };

  const handleSuggestionTap = (suggestion: string) => {
    if (isDev) {
      // TODO: Remove before production Play Store release
      console.log("[DABAR] scripture:suggestion", {
        originalInput: question,
        selectedSuggestion: suggestion,
        isCapacitor,
      });
    }
    const parsed = parseScriptureReference(suggestion);
    if (parsed.state === "valid" && parsed.bookName && parsed.chapter) {
      setScriptureHint(null);
      routeScripture(parsed.bookName, parsed.chapter, parsed.verse);
    } else if (parsed.state === "missingChapter") {
      setScriptureHint(parsed);
    }
  };

  const handleChapterTap = (chapter: number) => {
    if (!scriptureHint?.bookName) return;
    setScriptureHint(null);
    routeScripture(scriptureHint.bookName, chapter);
  };

  const handleFuzzyConfirm = () => {
    if (!scriptureHint?.fuzzyMatch) return;
    const next = scriptureHint.fuzzyMatch;
    setQuestion(next);
    const parsed = parseScriptureReference(next);
    if (parsed.state === "valid" && parsed.bookName && parsed.chapter) {
      setScriptureHint(null);
      routeScripture(parsed.bookName, parsed.chapter, parsed.verse);
    } else {
      setScriptureHint(parsed);
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
        {onBackToResponse && (
          <button
            onClick={onBackToResponse}
            className="text-[10px] font-body tracking-wider uppercase text-muted-foreground hover:text-gold transition-colors flex items-center gap-1 mb-3"
          >
            ← Back to last response
          </button>
        )}
        <textarea
          data-ask-input=""
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            if (scriptureHint) setScriptureHint(null);
          }}
          placeholder={QUESTION_PLACEHOLDERS[placeholderIndex]}
          className="w-full min-h-[160px] bg-[rgba(255,250,238,0.08)] border border-[rgba(255,250,238,0.25)] outline-none resize-none text-lg font-body text-foreground placeholder:text-muted-foreground/60 leading-relaxed p-4 focus:ring-0 focus:bg-[rgba(255,250,238,0.12)] focus:border-[rgba(232,184,75,0.6)] transition-colors rounded-sm"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div className="w-full h-px bg-border mb-4" />

        {scriptureHint && (
          <div className="mb-4 text-center">
            {scriptureHint.state === "ambiguous" && scriptureHint.suggestions && (
              <>
                <p className="font-body text-xs text-muted-foreground mb-2 tracking-wide">
                  Did you mean:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {scriptureHint.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSuggestionTap(s)}
                      className="px-3 py-1.5 rounded-sm border border-gold/40 text-gold font-body text-xs tracking-wide hover:bg-gold/10 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
            {scriptureHint.state === "missingChapter" && scriptureHint.maxChapters && (
              <>
                <p className="font-body text-xs text-muted-foreground mb-2 tracking-wide">
                  {scriptureHint.bookName} has {scriptureHint.maxChapters} chapters. Which chapter?
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 max-h-32 overflow-y-auto">
                  {Array.from({ length: scriptureHint.maxChapters }, (_, i) => i + 1).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => handleChapterTap(ch)}
                      className="min-w-[2rem] px-2 py-1 rounded-sm border border-border text-foreground hover:border-gold hover:text-gold font-serif text-xs transition-colors"
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </>
            )}
            {scriptureHint.state === "invalid" && scriptureHint.fuzzyMatch && (
              <>
                <p className="font-body text-xs text-muted-foreground mb-2 tracking-wide">
                  Did you mean <span className="text-gold">{scriptureHint.fuzzyMatch}</span>?
                </p>
                <button
                  type="button"
                  onClick={handleFuzzyConfirm}
                  className="px-3 py-1.5 rounded-sm border border-gold/40 text-gold font-body text-xs tracking-wide hover:bg-gold/10 transition-colors"
                >
                  Yes, {scriptureHint.fuzzyMatch}
                </button>
              </>
            )}
            {scriptureHint.state === "invalid" && !scriptureHint.fuzzyMatch && (
              <p className="font-body text-xs text-muted-foreground tracking-wide">
                We couldn't find that scripture reference. Try a book name like "John 3" or "Psalm 23".
              </p>
            )}
          </div>
        )}

        <p className="text-[10px] font-body text-muted-foreground/70 text-center tracking-wide mb-4 leading-relaxed">
          AI-assisted reflection grounded in scripture —{" "}
          <Link to="/doctrine" className="text-gold hover:underline">
            not pastoral counsel
          </Link>
        </p>

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
        style={{
          height: 54,
          borderRadius: 6,
          border: "0.5px solid rgba(184,145,58,0.4)",
          background: "linear-gradient(135deg, #b8913a 0%, #d4a84b 100%)",
          color: "#0e0b07",
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 16,
          fontStyle: "italic",
          fontWeight: 500,
          letterSpacing: "0.06em",
          cursor: !question.trim() || isLoading ? "not-allowed" : "pointer",
          opacity: !question.trim() || isLoading ? 0.4 : 1,
          transition: "all 0.3s ease",
          animation: !question.trim() && !isLoading ? "dabar-pulse-cta 3s ease-in-out infinite" : "none",
          padding: "0 40px",
        }}
      >
        {isLoading ? "Seeking…" : "Seek Wisdom"}
      </button>

      {!isLoading && (
        <button
          type="button"
          onClick={() => {
            trackEvent("hard_question_mode_opened", { screen: "ask" });
            setHardModeOpen(true);
          }}
          className="mt-4 text-xs font-body text-gold hover:text-gold-dark transition-opacity"
        >
          Afraid to ask? Start here →
        </button>
      )}
      {hardModeOpen && (
        <HardQuestionMode
          onSelectQuestion={(q) => setQuestion(q)}
          onClose={() => setHardModeOpen(false)}
        />
      )}
      {isLoading && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-gold animate-candle-glow" />
          <span className="text-xs font-body text-muted-foreground tracking-wide">
            Be still, and wait…
          </span>
        </div>
      )}

      {/* Guest free-questions counter */}
      {guestLimit != null && guestQuestionsUsed != null && (
        <div className="mt-6 text-center">
          <p className="font-body text-[11px] tracking-wide text-muted-foreground/70">
            {guestQuestionsUsed >= guestLimit ? (
              <span className="text-gold">
                Sign in to continue seeking wisdom
              </span>
            ) : (
              <>
                <span className="text-gold font-medium">
                  {guestLimit - guestQuestionsUsed}
                </span>
                {" "}free question{guestLimit - guestQuestionsUsed === 1 ? "" : "s"} remaining
              </>
            )}
          </p>
          <div className="flex justify-center gap-1.5 mt-2">
            {Array.from({ length: guestLimit }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i < guestQuestionsUsed ? "bg-gold/30" : "bg-gold"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

AskScreen.displayName = "AskScreen";

export default AskScreen;
