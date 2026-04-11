import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VERSIONS = ["KJV", "NIV", "ESV", "AMP", "MSG", "NLT"] as const;
type BibleVersion = (typeof VERSIONS)[number];

const VERSION_API_MAP: Record<BibleVersion, string> = {
  KJV: "kjv",
  NIV: "niv",
  ESV: "esv",
  AMP: "amp",
  MSG: "msg",
  NLT: "nlt",
};

const VERSION_LABELS: Record<BibleVersion, { full: string; desc: string }> = {
  KJV: { full: "King James Version", desc: "The language of tradition" },
  NIV: { full: "New International Version", desc: "Clear and accessible" },
  ESV: { full: "English Standard Version", desc: "Closest to original languages" },
  AMP: { full: "Amplified Bible", desc: "Every layer of meaning" },
  MSG: { full: "The Message", desc: "Scripture with fresh ears" },
  NLT: { full: "New Living Translation", desc: "Warmth and clarity" },
};

interface ScriptureVersionPillsProps {
  profileDefault?: BibleVersion;
  reference: string;
  initialText: string;
  onVersionChange?: (version: BibleVersion, text: string) => void;
  userId?: string;
  onDefaultChanged?: (version: BibleVersion) => void;
}

async function fetchVerseText(reference: string, version: BibleVersion): Promise<string | null> {
  try {
    const refQuery = reference.replace(/ /g, "+");
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/bible-proxy?ref=${encodeURIComponent(refQuery)}&translation=${VERSION_API_MAP[version]}`
    );
    const data = await res.json();
    return data.text ? data.text.trim() : null;
  } catch {
    return null;
  }
}

const ScriptureVersionPills = ({
  profileDefault = "KJV",
  reference,
  initialText,
  onVersionChange,
  userId,
  onDefaultChanged,
}: ScriptureVersionPillsProps) => {
  const [active, setActive] = useState<BibleVersion>(profileDefault);
  const [loading, setLoading] = useState(false);
  const [cachedTexts, setCachedTexts] = useState<Partial<Record<BibleVersion, string>>>({
    [profileDefault]: initialText,
  });

  const switchedFromDefault = active !== profileDefault;

  const handlePillClick = async (version: BibleVersion) => {
    if (version === active || loading) return;

    if (cachedTexts[version]) {
      setActive(version);
      onVersionChange?.(version, cachedTexts[version]!);
      return;
    }

    setLoading(true);
    const text = await fetchVerseText(reference, version);
    const result = text || `[${version} translation not available for this verse]`;
    setCachedTexts((prev) => ({ ...prev, [version]: result }));
    setActive(version);
    onVersionChange?.(version, result);
    setLoading(false);
  };

  const setAsDefault = async () => {
    if (!userId) return;
    await supabase
      .from("profiles")
      .update({ preferred_bible_version: active } as any)
      .eq("user_id", userId);
    toast.success(`${active} is now your default translation.`);
    onDefaultChanged?.(active);
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
            onClick={setAsDefault}
            className="font-['EB_Garamond'] italic text-[0.65rem] text-[rgba(196,151,58,0.4)] hover:text-[rgba(196,151,58,0.7)] transition-colors whitespace-nowrap"
          >
            Set as my default →
          </button>
        </>
      )}
    </div>
  );
};

export { ScriptureVersionPills, VERSIONS, VERSION_API_MAP, VERSION_LABELS, fetchVerseText };
export type { BibleVersion };
export default ScriptureVersionPills;
