import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, ChevronRight } from "lucide-react";
import { kjvBooks, type BibleBook } from "@/data/kjvBooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ScriptureScreenProps {
  user: User | null;
  deepLink?: { book: string; chapter: number; verse: number } | null;
  onDeepLinkConsumed?: () => void;
  onViewResponse?: (sessionId: string) => void;
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
  session_id: string | null;
  created_at: string;
}

type View = "books" | "chapters" | "verses" | "saved";

const ScriptureScreen = ({ user, deepLink, onDeepLinkConsumed, onViewResponse }: ScriptureScreenProps) => {
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

  useEffect(() => {
    fetchSavedVerses();
  }, [fetchSavedVerses]);

  // Handle deep link
  useEffect(() => {
    if (!deepLink) return;
    const book = kjvBooks.find(b => b.name === deepLink.book);
    if (book) {
      setSelectedBook(book);
      setSelectedChapter(deepLink.chapter);
      setHighlightVerse(deepLink.verse);
      setView("verses");
      onDeepLinkConsumed?.();
    }
  }, [deepLink, onDeepLinkConsumed]);

  // Fetch chapter verses from API
  useEffect(() => {
    if (!selectedBook || !selectedChapter) return;
    setLoading(true);
    setVerses([]);

    const bookQuery = selectedBook.name.replace(/ /g, "+");
    fetch(`https://bible-api.com/${bookQuery}+${selectedChapter}?translation=kjv`)
      .then(res => res.json())
      .then(data => {
        if (data.verses) {
          setVerses(data.verses.map((v: any) => ({ verse: v.verse, text: v.text.trim() })));
        } else {
          toast.error("Could not load chapter.");
        }
      })
      .catch(() => toast.error("Could not load chapter."))
      .finally(() => setLoading(false));
  }, [selectedBook, selectedChapter]);

  // Scroll to highlighted verse
  useEffect(() => {
    if (highlightVerse && verses.length > 0 && verseRefs.current[highlightVerse]) {
      setTimeout(() => {
        verseRefs.current[highlightVerse]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [highlightVerse, verses]);

  const toggleSaveVerse = async (verseData: VerseData) => {
    if (!user) {
      toast("Sign in to save verses.");
      return;
    }
    if (!selectedBook || !selectedChapter) return;

    const key = `${selectedBook.name}-${selectedChapter}-${verseData.verse}`;
    setSavingVerse(key);

    if (savedVerseKeys.has(key)) {
      // Remove
      const existing = savedVerses.find(
        v => v.book === selectedBook.name && v.chapter === selectedChapter && v.verse_number === verseData.verse
      );
      if (existing) {
        await supabase.from("saved_verses").delete().eq("id", existing.id);
        toast.success("Verse removed.");
      }
    } else {
      // Save
      await supabase.from("saved_verses").insert({
        user_id: user.id,
        book: selectedBook.name,
        chapter: selectedChapter,
        verse_number: verseData.verse,
        verse_text: verseData.text,
      });
      toast.success("Verse saved.");
    }

    await fetchSavedVerses();
    setSavingVerse(null);
  };

  const otBooks = kjvBooks.filter(b => b.testament === "OT");
  const ntBooks = kjvBooks.filter(b => b.testament === "NT");

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
            {otBooks.map(book => (
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
            {ntBooks.map(book => (
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
          {chapters.map(ch => (
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
          <div className="space-y-4">
            {savedVerses.map(sv => (
              <div key={sv.id} className="pl-4 border-l-2 border-gold/40 py-2">
                <p className="font-['Playfair_Display'] italic text-base leading-relaxed text-foreground/90">
                  "{sv.verse_text}"
                </p>
                <p className="font-serif text-sm text-gold tracking-wide mt-1">
                  — {sv.book} {sv.chapter}:{sv.verse_number}
                </p>
                <p className="font-body text-[10px] text-muted-foreground mt-1">
                  Saved {new Date(sv.created_at).toLocaleDateString()}
                </p>
                {sv.session_id && onViewResponse && (
                  <button
                    onClick={() => onViewResponse(sv.session_id!)}
                    className="font-body text-xs text-gold/80 hover:text-gold mt-1 transition-colors"
                  >
                    Read the full response →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // VERSES VIEW
  return (
    <div className="min-h-[calc(100vh-80px)] px-6 py-8 max-w-2xl mx-auto">
      <button
        onClick={() => { setView("chapters"); setSelectedChapter(null); setHighlightVerse(null); }}
        className="flex items-center gap-2 text-muted-foreground hover:text-gold transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        <span className="font-body text-xs tracking-wider uppercase">{selectedBook?.name}</span>
      </button>

      <h1 className="font-serif text-2xl text-foreground tracking-wide mb-2">
        {selectedBook?.name} {selectedChapter}
      </h1>
      <div className="w-8 h-px bg-gold mb-6" />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-1">
          {verses.map(v => {
            const key = selectedBook ? `${selectedBook.name}-${selectedChapter}-${v.verse}` : "";
            const isSaved = savedVerseKeys.has(key);
            const isHighlighted = highlightVerse === v.verse;

            return (
              <div
                key={v.verse}
                ref={el => { verseRefs.current[v.verse] = el; }}
                className={`group flex gap-3 py-2 px-3 rounded-sm transition-colors ${
                  isHighlighted ? "bg-gold/10 border-l-4 border-gold" : "border-l-4 border-transparent"
                }`}
              >
                <span className="font-serif text-[11px] text-gold/70 pt-1 select-none min-w-[1.5rem] text-right">
                  {v.verse}
                </span>
                <p className="font-['Playfair_Display'] text-lg leading-relaxed text-foreground flex-1">
                  {v.text}
                </p>
                <button
                  onClick={() => toggleSaveVerse(v)}
                  className={`pt-1 transition-colors ${
                    isSaved ? "text-gold" : "text-transparent group-hover:text-muted-foreground/40"
                  }`}
                  disabled={savingVerse === key}
                  title={isSaved ? "Remove saved verse" : "Save verse"}
                >
                  {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ScriptureScreen;
