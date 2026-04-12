import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, ChevronRight } from "lucide-react";
import { kjvBooks, type BibleBook } from "@/data/kjvBooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import ScriptureVersionPills, {
  VERSIONS,
  VERSION_API_MAP,
  type BibleVersion,
} from "./ScriptureVersionPills";
import ChapterVersionSheet from "./ChapterVersionSheet";
import { formatTimestamp } from "@/utils/formatTimestamp";

interface ScriptureScreenProps {
  user: User | null;
  deepLink?: { book: string; chapter: number; verse: number; version?: BibleVersion } | null;
  onDeepLinkConsumed?: () => void;
  onViewResponse?: (sessionId: string) => void;
  profileVersion?: BibleVersion;
  onProfileVersionChanged?: (v: BibleVersion) => void;
}

interface VerseData {
  verse: number;
  text: string;
}

interface SavedVerse {
  id: string;
  book: string;
  chapter: number;
  verse_number: number;
  verse_text: string;
  version: string;
  session_id: string | null;
  created_at: string;
}

interface AnnotationData {
  id: string;
  note: string;
  saved_verse_id: string;
  created_at: string;
  updated_at: string;
}

type View = "books" | "chapters" | "verses" | "saved";

const ScriptureScreen = ({
  user,
  deepLink,
  onDeepLinkConsumed,
  onViewResponse,
  profileVersion = "KJV",
  onProfileVersionChanged,
}: ScriptureScreenProps) => {
  const [view, setView] = useState<View>("books");
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [verses, setVerses] = useState<VerseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightVerse, setHighlightVerse] = useState<number | null>(null);
  const [savedVerses, setSavedVerses] = useState<SavedVerse[]>([]);
  const [savedVerseKeys, setSavedVerseKeys] = useState<Set<string>>(new Set());
  const [savingVerse, setSavingVerse] = useState<string | null>(null);
  const verseRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Version state
  const [chapterVersion, setChapterVersion] = useState<BibleVersion>(profileVersion);
  const [expandedVerse, setExpandedVerse] = useState<number | null>(null);
  const [verseVersionCache, setVerseVersionCache] = useState<Record<number, Record<string, string>>>({});
  const [verseActiveVersion, setVerseActiveVersion] = useState<Record<number, BibleVersion>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [availableChapterVersions, setAvailableChapterVersions] = useState<BibleVersion[]>(VERSIONS.slice() as BibleVersion[]);

  // Annotations
  const [annotations, setAnnotations] = useState<Record<string, AnnotationData>>({});

  // Saved verse version display state
  const [savedVerseExpandedId, setSavedVerseExpandedId] = useState<string | null>(null);

  // Session version — persists across chapter navigation within same tab session
  const [sessionVersion, setSessionVersion] = useState<BibleVersion | null>(null);

  const activeChapterVersion = sessionVersion || chapterVersion;

  // Chapter cache — instant same-session navigation
  const chapterCacheRef = useRef<Record<string, VerseData[]>>({});

  // Fetch saved verses
  const fetchSavedVerses = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_verses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setSavedVerses(data as SavedVerse[]);
      setSavedVerseKeys(new Set(data.map((v: SavedVerse) => `${v.book}-${v.chapter}-${v.verse_number}`)));
    }
  }, [user]);

  // Fetch annotations for saved verses
  const fetchAnnotations = useCallback(async () => {
    if (!user || savedVerses.length === 0) return;
    const ids = savedVerses.map((sv) => sv.id);
    const { data } = await supabase
      .from("verse_annotations")
      .select("*")
      .in("saved_verse_id", ids)
      .eq("user_id", user.id);
    if (data) {
      const map: Record<string, AnnotationData> = {};
      data.forEach((a: any) => { map[a.saved_verse_id] = a; });
      setAnnotations(map);
    }
  }, [user, savedVerses]);

  useEffect(() => { fetchSavedVerses(); }, [fetchSavedVerses]);
  useEffect(() => { fetchAnnotations(); }, [fetchAnnotations]);

  // Handle deep link
  useEffect(() => {
    if (!deepLink) return;
    const book = kjvBooks.find((b) => b.name === deepLink.book);
    if (book) {
      setSelectedBook(book);
      setSelectedChapter(deepLink.chapter);
      setHighlightVerse(deepLink.verse);
      if (deepLink.version) {
        setSessionVersion(deepLink.version);
        setChapterVersion(deepLink.version);
      }
      setView("verses");
      onDeepLinkConsumed?.();
    }
  }, [deepLink, onDeepLinkConsumed]);

  // Fetch chapter verses
  const fetchChapter = useCallback(
    async (book: BibleBook, chapter: number, version: BibleVersion) => {
      const cacheKey = `${book.name}-${chapter}-${version}`;
      const cached = chapterCacheRef.current[cacheKey];
      if (cached) {
        setVerses(cached);
        setChapterLoading(false);
        setLoading(false);
        return;
      }

      setChapterLoading(true);
      setVerses([]);
      const bookQuery = book.name.replace(/ /g, "+");
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      try {
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/bible-proxy?ref=${encodeURIComponent(bookQuery + "+" + chapter)}&translation=${VERSION_API_MAP[version]}`
        );
        const data = await res.json();
        if (data.verses) {
          const parsed = data.verses.map((v: any) => ({ verse: v.verse, text: v.text.trim() }));
          chapterCacheRef.current[cacheKey] = parsed;
          setVerses(parsed);

          // Probe which other versions have data for this book (check verse 1)
          const probeRef = `${bookQuery}+${chapter}:1`;
          const probeResults = await Promise.allSettled(
            VERSIONS.map(async (ver) => {
              if (ver === version) return { ver, ok: true };
              const r = await fetch(
                `https://${projectId}.supabase.co/functions/v1/bible-proxy?ref=${encodeURIComponent(probeRef)}&translation=${VERSION_API_MAP[ver]}`
              );
              const d = await r.json();
              return { ver, ok: !!d.text?.trim() };
            })
          );
          const available = probeResults
            .filter((r) => r.status === "fulfilled" && r.value.ok)
            .map((r) => (r as PromiseFulfilledResult<{ ver: BibleVersion; ok: boolean }>).value.ver);
          setAvailableChapterVersions(available.length > 0 ? available : [version]);
        } else {
          toast.error("Could not load chapter.");
        }
      } catch {
        toast.error("Could not load chapter.");
      } finally {
        setChapterLoading(false);
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedBook || !selectedChapter) return;
    setLoading(true);
    setExpandedVerse(null);
    setVerseVersionCache({});
    setVerseActiveVersion({});
    fetchChapter(selectedBook, selectedChapter, activeChapterVersion);
  }, [selectedBook, selectedChapter, activeChapterVersion, fetchChapter]);

  // Scroll to highlighted verse
  useEffect(() => {
    if (highlightVerse && verses.length > 0 && verseRefs.current[highlightVerse]) {
      setTimeout(() => {
        verseRefs.current[highlightVerse]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [highlightVerse, verses]);

  // Preload all versions for a verse on expand
  const preloadVerseVersions = async (verseNum: number) => {
    if (!selectedBook || !selectedChapter) return;
    if (verseVersionCache[verseNum] && Object.keys(verseVersionCache[verseNum]).length >= 6) return;

    const bookQuery = selectedBook.name.replace(/ /g, "+");
    const ref = `${bookQuery}+${selectedChapter}:${verseNum}`;

    const current = verses.find((v) => v.verse === verseNum);
    const cache: Record<string, string> = {
      [activeChapterVersion]: current?.text || "",
    };

    // Fetch other versions in parallel — only cache versions that return data
    const others = VERSIONS.filter((v) => v !== activeChapterVersion);
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const results = await Promise.allSettled(
      others.map(async (ver) => {
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/bible-proxy?ref=${encodeURIComponent(ref)}&translation=${VERSION_API_MAP[ver]}`);
        const data = await res.json();
        const text = data.text?.trim();
        return { ver, text: text || null };
      })
    );

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.text) {
        cache[r.value.ver] = r.value.text;
      }
    });

    setVerseVersionCache((prev) => ({ ...prev, [verseNum]: cache }));
  };

  const handleVerseClick = (verseNum: number) => {
    if (expandedVerse === verseNum) {
      setExpandedVerse(null);
    } else {
      setExpandedVerse(verseNum);
      preloadVerseVersions(verseNum);
    }
  };

  const handleChapterVersionSwitch = (version: BibleVersion) => {
    setChapterVersion(version);
    setSessionVersion(version);
  };

  const setAsProfileDefault = async (version: BibleVersion) => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ preferred_bible_version: version } as any)
      .eq("user_id", user.id);
    toast.success(`${version} is now your default translation.`);
    onProfileVersionChanged?.(version);
  };

  const toggleSaveVerse = async (verseData: VerseData) => {
    if (!user) {
      toast("Sign in to save verses.");
      return;
    }
    if (!selectedBook || !selectedChapter) return;

    const key = `${selectedBook.name}-${selectedChapter}-${verseData.verse}`;
    setSavingVerse(key);

    if (savedVerseKeys.has(key)) {
      const existing = savedVerses.find(
        (v) => v.book === selectedBook.name && v.chapter === selectedChapter && v.verse_number === verseData.verse
      );
      if (existing) {
        await supabase.from("saved_verses").delete().eq("id", existing.id);
        toast.success("Verse removed.");
      }
    } else {
      // Save with the currently active version for this verse
      const verseVersion = verseActiveVersion[verseData.verse] || activeChapterVersion;
      const verseText =
        verseVersionCache[verseData.verse]?.[verseVersion] || verseData.text;

      await supabase.from("saved_verses").insert({
        user_id: user.id,
        book: selectedBook.name,
        chapter: selectedChapter,
        verse_number: verseData.verse,
        verse_text: verseText,
        version: verseVersion,
      } as any);
      toast.success("Verse saved.");
    }

    await fetchSavedVerses();
    setSavingVerse(null);
  };

  const otBooks = kjvBooks.filter((b) => b.testament === "OT");
  const ntBooks = kjvBooks.filter((b) => b.testament === "NT");

  // BOOKS VIEW
  if (view === "books") {
    return (
      <div className="min-h-[calc(100vh-80px)] px-6 py-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-2xl text-foreground tracking-wide">Scripture</h1>
          {user && (
            <button
              onClick={() => setView("saved")}
              className="font-body text-xs tracking-wider uppercase text-gold hover:text-gold-dark transition-colors"
            >
              Saved Verses
            </button>
          )}
        </div>

        <div className="mb-8">
          <h2 className="font-serif text-sm tracking-[0.2em] uppercase text-gold mb-4">Old Testament</h2>
          <div className="grid grid-cols-2 gap-1">
            {otBooks.map((book) => (
              <button
                key={book.name}
                onClick={() => { setSelectedBook(book); setView("chapters"); }}
                className="text-left py-2.5 px-3 font-body text-sm text-foreground hover:text-gold hover:bg-gold/5 rounded-sm transition-colors flex items-center justify-between group"
              >
                <span>{book.name}</span>
                <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-gold transition-colors" />
              </button>
            ))}
          </div>
        </div>

        <div className="w-12 h-px bg-gold/30 mx-auto mb-8" />

        <div>
          <h2 className="font-serif text-sm tracking-[0.2em] uppercase text-gold mb-4">New Testament</h2>
          <div className="grid grid-cols-2 gap-1">
            {ntBooks.map((book) => (
              <button
                key={book.name}
                onClick={() => { setSelectedBook(book); setView("chapters"); }}
                className="text-left py-2.5 px-3 font-body text-sm text-foreground hover:text-gold hover:bg-gold/5 rounded-sm transition-colors flex items-center justify-between group"
              >
                <span>{book.name}</span>
                <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-gold transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // CHAPTERS VIEW
  if (view === "chapters" && selectedBook) {
    const chapters = Array.from({ length: selectedBook.chapters }, (_, i) => i + 1);
    return (
      <div className="min-h-[calc(100vh-80px)] px-6 py-8 max-w-2xl mx-auto">
        <button
          onClick={() => { setView("books"); setSelectedBook(null); }}
          className="flex items-center gap-2 text-muted-foreground hover:text-gold transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          <span className="font-body text-xs tracking-wider uppercase">Books</span>
        </button>

        <h1 className="font-serif text-2xl text-foreground tracking-wide mb-6">{selectedBook.name}</h1>

        <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
          {chapters.map((ch) => (
            <button
              key={ch}
              onClick={() => { setSelectedChapter(ch); setHighlightVerse(null); setView("verses"); }}
              className="aspect-square flex items-center justify-center font-serif text-sm text-foreground border border-border/50 rounded-sm hover:border-gold hover:text-gold transition-colors"
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // SAVED VERSES VIEW
  if (view === "saved") {
    return (
      <div className="min-h-[calc(100vh-80px)] px-6 py-8 max-w-2xl mx-auto">
        <button
          onClick={() => setView("books")}
          className="flex items-center gap-2 text-muted-foreground hover:text-gold transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          <span className="font-body text-xs tracking-wider uppercase">Scripture</span>
        </button>

        <h1 className="font-serif text-2xl text-foreground tracking-wide mb-6">Saved Verses</h1>

        {savedVerses.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground italic">
            No saved verses yet. Long-press any verse to save it.
          </p>
        ) : (
          <div className="space-y-5">
            {savedVerses.map((sv) => {
              const annotation = annotations[sv.id];
              const isExpanded = savedVerseExpandedId === sv.id;
              const verVersion = (sv.version || "KJV") as BibleVersion;

              return (
                <div key={sv.id} className="pl-4 border-l-2 border-gold/40 py-2">
                  <button
                    onClick={() => setSavedVerseExpandedId(isExpanded ? null : sv.id)}
                    className="w-full text-left"
                  >
                    <p className="font-['Playfair_Display'] italic text-base leading-relaxed text-foreground/90">
                      "{sv.verse_text}"
                    </p>
                    <p className="font-serif text-sm text-gold tracking-wide mt-1">
                      — {sv.book} {sv.chapter}:{sv.verse_number} · <span className="text-xs">{verVersion}</span>
                    </p>
                  </button>

                  <p className="font-body text-[10px] text-muted-foreground mt-1">
                    Saved {formatTimestamp(sv.created_at)}
                  </p>

                  {/* Annotation */}
                  {annotation && (
                    <div className="mt-3 pl-3 border-l border-gold/20">
                      <p className="font-body text-sm text-foreground/80">{annotation.note}</p>
                      <p className="font-body text-[10px] text-muted-foreground mt-1">
                        Noted {formatTimestamp(annotation.created_at)}
                      </p>
                      {verVersion !== profileVersion && (
                        <p className="font-['EB_Garamond'] italic text-[9px] text-gold/40 mt-0.5">
                          Note written in {verVersion}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Version pills on saved verse */}
                  {isExpanded && (
                    <ScriptureVersionPills
                      profileDefault={profileVersion}
                      reference={`${sv.book} ${sv.chapter}:${sv.verse_number}`}
                      initialText={sv.verse_text}
                      userId={user?.id}
                      onDefaultChanged={onProfileVersionChanged}
                    />
                  )}

                  {sv.session_id && onViewResponse && (
                    <button
                      onClick={() => onViewResponse(sv.session_id!)}
                      className="font-body text-xs text-gold/80 hover:text-gold mt-1 transition-colors"
                    >
                      Read the full response →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // VERSES VIEW
  return (
    <div
      className="min-h-[calc(100vh-80px)] px-6 py-8 max-w-2xl mx-auto"
      onClick={(e) => {
        // Collapse expanded verse when clicking empty space
        if ((e.target as HTMLElement).closest("[data-verse]")) return;
        setExpandedVerse(null);
      }}
    >
      {/* Header with back, title, version pill */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => { setView("chapters"); setSelectedChapter(null); setHighlightVerse(null); setExpandedVerse(null); }}
          className="flex items-center gap-2 text-muted-foreground hover:text-gold transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="font-body text-xs tracking-wider uppercase">{selectedBook?.name}</span>
        </button>

        {/* Version pill in header */}
        <button
          onClick={() => setSheetOpen(true)}
          className="font-serif text-[11px] tracking-wider uppercase px-2.5 py-1 rounded border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
        >
          {activeChapterVersion}
        </button>
      </div>

      <h1 className="font-serif text-2xl text-gold tracking-wide mb-2 text-center">
        {selectedBook?.name} {selectedChapter}
      </h1>
      <div className="w-8 h-px bg-gold mx-auto mb-6" />

      {loading || chapterLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-1 transition-opacity duration-300">
          {verses.map((v) => {
            const key = selectedBook ? `${selectedBook.name}-${selectedChapter}-${v.verse}` : "";
            const isSaved = savedVerseKeys.has(key);
            const isHighlighted = highlightVerse === v.verse;
            const isExpanded = expandedVerse === v.verse;
            const currentVerseVersion = verseActiveVersion[v.verse] || activeChapterVersion;
            const displayText =
              isExpanded && verseVersionCache[v.verse]?.[currentVerseVersion]
                ? verseVersionCache[v.verse][currentVerseVersion]
                : v.text;

            return (
              <div
                key={v.verse}
                data-verse={v.verse}
                ref={(el) => { verseRefs.current[v.verse] = el; }}
                className={`group py-2 px-3 rounded-sm transition-all duration-200 ${
                  isHighlighted ? "bg-gold/10 border-l-4 border-gold" : "border-l-4 border-transparent"
                } ${isExpanded ? "bg-gold/5 py-3" : ""}`}
              >
                <div
                  className="flex gap-3 cursor-pointer"
                  onClick={() => handleVerseClick(v.verse)}
                >
                  <span className="font-serif text-[11px] text-gold/70 pt-1 select-none min-w-[1.5rem] text-right">
                    {v.verse}
                  </span>
                  <p className="font-['Playfair_Display'] text-lg leading-relaxed text-foreground flex-1">
                    {displayText}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSaveVerse(v); }}
                    className={`pt-1 transition-colors ${
                      isSaved ? "text-gold" : "text-transparent group-hover:text-muted-foreground/40"
                    }`}
                    disabled={savingVerse === key}
                    title={isSaved ? "Remove saved verse" : "Save verse"}
                  >
                    {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                  </button>
                </div>

                {/* Version pills for expanded verse */}
                {isExpanded && (
                  <div className="ml-8 mt-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {VERSIONS.filter((ver) => !!verseVersionCache[v.verse]?.[ver] || ver === currentVerseVersion).map((ver) => {
                        const isActive = ver === currentVerseVersion;
                        return (
                          <button
                            key={ver}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (ver === currentVerseVersion) return;
                              setVerseActiveVersion((prev) => ({ ...prev, [v.verse]: ver }));
                            }}
                            className={`font-serif-display text-[0.6rem] tracking-[0.08em] uppercase px-2 py-[3px] rounded-[4px] border transition-all duration-200 ${
                              isActive
                                ? "bg-gold text-[#0D0B08] border-gold"
                                : "bg-[rgba(196,151,58,0.08)] text-[rgba(196,151,58,0.5)] border-[rgba(196,151,58,0.15)] hover:bg-[rgba(196,151,58,0.14)] hover:text-[rgba(196,151,58,0.7)] cursor-pointer"
                            }`}
                          >
                            {ver}
                          </button>
                        );
                      })}
                      {currentVerseVersion !== profileVersion && (
                        <>
                          <div className="w-px h-4 bg-[rgba(196,151,58,0.15)] mx-1" />
                          <button
                            onClick={(e) => { e.stopPropagation(); setAsProfileDefault(currentVerseVersion); }}
                            className="font-['EB_Garamond'] italic text-[0.65rem] text-[rgba(196,151,58,0.4)] hover:text-[rgba(196,151,58,0.7)] transition-colors whitespace-nowrap"
                          >
                            Set as my default →
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Chapter version bottom sheet */}
      <ChapterVersionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        activeVersion={activeChapterVersion}
        profileDefault={profileVersion}
        bookName={selectedBook?.name || ""}
        chapter={selectedChapter || 0}
        onSelectVersion={handleChapterVersionSwitch}
        onSetDefault={() => setAsProfileDefault(activeChapterVersion)}
        availableVersions={availableChapterVersions}
      />
    </div>
  );
};

export default ScriptureScreen;
