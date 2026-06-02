import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatTimestamp, wasEdited } from "@/utils/formatTimestamp";
import { toast } from "sonner";
import ReflectionsSection from "./ReflectionsSection";
import UndoToast from "./UndoToast";
import { MoreVertical } from "lucide-react";
import { highlightMatch } from "@/utils/highlightMatch";
import { exportJournalToPdf } from "@/utils/exportJournalPdf";
import { Download } from "lucide-react";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface WisdomEntry {
  id: string;
  question: string;
  response: string;
  scripture_refs: string[];
  created_at: string;
  saved_to_journal: boolean;
  crisis_marker?: boolean;
}

type JournalTab = "voice" | "reflections";

const JOURNAL_SEARCH_STORAGE_KEY = "dabar.journal.search";

const JournalScreen = ({
  stirPrompt,
  onStirConsumed,
  isFreePlan = false,
  onUpgrade,
  onSignIn,
}: {
  stirPrompt?: string | null;
  onStirConsumed?: () => void;
  isFreePlan?: boolean;
  onUpgrade?: () => void;
  onSignIn?: () => void;
}) => {
  const { user } = useAuth();

  // Gate: guests see a sign-in prompt instead of the journal
  if (!user) {
    return (
      <div className="min-h-[calc(100vh-80px)] px-6 py-8 max-w-2xl mx-auto flex flex-col items-center justify-center text-center">
        <BookOpen size={32} className="text-gold/40 mb-4" />
        <h2 className="font-serif text-xl text-foreground tracking-wide mb-3">
          Your journal awaits
        </h2>
        <p className="font-body text-sm text-muted-foreground leading-relaxed max-w-xs mb-6">
          Sign in to save reflections, search your history, and return to the wisdom that speaks to you.
        </p>
        <button
          onClick={() => onSignIn?.()}
          className="font-body text-xs tracking-[0.15em] uppercase text-parchment bg-gold hover:bg-gold/90 transition-colors px-6 py-3 rounded-sm"
        >
          Sign In
        </button>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<JournalTab>(stirPrompt ? "reflections" : "voice");
  const [searchInput, setSearchInput] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(JOURNAL_SEARCH_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [search, setSearch] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return (window.localStorage.getItem(JOURNAL_SEARCH_STORAGE_KEY) ?? "").trim();
    } catch {
      return "";
    }
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [unsaveToast, setUnsaveToast] = useState<{ id: string } | null>(null);
  const [scriptureFilter, setScriptureFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Debounce search → applied filter, and persist to localStorage so the
  // last search term is restored when the user returns to the Journal.
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim();
      setSearch(trimmed);
      try {
        if (trimmed) {
          window.localStorage.setItem(JOURNAL_SEARCH_STORAGE_KEY, trimmed);
        } else {
          window.localStorage.removeItem(JOURNAL_SEARCH_STORAGE_KEY);
        }
      } catch {
        /* ignore quota / privacy-mode errors */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ["journal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wisdom_sessions")
        .select("*")
        .eq("saved_to_journal", true)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as WisdomEntry[];
    },
  });

  // Filter across question, response, and scripture refs (client-side so we
  // can match partial scripture references like "John" → "John 3:16").
  const filteredEntries = (() => {
    let result = entries;
    if (scriptureFilter) {
      const sf = scriptureFilter.toLowerCase();
      result = result.filter((e) =>
        Array.isArray(e.scripture_refs) &&
        e.scripture_refs.some((ref) => ref?.toLowerCase().includes(sf))
      );
    }
    const q = search.trim().toLowerCase();
    if (!q) return result;
    return result.filter((e) => {
      if (e.question?.toLowerCase().includes(q)) return true;
      if (e.response?.toLowerCase().includes(q)) return true;
      if (Array.isArray(e.scripture_refs)) {
        return e.scripture_refs.some((ref) => ref?.toLowerCase().includes(q));
      }
      return false;
    });
  })();

  // Extract unique scripture book names for filter chips
  const scriptureBooks = (() => {
    const bookCounts = new Map<string, number>();
    for (const e of entries) {
      if (!Array.isArray(e.scripture_refs)) continue;
      for (const ref of e.scripture_refs) {
        if (!ref) continue;
        const match = ref.match(/^(\d?\s*[A-Za-z]+)/);
        if (match) {
          const book = match[1].trim();
          bookCounts.set(book, (bookCounts.get(book) || 0) + 1);
        }
      }
    }
    return Array.from(bookCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([book, count]) => ({ book, count }));
  })();

  const latestPrompt = entries.length > 0
    ? entries[0].response.split("\n").find((l) => l.trim().endsWith("?"))?.trim()
    : undefined;

  const unsaveEntry = useCallback(async (entryId: string) => {
    setMenuOpenId(null);
    // Snapshot for rollback
    const previous = queryClient.getQueryData<WisdomEntry[]>(["journal"]);
    // Optimistic removal
    queryClient.setQueryData(["journal"], (old: WisdomEntry[] | undefined) =>
      (old || []).filter((e) => e.id !== entryId)
    );
    const { error } = await supabase
      .from("wisdom_sessions")
      .update({ saved_to_journal: false })
      .eq("id", entryId);
    if (error) {
      // Rollback
      if (previous) queryClient.setQueryData(["journal"], previous);
      toast.error("Couldn't remove from journal. Try again.");
      return;
    }
    setUnsaveToast({ id: entryId });
  }, [queryClient]);

  const undoUnsave = useCallback(async (entryId: string) => {
    const { error } = await supabase
      .from("wisdom_sessions")
      .update({ saved_to_journal: true })
      .eq("id", entryId);
    if (error) {
      toast.error("Couldn't restore entry. Try again.");
      return;
    }
    setUnsaveToast(null);
    queryClient.invalidateQueries({ queryKey: ["journal"] });
  }, [queryClient]);

  return (
    <div className="min-h-[calc(100vh-80px)] px-6 py-8 max-w-2xl mx-auto">
      <h2 className="font-serif text-2xl text-foreground tracking-wide mb-6">
        Journal
      </h2>

      {/* Segmented Control */}
      <div className="flex mb-8 border-b border-border">
        <button
          onClick={() => setActiveTab("voice")}
          className={`flex-1 pb-3 text-center font-body text-xs tracking-widest uppercase transition-all ${
            activeTab === "voice"
              ? "text-gold border-b-2 border-gold"
              : "text-muted-foreground"
          }`}
        >
          From The Voice
        </button>
        <button
          onClick={() => setActiveTab("reflections")}
          className={`flex-1 pb-3 text-center font-body text-xs tracking-widest uppercase transition-all ${
            activeTab === "reflections"
              ? "text-gold border-b-2 border-gold"
              : "text-muted-foreground"
          }`}
        >
          My Reflections
        </button>
      </div>

      {isFreePlan && (
        <div className="mb-8 rounded-sm border border-gold/30 bg-gold/5 p-6 text-center shadow-sm">
          <p className="font-serif-display text-[10px] tracking-[0.12em] text-gold/80 uppercase mb-3">
            Personal plan required
          </p>
          <h3 className="font-serif text-xl text-foreground mb-3">
            Your reflections deserve a home.
          </h3>
          <p className="font-body text-sm text-muted-foreground leading-relaxed mb-5 max-w-sm mx-auto">
            On the free plan, wisdom passes through but isn't kept. Upgrade to save what speaks to you and return to it any time.
          </p>
          <button
            onClick={() => onUpgrade?.()}
            className="font-body text-xs tracking-[0.15em] uppercase text-parchment bg-gold hover:bg-gold/90 transition-colors px-6 py-3 rounded-sm"
          >
            View Plans
          </button>
        </div>
      )}

      {activeTab === "reflections" ? (
        <ReflectionsSection latestPrompt={latestPrompt} stirPrompt={stirPrompt} onStirConsumed={onStirConsumed} />
      ) : (
        <>
          <div className="relative mb-8">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search saved wisdom by topic, word, or phrase…"
              className="w-full bg-[rgba(255,250,238,0.08)] border border-[rgba(255,250,238,0.25)] rounded-sm px-3 py-2 pr-7 text-sm font-body text-foreground placeholder:text-muted-foreground/50 outline-none focus:bg-[rgba(255,250,238,0.12)] focus:border-[rgba(232,184,75,0.6)] transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label="Clear search"
                className="absolute right-0 top-0 bottom-2 flex items-center text-muted-foreground/60 hover:text-foreground transition-colors text-lg leading-none px-1"
              >
                ×
              </button>
            )}
          </div>

          {/* Scripture reference filter chips */}
          {scriptureBooks.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-1.5 mb-2">
                <BookOpen size={11} className="text-gold/50" />
                <span className="font-body text-[10px] tracking-[0.1em] uppercase text-muted-foreground/60">
                  Filter by Scripture
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {scriptureFilter && (
                  <button
                    onClick={() => setScriptureFilter(null)}
                    className="font-body text-[11px] tracking-wide px-2.5 py-1 rounded-sm border border-gold/20 text-muted-foreground/60 hover:text-foreground transition-colors"
                  >
                    All
                  </button>
                )}
                {scriptureBooks.map(({ book, count }) => (
                  <button
                    key={book}
                    onClick={() => setScriptureFilter(scriptureFilter === book ? null : book)}
                    className={`font-body text-[11px] tracking-wide px-2.5 py-1 rounded-sm border transition-colors ${
                      scriptureFilter === book
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-border/50 text-muted-foreground/70 hover:border-gold/30 hover:text-foreground"
                    }`}
                  >
                    {book}
                    <span className="ml-1 text-[9px] opacity-50">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mb-6 min-h-[20px]">
            <p className="font-body text-xs text-muted-foreground/70">
              {search
                ? `${filteredEntries.length} match${filteredEntries.length === 1 ? "" : "es"} for "${search}"`
                : entries.length > 0
                ? `${entries.length} saved entr${entries.length === 1 ? "y" : "ies"}`
                : ""}
            </p>
            {!isLoading && !error && filteredEntries.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  try {
                    exportJournalToPdf({
                      entries: filteredEntries,
                      searchTerm: search || undefined,
                    });
                    toast.success("Journal exported as PDF.");
                  } catch (err) {
                    console.error("Journal PDF export failed:", err);
                    toast.error("Couldn't export PDF. Try again.");
                  }
                }}
                className="inline-flex items-center gap-1.5 font-body text-xs tracking-wide text-gold hover:text-gold/80 transition-colors"
                aria-label="Export journal to PDF"
              >
                <Download size={12} />
                Export PDF
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-3 h-3 rounded-full bg-gold animate-candle-glow" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="font-serif text-lg text-muted-foreground">Couldn't load journal.</p>
              <p className="font-body text-sm text-muted-foreground/60 mt-2">
                Check your connection and try again.
              </p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-serif text-lg text-muted-foreground">
                {search ? "No entries found." : "No saved wisdom yet."}
              </p>
              <p className="font-body text-sm text-muted-foreground/60 mt-2">
                Seek wisdom and save what speaks to you.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredEntries.map((entry) => {
                const q = search.trim().toLowerCase();
                const refMatched =
                  !!q &&
                  Array.isArray(entry.scripture_refs) &&
                  entry.scripture_refs.some((r) => r?.toLowerCase().includes(q));
                return (
                <article
                  key={entry.id}
                  className="pb-8 border-b border-border/50 last:border-none relative group"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                      <time className="font-serif-display text-[10px] tracking-[0.08em] text-gold/60 uppercase">
                        {formatTimestamp(entry.created_at)}
                      </time>
                      {entry.crisis_marker && (
                        <span
                          className="ml-2 inline-flex items-center gap-1 text-[9px] font-body uppercase tracking-wider"
                          style={{ color: "rgba(217,119,6,0.7)" }}
                          title="Asked during a crisis check-in"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          </svg>
                          Crisis
                        </span>
                      )}
                      <p className="font-body italic text-foreground/70 mt-3 mb-3 text-sm leading-relaxed">
                        "{highlightMatch(entry.question, search)}"
                      </p>
                    </div>
                    {/* Three-dot menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === entry.id ? null : entry.id);
                        }}
                        className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {menuOpenId === entry.id && (
                        <div className="absolute right-0 top-6 bg-card border border-border rounded-sm shadow-lg z-50 py-1 min-w-[180px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              unsaveEntry(entry.id);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary/50 transition-colors font-body"
                          >
                            Remove from journal
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className={`font-serif text-base leading-relaxed text-foreground whitespace-pre-line transition-all cursor-pointer ${
                      expandedId === entry.id ? "" : "line-clamp-4"
                    }`}
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    {highlightMatch(entry.response, search)}
                  </div>
                  {expandedId !== entry.id && (
                    <p className="text-xs font-body text-gold mt-2">Tap to read full response</p>
                  )}
                  {entry.scripture_refs?.length > 0 &&
                    (expandedId === entry.id || refMatched) && (
                    <div className="mt-4">
                      {entry.scripture_refs.map((ref, i) => (
                        <p key={i} className="text-gold font-serif text-xs tracking-wide">
                          — {highlightMatch(ref, search)}
                        </p>
                      ))}
                    </div>
                  )}
                </article>
                );
              })}
            </div>
          )}

          {unsaveToast && (
            <UndoToast
              message="Removed from journal"
              onUndo={() => undoUnsave(unsaveToast.id)}
              onExpire={() => setUnsaveToast(null)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default JournalScreen;
