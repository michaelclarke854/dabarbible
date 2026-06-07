import { useEffect, useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { parseResponse, extractThresholdQuestion, ScriptureCard, TextBlock, type ContentBlock } from "./WisdomResponseBlocks";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { nativeSuccess, saveLastReflection, shareReflection } from "@/lib/nativePractice";
import { trackEvent } from "@/lib/trackEvent";
import { isIOSNative } from "@/lib/platform";

const INTENT_LABELS: Record<string, string> = {
  grief:     'Responding with grief in mind',
  doubt:     'Responding with your questions in mind',
  direction: 'Responding with discernment in mind',
  habit:     'Responding with daily growth in mind',
  crisis:    'Responding with care',
  curious:   'Responding with openness in mind',
};

const CRISIS_RESOURCE_MARKERS = [
  "you don't have to carry this alone",
  "988 suicide & crisis lifeline",
  "crisis text line",
  "you matter. help is available",
  "call or text 988",
  "text home to 741741",
];

function isCrisisResourceLine(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_RESOURCE_MARKERS.some(m => lower.includes(m));
}

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
  onContinueExploring?: (seedQuestion: string) => void;
  crisisActive?: boolean;
  intentKey?: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  thinking: "Dabar is listening…",
  scripture: "Dabar is searching scripture…",
  reflecting: "Dabar is reflecting…",
};

const CONTINUE_SEEDS = [
  "What would surrender look like here?",
  "Where is God already at work in this?",
  "What scripture speaks to this fear?",
  "How do I forgive when it still hurts?",
  "What does faithfulness look like today?",
  "How do I hear God's voice clearly?",
];

