import { trackEvent } from "@/lib/trackEvent";
import { motion, AnimatePresence } from "framer-motion";

const HARD_QUESTIONS = [
  "Is God punishing me?",
  "Why did God let this happen?",
  "I've stopped believing — is that okay?",
  "Where was God when I needed him most?",
  "Am I too broken to be loved by God?",
  "Why do good people suffer?",
  "Does prayer actually change anything?",
] as const;

interface HardQuestionModeProps {
  onSelectQuestion: (question: string) => void;
  onClose: () => void;
}

export function HardQuestionMode({ onSelectQuestion, onClose }: HardQuestionModeProps) {
  function handleSelect(question: string) {
    trackEvent("hard_question_submitted", {
      screen: "hard_question_mode",
      metadata: { question_preview: question.slice(0, 40) },
    });
    onSelectQuestion(question);
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60" />
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-background border border-gold/20 rounded-t-lg sm:rounded-sm shadow-2xl max-h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-serif text-lg text-foreground tracking-wide">
                The hard questions
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground text-lg"
              >
                ✕
              </button>
            </div>
            <p className="font-body text-xs text-muted-foreground leading-relaxed">
              The questions with no clean answers. DABAR won't give you a sermon — it will sit
              with you honestly.
            </p>
          </div>

          {/* Question list */}
          <div className="overflow-y-auto flex-1 divide-y divide-border/50">
            {HARD_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => handleSelect(question)}
                className="w-full px-6 py-4 text-left text-sm font-body text-foreground hover:bg-gold/5 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border">
            <p className="text-[11px] font-body text-muted-foreground text-center">
              Or type your own question in the main field
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default HardQuestionMode;