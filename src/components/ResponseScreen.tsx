import { useEffect, useState, useMemo } from "react";
import { parseResponse, extractThresholdQuestion, ScriptureCard, type ContentBlock } from "./WisdomResponseBlocks";

interface ResponseScreenProps {
  question: string;
  response: string;
  scriptures: string[];
  isStreaming?: boolean;
  agentStage?: "thinking" | "scripture" | "reflecting" | null;
  onAskAgain: () => void;
  onReflect: () => void;
  onStir: (thresholdQuestion: string) => void;
  isSaving: boolean;
  isSaved: boolean;
  onScriptureRef?: (ref: string, version?: string) => void;
  userId?: string;
  profileVersion?: string;
  onProfileVersionChanged?: (v: string) => void;
}

const STAGE_LABELS: Record<string, string> = {
  thinking: "Listening…",
  scripture: "Searching scripture…",
  reflecting: "Reflecting…",
};

const ResponseScreen = ({
  question,
  response,
  scriptures,
  isStreaming = false,
  agentStage,
  onAskAgain,
  onReflect,
  onStir,
  isSaving,
  isSaved,
  onScriptureRef,
  userId,
  profileVersion,
  onProfileVersionChanged,
}: ResponseScreenProps) => {
  const [visibleBlocks, setVisibleBlocks] = useState(0);
  const blocks = useMemo(() => parseResponse(response), [response]);
  const thresholdQuestion = useMemo(() => extractThresholdQuestion(blocks), [blocks]);

  // During streaming, show all blocks immediately; after streaming ends, keep them all visible
  useEffect(() => {
    if (isStreaming) {
      setVisibleBlocks(blocks.length);
      return;
    }
    // When streaming finishes, ensure all blocks stay visible
    if (blocks.length > 0 && visibleBlocks < blocks.length) {
      setVisibleBlocks(blocks.length);
    }
  }, [isStreaming, blocks.length]);

  return (
    <div className="min-h-[calc(100vh-80px)] px-6 py-12 max-w-2xl mx-auto">
      <p className="font-body text-sm text-muted-foreground italic mb-8 leading-relaxed">
        "{question}"
      </p>

      <div className="w-8 h-px bg-gold mb-8" />

      <div className="space-y-4 mb-8">
        {blocks.map((block, i) => (
          <div
            key={i}
            className={`transition-all duration-700 ${
              i < visibleBlocks ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            {block.type === "scripture" ? (
              <ScriptureCard
                block={block}
                onScriptureRef={onScriptureRef}
                userId={userId}
                profileDefault={profileVersion}
                onDefaultChanged={onProfileVersionChanged}
              />
            ) : isCrisisResourceLine(block.content) ? (
              <div className="border-l-2 border-amber-500/60 pl-4 py-3 bg-amber-500/5 rounded-sm">
                <p className="font-serif text-base leading-relaxed text-foreground">
                  {block.content.replace(/^[•·]\s*/, "")}
                </p>
              </div>
            ) : (
              <p className="font-serif text-lg md:text-xl leading-relaxed text-foreground">
                {block.content}
              </p>
            )}
          </div>
        ))}
      </div>

      {agentStage && !response && (
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" style={{ animationDelay: "200ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" style={{ animationDelay: "400ms" }} />
          </div>
          <span className="font-body text-sm text-muted-foreground italic">
            {STAGE_LABELS[agentStage] || "Listening…"}
          </span>
        </div>
      )}

      {isStreaming && response && (
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-2 h-5 bg-gold animate-pulse" />
        </div>
      )}

      {visibleBlocks >= blocks.length && !isStreaming && (
        <div className="animate-fade-in-up flex flex-col gap-3 pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onReflect}
              disabled={isSaving || isSaved}
              className="font-body text-sm tracking-wide px-6 py-3 border border-gold text-gold rounded-sm transition-all hover:bg-gold hover:text-primary-foreground disabled:opacity-50"
            >
              {isSaved ? "Saved to journal" : isSaving ? "Saving…" : "Save to Journal"}
            </button>
            <button
              onClick={onAskAgain}
              className="font-body text-sm tracking-wide px-6 py-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              Ask Again
            </button>
          </div>

          {thresholdQuestion && (
            <button
              onClick={() => onStir(thresholdQuestion)}
              className="mt-2 font-['Playfair_Display'] italic text-sm text-gold-light hover:text-gold transition-colors text-left leading-relaxed"
            >
              "What did this stir in you?" →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ResponseScreen;
