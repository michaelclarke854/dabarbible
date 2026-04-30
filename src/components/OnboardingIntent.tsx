import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motionVariants";

const INTENTS = [
  { key: "grief",      label: "I'm grieving or processing loss",             icon: "🕊️" },
  { key: "doubt",      label: "I'm wrestling with doubt or hard questions",  icon: "⚖️" },
  { key: "guidance",   label: "I need direction for a big decision",         icon: "🧭" },
  { key: "habit",      label: "I want to grow in my faith daily",            icon: "📖" },
  { key: "crisis",     label: "I'm in a dark place and need support",        icon: "🌑" },
  { key: "curiosity",  label: "I'm curious and exploring faith",             icon: "✨" },
] as const;

type IntentKey = typeof INTENTS[number]["key"];

interface OnboardingIntentProps {
  onComplete: () => void;
}

export function OnboardingIntent({ onComplete }: OnboardingIntentProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<IntentKey | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    if (!selected || !user) return;
    setSaving(true);
    try {
      const intent = INTENTS.find((i) => i.key === selected)!;

      await supabase.from("onboarding_intent").insert({
        user_id: user.id,
        intent_key: intent.key,
        intent_label: intent.label,
      } as any);

      await supabase
        .from("profiles")
        .update({
          onboarding_intent_key: intent.key,
          onboarding_completed_at: new Date().toISOString(),
        } as any)
        .eq("user_id", user.id);

      trackEvent("onboarding_intent_selected", {
        screen: "onboarding_intent",
        metadata: { intent_key: intent.key },
      });
      trackEvent("onboarding_completed", { screen: "onboarding_intent" });
      onComplete();
    } catch (err) {
      console.error("Failed to save intent:", err);
      onComplete();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <motion.div {...fadeUp(0)} className="w-full max-w-md">
        <h1 className="font-serif text-2xl sm:text-3xl text-foreground tracking-widest text-center mb-2">
          What brought you here today?
        </h1>
        <p className="font-body text-sm text-muted-foreground text-center mb-8 leading-relaxed">
          DABAR will tailor your first experience to meet you where you are.
        </p>

        <div className="space-y-3 mb-8">
          {INTENTS.map((intent) => (
            <button
              key={intent.key}
              type="button"
              onClick={() => setSelected(intent.key)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-sm text-left transition-all duration-150 border ${
                selected === intent.key
                  ? "bg-gold text-primary-foreground border-gold shadow-lg"
                  : "bg-card text-foreground border-gold/20 hover:border-gold/40"
              }`}
            >
              <span className="text-xl">{intent.icon}</span>
              <span className="font-body text-sm">{intent.label}</span>
            </button>
          ))}
        </div>

        <p className="text-center mb-6">
          <button
            type="button"
            onClick={onComplete}
            className="font-body text-xs text-muted-foreground hover:text-gold transition-colors"
          >
            Skip for now
          </button>
        </p>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected || saving}
          className="w-full font-serif tracking-widest text-sm uppercase py-4 bg-gold text-primary-foreground rounded-sm transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold-dark"
        >
          {saving ? "Saving…" : "Begin"}
        </button>
      </motion.div>
    </div>
  );
}

export default OnboardingIntent;