function pickSeeds(currentQuestion: string, n = 3): string[] {
  const pool = CONTINUE_SEEDS.filter(
    (s) => s.toLowerCase() !== currentQuestion.trim().toLowerCase()
  );
  const picked: string[] = [];
  const used = new Set<number>();
  while (picked.length < n && used.size < pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    if (used.has(i)) continue;
    used.add(i);
    picked.push(pool[i]);
  }
  return picked;
}

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
  onContinueExploring,
  crisisActive,
  intentKey,
}: ResponseScreenProps) => {
  const [visibleBlocks, setVisibleBlocks] = useState(0);
  const blocks = useMemo(() => parseResponse(response), [response]);
  const thresholdQuestion = useMemo(() => extractThresholdQuestion(blocks), [blocks]);
  const shouldReduceMotion = useReducedMotion();
  const seedQuestions = useMemo(() => pickSeeds(question, 3), [question]);
  const nativeIOS = isIOSNative();

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
    <div
      className="px-6 py-12 max-w-2xl mx-auto"
      style={{
        minHeight: "calc(100dvh - 80px)",
        paddingTop: "max(48px, env(safe-area-inset-top))",
        paddingBottom: "max(48px, env(safe-area-inset-bottom))",
      }}
    >
      <p
        className="mb-8"
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: "italic",
          fontSize: 15,
          lineHeight: 1.6,
          color: "rgba(247,242,232,0.55)",
        }}
      >
        "{question}"
      </p>

      {intentKey && !isStreaming && visibleBlocks >= blocks.length && (
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 10,
            fontWeight: 300,
            color: 'rgba(184,145,58,0.45)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            marginTop: -24,
            marginBottom: 12,
            animation: 'dabar-fadeup 0.6s ease 0.3s forwards',
            opacity: 0,
          }}
        >
          {INTENT_LABELS[intentKey] ?? null}
        </p>
      )}

      {crisisActive && (
        <div
          className="flex items-center gap-2 mb-4 px-3 py-2 rounded-sm"
          style={{
            background: "rgba(217,119,6,0.08)",
            border: "0.5px solid rgba(217,119,6,0.25)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(217,119,6,0.7)" strokeWidth="2">
            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(217,119,6,0.7)" }}>
            This reflection will be saved with a crisis marker in your journal
          </span>
        </div>
      )}

      <div className="w-8 h-px bg-gold mb-8" />

      <div className="space-y-4 mb-8">
        {blocks.map((block, i) => {
          const isVisible = i < visibleBlocks;
          const motionProps = shouldReduceMotion
            ? { initial: false, animate: { opacity: 1, y: 0 } }
            : {
                initial: { opacity: 0, y: 16 },
                animate: isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
                transition: {
                  duration: 0.5,
                  delay: i * 0.12,
                  ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
                },
              };
          return (
          <motion.div key={i} {...motionProps}>
            {block.type === "scripture" ? (
              <ScriptureCard
                block={block}
                onScriptureRef={onScriptureRef}
                userId={userId}
                profileDefault={profileVersion}
                onDefaultChanged={onProfileVersionChanged}
              />
            ) : isCrisisResourceLine(block.content) ? (
              <div className="dabar-glass border-l-2 border-amber-500/60 pl-4 py-3 bg-amber-500/5 rounded-sm">
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 17,
                    lineHeight: 1.65,
                    color: "#f7f2e8",
                  }}
                >
                  {block.content.replace(/^[•·]\s*/, "")}
                </p>
              </div>
            ) : (
              <TextBlock content={block.content} />
            )}
          </motion.div>
          );
        })}
      </div>

      {agentStage && !response && (
        <div
          className="flex items-center justify-center mb-6"
          role="status"
          aria-live="polite"
        >
          <span
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              fontSize: 18,
              color: "#b8913a",
              letterSpacing: "0.02em",
              animation: shouldReduceMotion
                ? "none"
                : "dabar-listening-pulse 2s ease-in-out infinite",
            }}
          >
            {STAGE_LABELS[agentStage] || "Dabar is listening…"}
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
              aria-label={isSaved ? "Saved to journal" : "Save reflection to journal"}
              className="font-body text-sm tracking-wide px-6 border border-gold text-gold rounded-sm transition-all hover:bg-gold hover:text-primary-foreground disabled:opacity-50 active:scale-[0.98]"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              {isSaved ? "Saved to journal" : isSaving ? "Saving…" : "Save to Journal"}
            </button>
            <button
              onClick={onAskAgain}
              aria-label="Ask another question"
              className="font-body text-sm tracking-wide px-6 text-muted-foreground hover:text-foreground transition-colors active:scale-[0.98]"
              style={{ minHeight: 44, minWidth: 44 }}
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

          {/* Share reflection */}
          <button
            type="button"
            aria-label="Share this reflection"
            onClick={async () => {
              // Build formatted share text from all blocks
              const parts: string[] = [];

              // Collect text blocks (mirror/wisdom) excluding the threshold question
              const textLines = blocks
                .filter(b => b.type === "text" && b.content !== thresholdQuestion)
                .map(b => b.content);
              if (textLines.length) {
                parts.push(textLines.join("\n\n"));
              }

              // Format scripture references cleanly
              const scriptureBlocks = blocks.filter(b => b.type === "scripture");
              if (scriptureBlocks.length) {
                const formatted = scriptureBlocks
                  .map(b => `"${b.verseText || b.content}"\n— ${b.reference || "Scripture"}`)
                  .join("\n\n");
                parts.push(formatted);
              }

              // Add threshold question
              if (thresholdQuestion) {
                parts.push(thresholdQuestion);
              }

              parts.push("— DabarBible.com");

              const shareText = parts.join("\n\n");
              try {
                await saveLastReflection(shareText);
                await shareReflection("A reflection from DabarBible", shareText);
                await nativeSuccess();
                trackEvent("share_clicked", {
                  screen: "response",
                  metadata: { method: "native" },
                  userId: userId ?? null,
                });
              } catch {
                // user cancelled share sheet
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "0.5px solid rgba(184,145,58,0.25)",
              borderRadius: 8,
              padding: "8px 14px",
              cursor: "pointer",
              marginTop: 8,
              transition: "border-color 0.2s ease",
            }}
            className="hover:border-gold/50"
          >
            <Share2 size={14} color="#b8913a" strokeWidth={1.5} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: "rgba(184,145,58,0.7)" }}>
              Share this reflection
            </span>
          </button>

          {!nativeIOS && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `"${question}" — answered through scripture on dabarbible.com`,
                  );
                  toast.success("Copied to clipboard");
                  trackEvent("share_clicked", {
                    screen: "response",
                    metadata: { method: "copy" },
                    userId: userId ?? null,
                  });
                } catch {
                  toast.error("Could not copy");
                }
              }}
              className="font-body text-xs tracking-wide px-4 py-2 border border-gold/30 text-gold rounded-sm hover:bg-gold/10 transition-colors self-start"
            >
              Copy & share
            </button>
          )}

          {onContinueExploring && (
            <div className="mt-8 pt-6 border-t border-gold/15">
              <p className="font-serif text-xs tracking-widest uppercase text-muted-foreground mb-3">
                Continue exploring
              </p>
              <div className="flex flex-col gap-2">
                {seedQuestions.map((seed) => (
                  <button
                    key={seed}
                    onClick={() => onContinueExploring(seed)}
                    className="text-left font-serif text-sm md:text-base text-foreground/85 hover:text-gold transition-colors leading-relaxed py-1"
                  >
                    → {seed}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResponseScreen;
