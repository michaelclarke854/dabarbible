import { useState } from "react";

const VERSIONS = ["KJV", "NIV", "ESV", "AMP", "MSG", "NLT"] as const;
type BibleVersion = (typeof VERSIONS)[number];

interface ScriptureVersionPillsProps {
  profileDefault?: BibleVersion;
  reference: string;
  initialText: string;
  onVersionChange?: (version: BibleVersion, text: string) => void;
}

const VERSION_API_MAP: Record<BibleVersion, string> = {
  KJV: "kjv",
  NIV: "niv", // bible-api.com doesn't support all — we'll handle gracefully
  ESV: "esv",
  AMP: "amp",
  MSG: "msg",
  NLT: "nlt",
};

const ScriptureVersionPills = ({
  profileDefault = "KJV",
  reference,
  initialText,
  onVersionChange,
}: ScriptureVersionPillsProps) => {
  const [active, setActive] = useState<BibleVersion>(profileDefault);
  const [loading, setLoading] = useState(false);
  const [displayText, setDisplayText] = useState(initialText);
  const [cachedTexts, setCachedTexts] = useState<Partial<Record<BibleVersion, string>>>({
    [profileDefault]: initialText,
  });

  const switchedFromDefault = active !== profileDefault;

  const handlePillClick = async (version: BibleVersion) => {
    if (version === active || loading) return;

    // Use cache if available
    if (cachedTexts[version]) {
      setActive(version);
      setDisplayText(cachedTexts[version]!);
      onVersionChange?.(version, cachedTexts[version]!);
      return;
    }

    setLoading(true);
    try {
      const refQuery = reference.replace(/ /g, "+");
      const res = await fetch(
        `https://bible-api.com/${refQuery}?translation=${VERSION_API_MAP[version]}`
      );
      const data = await res.json();
      if (data.text) {
        const text = data.text.trim();
        setCachedTexts((prev) => ({ ...prev, [version]: text }));
        setActive(version);
        setDisplayText(text);
        onVersionChange?.(version, text);
      } else {
        // Fallback — version unavailable
        setActive(version);
        const fallback = `[${version} translation not available for this verse]`;
        setCachedTexts((prev) => ({ ...prev, [version]: fallback }));
        setDisplayText(fallback);
      }
    } catch {
      setActive(version);
      const fallback = `[Could not load ${version} translation]`;
      setDisplayText(fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
      {VERSIONS.map((v) => {
        const isActive = v === active;
        return (
          <button
            key={v}
            onClick={() => handlePillClick(v)}
            disabled={loading && v !== active}
            className={`font-serif-display text-[0.6rem] tracking-[0.08em] uppercase px-2 py-[3px] rounded-[4px] border transition-all duration-200 ${
              isActive
                ? "bg-gold text-[#0D0B08] border-gold"
                : "bg-[rgba(196,151,58,0.08)] text-[rgba(196,151,58,0.5)] border-[rgba(196,151,58,0.15)] hover:bg-[rgba(196,151,58,0.14)] hover:text-[rgba(196,151,58,0.7)]"
            } ${loading && !isActive ? "opacity-40 cursor-wait" : "cursor-pointer"}`}
          >
            {v}
          </button>
        );
      })}

      {switchedFromDefault && (
        <>
          <div className="w-px h-4 bg-[rgba(196,151,58,0.15)] mx-1" />
          <button
            onClick={() => {
              // TODO: persist to profile
            }}
            className="font-['EB_Garamond'] italic text-[0.65rem] text-[rgba(196,151,58,0.4)] hover:text-[rgba(196,151,58,0.7)] transition-colors whitespace-nowrap"
          >
            Set as my default →
          </button>
        </>
      )}
    </div>
  );
};

export { ScriptureVersionPills, type BibleVersion };
export default ScriptureVersionPills;
