import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";
import { useAuth } from "@/contexts/AuthContext";

/* ── Intent data ─────────────────────────────────────────── */

const INTENTS = [
  {
    key: "grief",
    label: "I'm grieving or processing loss",
    sub: "grief · loss · mourning",
    isCrisis: false,
  },
  {
    key: "doubt",
    label: "Wrestling with doubt or hard questions",
    sub: "faith · doubt · the unanswerable",
    isCrisis: false,
  },
  {
    key: "direction",
    label: "I need direction for a big decision",
    sub: "guidance · discernment · wisdom",
    isCrisis: false,
  },
  {
    key: "habit",
    label: "I want to grow in my faith daily",
    sub: "devotion · scripture · habit",
    isCrisis: false,
  },
  {
    key: "crisis",
    label: "I'm in a dark place and need support",
    sub: "crisis · pain · sanctuary",
    crisisNote:
      "If you're in immediate danger, please contact the 988 Suicide & Crisis Lifeline.",
    isCrisis: true,
  },
  {
    key: "curious",
    label: "I'm curious and exploring faith",
    sub: "curiosity · questions · beginning",
    isCrisis: false,
  },
] as const;

type IntentKey = (typeof INTENTS)[number]["key"];

/* ── Flame SVG ───────────────────────────────────────────── */

function FlameSVG() {
  return (
    <svg
      width="28"
      height="38"
      viewBox="0 0 28 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 0 8px rgba(184,145,58,0.45))" }}
    >
      <path
        d="M14 2c3 6 10 12 10 22a10 10 0 1 1-20 0C4 14 11 8 14 2z"
        fill="url(#flameGrad)"
      />
      <defs>
        <linearGradient id="flameGrad" x1="14" y1="2" x2="14" y2="36">
          <stop offset="0%" stopColor="#f5d98a" />
          <stop offset="100%" stopColor="#b8913a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Intent icon SVGs ────────────────────────────────────── */

const ICONS: Record<IntentKey, JSX.Element> = {
  grief: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 21c-4-4-8-7.5-8-11a4 4 0 0 1 8 0 4 4 0 0 1 8 0c0 3.5-4 7-8 11z" />
    </svg>
  ),
  doubt: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.5 9a3 3 0 0 1 5 1c0 2-3 3-3 3M12 17h.01" />
    </svg>
  ),
  direction: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z" />
    </svg>
  ),
  habit: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  crisis: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
    </svg>
  ),
  curious: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
};

/* ── Component ───────────────────────────────────────────── */

interface OnboardingIntentProps {
  onComplete: () => void;
}

export function OnboardingIntent({ onComplete }: OnboardingIntentProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<IntentKey | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleBegin() {
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
    <div
      style={{
        minHeight: "100dvh",
        background: "#0e0b07",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 20px 32px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Candlelight glow */}
      <div
        style={{
          position: "absolute",
          top: -60,
          left: "50%",
          transform: "translateX(-50%)",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(184,145,58,0.18) 0%, rgba(184,145,58,0) 70%)",
          animation: "dabar-pulse 4s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Flame + tagline */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          marginBottom: 28,
          animation: "dabar-fadeup 0.6s ease forwards",
        }}
      >
        <div style={{ animation: "dabar-pulse2 3s ease-in-out infinite" }}>
          <FlameSVG />
        </div>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 10.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(184,145,58,0.6)",
          }}
        >
          AI-powered spiritual discernment
        </span>
      </div>

      {/* Heading */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 20,
          animation: "dabar-fadeup 0.6s ease 0.12s forwards",
          opacity: 0,
        }}
      >
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', 'Cinzel', serif",
            fontSize: 26,
            fontWeight: 400,
            color: "#f7f2e8",
            lineHeight: 1.25,
            margin: 0,
          }}
        >
          What brought you
          <br />
          here today?
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', 'Lato', sans-serif",
            fontSize: 13,
            color: "rgba(247,242,232,0.5)",
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          Your answer shapes how DABAR meets you
          <br />
          in this moment.
        </p>
      </div>

      {/* Gold divider */}
      <div
        style={{
          width: 40,
          height: 1,
          background: "rgba(184,145,58,0.3)",
          marginBottom: 20,
          animation: "dabar-fadeup 0.5s ease 0.2s forwards",
          opacity: 0,
        }}
      />

      {/* Option cards */}
      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 8 }}>
        {INTENTS.map((intent, i) => (
          <button
            key={intent.key}
            type="button"
            onClick={() => setSelected(intent.key)}
            style={{
              background:
                selected === intent.key
                  ? "rgba(184,145,58,0.08)"
                  : "rgba(255,255,255,0.028)",
              border: `0.5px solid ${
                intent.isCrisis
                  ? "rgba(184,145,58,0.22)"
                  : selected === intent.key
                    ? "rgba(184,145,58,0.55)"
                    : "rgba(184,145,58,0.13)"
              }`,
              borderRadius: 10,
              padding: "11px 13px",
              display: "flex",
              alignItems: "center",
              gap: 11,
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
              transition: "all 0.25s ease",
              animation: `dabar-fadeup 0.5s ease ${0.3 + i * 0.08}s forwards`,
              opacity: 0,
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "rgba(184,145,58,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#b8913a",
                flexShrink: 0,
              }}
            >
              {ICONS[intent.key]}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13.5,
                  fontWeight: 400,
                  color: "#f7f2e8",
                  lineHeight: 1.35,
                }}
              >
                {intent.label}
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 10.5,
                  color: "rgba(184,145,58,0.45)",
                  letterSpacing: "0.04em",
                  marginTop: 2,
                }}
              >
                {intent.sub}
              </div>
              {intent.isCrisis && selected === "crisis" && (
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    color: "rgba(184,145,58,0.7)",
                    marginTop: 6,
                    lineHeight: 1.4,
                    fontStyle: "italic",
                  }}
                >
                  {(intent as any).crisisNote}
                </div>
              )}
            </div>

            {/* Arrow */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={selected === intent.key ? "#b8913a" : "rgba(184,145,58,0.25)"}
              strokeWidth="2"
              style={{ flexShrink: 0, transition: "stroke 0.2s" }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        ))}
      </div>

      {/* CTA — progressive reveal */}
      <div
        style={{
          marginTop: 24,
          width: "100%",
          maxWidth: 380,
          opacity: selected ? 1 : 0,
          transform: selected ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.35s ease",
          pointerEvents: selected ? "auto" : "none",
        }}
      >
        <button
          type="button"
          onClick={handleBegin}
          disabled={!selected || saving}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #b8913a 0%, #d4a84b 100%)",
            color: "#0e0b07",
            fontFamily: "'Cormorant Garamond', 'Cinzel', serif",
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: "0.06em",
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.6 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {saving ? "Opening..." : "Begin my reflection →"}
        </button>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 10.5,
            color: "rgba(247,242,232,0.3)",
            lineHeight: 1.5,
            marginBottom: 10,
          }}
        >
          Your answers are private and shape only your experience.{" "}
          <a
            href="/privacy"
            style={{
              color: "rgba(184,145,58,0.5)",
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            Privacy policy
          </a>
        </p>
        <button
          type="button"
          onClick={onComplete}
          style={{
            background: "none",
            border: "none",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 10.5,
            color: "rgba(247,242,232,0.22)",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Skip for now
        </button>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes dabar-fadeup {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dabar-pulse {
          0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
          50%       { opacity: 1;   transform: translateX(-50%) scale(1.06); }
        }
        @keyframes dabar-pulse2 {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default OnboardingIntent;