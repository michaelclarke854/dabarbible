import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { VERSIONS, VERSION_LABELS, type BibleVersion } from "./ScriptureVersionPills";

interface ChapterVersionSheetProps {
  open: boolean;
  onClose: () => void;
  activeVersion: BibleVersion;
  profileDefault: BibleVersion;
  bookName: string;
  chapter: number;
  onSelectVersion: (v: BibleVersion) => void;
  onSetDefault: () => void;
  availableVersions?: BibleVersion[];
}

const ChapterVersionSheet = ({
  open,
  onClose,
  activeVersion,
  profileDefault,
  bookName,
  chapter,
  onSelectVersion,
  onSetDefault,
  availableVersions,
}: ChapterVersionSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const versionsToShow = availableVersions || (VERSIONS.slice() as BibleVersion[]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-background border-t border-gold/20 rounded-t-2xl px-6 pt-4 pb-8 animate-slide-up"
        style={{ animation: "slideUp 0.3s ease-out" }}
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex items-center justify-between mb-1">
          <h3 className="font-serif text-base text-foreground tracking-wide">Switch chapter translation</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="font-['Playfair_Display'] italic text-sm text-muted-foreground mb-5">
          {bookName} {chapter}
        </p>

        <div className="space-y-1">
          {versionsToShow.map((v) => {
            const isActive = v === activeVersion;
            const label = VERSION_LABELS[v];
            return (
              <button
                key={v}
                onClick={() => { onSelectVersion(v); onClose(); }}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors ${
                  isActive ? "bg-gold/10 border border-gold/30" : "hover:bg-muted/50"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-sm font-semibold text-foreground">{v}</span>
                    <span className="font-body text-xs text-muted-foreground">{label.full}</span>
                  </div>
                  <p className="font-body text-[11px] text-muted-foreground/60 mt-0.5">{label.desc}</p>
                </div>
                {isActive && <Check size={16} className="text-gold flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {activeVersion !== profileDefault && (
          <button
            onClick={() => { onSetDefault(); onClose(); }}
            className="mt-4 font-['EB_Garamond'] italic text-sm text-[rgba(196,151,58,0.5)] hover:text-gold transition-colors"
          >
            Set as my default translation →
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ChapterVersionSheet;
