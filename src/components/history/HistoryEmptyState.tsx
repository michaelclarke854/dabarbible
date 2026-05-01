interface HistoryEmptyStateProps {
  onAskQuestion: () => void;
}

export function HistoryEmptyState({ onAskQuestion }: HistoryEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 px-6"
      style={{
        animation: "dabar-fadeup 0.6s ease forwards",
        opacity: 0,
      }}
    >
      {/* Flame icon */}
      <svg
        width="28"
        height="38"
        viewBox="0 0 28 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: "drop-shadow(0 0 8px rgba(184,145,58,0.3))",
          animation: "dabar-pulse2 3s ease-in-out infinite",
          marginBottom: 20,
        }}
      >
        <path
          d="M14 2c3 6 10 12 10 22a10 10 0 1 1-20 0C4 14 11 8 14 2z"
          fill="url(#histFlameGrad)"
        />
        <defs>
          <linearGradient id="histFlameGrad" x1="14" y1="2" x2="14" y2="36">
            <stop offset="0%" stopColor="#f5d98a" />
            <stop offset="100%" stopColor="#b8913a" />
          </linearGradient>
        </defs>
      </svg>

      {/* Headline */}
      <p
        style={{
          fontFamily: "'Cormorant Garamond', 'Cinzel', serif",
          fontSize: 18,
          fontStyle: "italic",
          color: "#f0ead8",
          textAlign: "center",
          marginBottom: 10,
        }}
      >
        Your reflections will appear here.
      </p>

      {/* Sub-text */}
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          fontWeight: 300,
          color: "rgba(240,234,216,0.4)",
          textAlign: "center",
          maxWidth: 280,
          lineHeight: 1.5,
          marginBottom: 24,
        }}
      >
        Every question you ask is saved here for you to return to.
      </p>

      {/* Ghost CTA */}
      <button
        type="button"
        onClick={onAskQuestion}
        style={{
          background: "none",
          border: "0.5px solid rgba(184,145,58,0.3)",
          borderRadius: 8,
          padding: "10px 24px",
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 14,
          fontStyle: "italic",
          color: "#b8913a",
          cursor: "pointer",
          transition: "border-color 0.2s ease",
        }}
      >
        Ask your first question →
      </button>

      {/* Keyframes (in case not globally available) */}
      <style>{`
        @keyframes dabar-fadeup {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dabar-pulse2 {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}