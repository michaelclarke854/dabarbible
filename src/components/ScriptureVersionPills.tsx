import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VERSIONS = ["KJV", "WEB", "ASV", "BBE", "DRA", "YLT"] as const;
type BibleVersion = (typeof VERSIONS)[number];

const VERSION_API_MAP: Record<BibleVersion, string> = {
  KJV: "kjv",
  WEB: "web",
  ASV: "asv",
  BBE: "bbe",
  DRA: "dra",
  YLT: "ylt",
};

const VERSION_LABELS: Record<BibleVersion, { full: string; desc: string }> = {
  KJV: { full: "King James Version", desc: "The language of tradition" },
  WEB: { full: "World English Bible", desc: "Clear, modern, public domain" },
  ASV: { full: "American Standard Version", desc: "Closest to original languages" },
  BBE: { full: "Bible in Basic English", desc: "Warmth and clarity" },
  DRA: { full: "Douay-Rheims", desc: "Historic Catholic translation" },
  YLT: { full: "Young's Literal Translation", desc: "Every layer of meaning" },
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
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
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
  const [availableVersions, setAvailableVersions] = useState<BibleVersion[]>([profileDefault]);
  const [probed, setProbed] = useState(false);

  // Probe all versions on mount to discover which have data for this reference
  useEffect(() => {
    let cancelled = false;

    const probeAll = async () => {
      const results = await Promise.all(
        VERSIONS.map(async (v) => {
          if (v === profileDefault) return { version: v, text: initialText };
          const text = await fetchVerseText(reference, v);
          return { version: v, text };
        })
      );

      if (cancelled) return;

      const available: BibleVersion[] = [];
      const texts: Partial<Record<BibleVersion, string>> = {};

      for (const r of results) {
        if (r.text) {
          available.push(r.version);
          texts[r.version] = r.text;
        }
      }

      setAvailableVersions(available);
      setCachedTexts(texts);
      setProbed(true);
    };

    probeAll();
    return () => { cancelled = true; };
  }, [reference, profileDefault, initialText]);

  const switchedFromDefault = active !== profileDefault;

  const handlePillClick = async (version: BibleVersion) => {
    if (version === active || loading) return;

    if (cachedTexts[version]) {
      setActive(version);
      onVersionChange?.(version, cachedTexts[version]!);
      return;
    }

    // Shouldn't happen since we pre-probed, but handle gracefully
    setLoading(true);
    const text = await fetchVerseText(reference, version);
    if (text) {
      setCachedTexts((prev) => ({ ...prev, [version]: text }));
      setActive(version);
      onVersionChange?.(version, text);
    }
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

  // Don't render pills until probing is done, or if only one version available
  if (!probed || availableVersions.length <= 1) return null;

  return (
    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
      {availableVersions.map((v) => {
        const isActive = v === active;
        return (
          <button
            key={v}
            onClick={() => handlePillClick(v)}
            disabled={loading && v !== active}
            aria-label={`Show this verse in ${VERSION_LABELS[v].full}`}
            aria-pressed={isActive}
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
