// Canonical scripture reference parser for DABAR.
// Hardened for Android WebView closed-test usage.
// Never throws — always returns a structured ScriptureParseResult.

export type ParseState =
  | "valid"
  | "ambiguous"
  | "missingChapter"
  | "invalid"
  | "empty";

export interface ScriptureParseResult {
  state: ParseState;
  bookId?: string;
  bookName?: string;
  chapter?: number;
  verse?: number;
  suggestions?: string[];
  maxChapters?: number;
  normalizedInput?: string;
  fuzzyMatch?: string;
}

interface CanonicalBook {
  id: string;          // e.g. '1PE'
  name: string;        // e.g. '1 Peter'
  chapters: number;
  singleChapter?: boolean;
  aliases: string[];   // lowercase alt names / abbreviations
}

// Canonical 66-book Protestant Bible.
// Aliases are lowercase; the parser normalizes input before comparing.
const BOOKS: CanonicalBook[] = [
  // ---- Old Testament ----
  { id: "GEN", name: "Genesis", chapters: 50, aliases: ["gen", "ge", "gn"] },
  { id: "EXO", name: "Exodus", chapters: 40, aliases: ["exo", "ex", "exod"] },
  { id: "LEV", name: "Leviticus", chapters: 27, aliases: ["lev", "lv"] },
  { id: "NUM", name: "Numbers", chapters: 36, aliases: ["num", "nm", "nb"] },
  { id: "DEU", name: "Deuteronomy", chapters: 34, aliases: ["deu", "dt", "deut"] },
  { id: "JOS", name: "Joshua", chapters: 24, aliases: ["jos", "josh", "jsh"] },
  { id: "JDG", name: "Judges", chapters: 21, aliases: ["jdg", "judg", "jg"] },
  { id: "RUT", name: "Ruth", chapters: 4, aliases: ["rut", "ru"] },
  { id: "1SA", name: "1 Samuel", chapters: 31, aliases: ["1 sam", "1sam", "1 sa", "1sa", "i samuel", "first samuel"] },
  { id: "2SA", name: "2 Samuel", chapters: 24, aliases: ["2 sam", "2sam", "2 sa", "2sa", "ii samuel", "second samuel"] },
  { id: "1KI", name: "1 Kings", chapters: 22, aliases: ["1 kgs", "1kgs", "1 ki", "1ki", "i kings", "first kings"] },
  { id: "2KI", name: "2 Kings", chapters: 25, aliases: ["2 kgs", "2kgs", "2 ki", "2ki", "ii kings", "second kings"] },
  { id: "1CH", name: "1 Chronicles", chapters: 29, aliases: ["1 chr", "1chr", "1 ch", "1ch", "i chronicles", "first chronicles"] },
  { id: "2CH", name: "2 Chronicles", chapters: 36, aliases: ["2 chr", "2chr", "2 ch", "2ch", "ii chronicles", "second chronicles"] },
  { id: "EZR", name: "Ezra", chapters: 10, aliases: ["ezr"] },
  { id: "NEH", name: "Nehemiah", chapters: 13, aliases: ["neh", "ne"] },
  { id: "EST", name: "Esther", chapters: 10, aliases: ["est", "esth"] },
  { id: "JOB", name: "Job", chapters: 42, aliases: ["jb"] },
  { id: "PSA", name: "Psalms", chapters: 150, aliases: ["psa", "ps", "psalm", "pss"] },
  { id: "PRO", name: "Proverbs", chapters: 31, aliases: ["pro", "prov", "pr", "prv"] },
  { id: "ECC", name: "Ecclesiastes", chapters: 12, aliases: ["ecc", "eccl", "ec", "qoh"] },
  { id: "SNG", name: "Song of Solomon", chapters: 8, aliases: ["sng", "song", "sos", "song of songs", "canticles"] },
  { id: "ISA", name: "Isaiah", chapters: 66, aliases: ["isa", "is"] },
  { id: "JER", name: "Jeremiah", chapters: 52, aliases: ["jer", "je"] },
  { id: "LAM", name: "Lamentations", chapters: 5, aliases: ["lam", "la"] },
  { id: "EZK", name: "Ezekiel", chapters: 48, aliases: ["ezk", "ezek", "eze"] },
  { id: "DAN", name: "Daniel", chapters: 12, aliases: ["dan", "da", "dn"] },
  { id: "HOS", name: "Hosea", chapters: 14, aliases: ["hos", "ho"] },
  { id: "JOL", name: "Joel", chapters: 3, aliases: ["jol", "joe", "jl"] },
  { id: "AMO", name: "Amos", chapters: 9, aliases: ["amo", "am"] },
  { id: "OBA", name: "Obadiah", chapters: 1, singleChapter: true, aliases: ["oba", "ob", "obad"] },
  { id: "JON", name: "Jonah", chapters: 4, aliases: ["jon", "jnh"] },
  { id: "MIC", name: "Micah", chapters: 7, aliases: ["mic", "mi"] },
  { id: "NAH", name: "Nahum", chapters: 3, aliases: ["nah", "na"] },
  { id: "HAB", name: "Habakkuk", chapters: 3, aliases: ["hab", "hb"] },
  { id: "ZEP", name: "Zephaniah", chapters: 3, aliases: ["zep", "zeph", "zp"] },
  { id: "HAG", name: "Haggai", chapters: 2, aliases: ["hag", "hg"] },
  { id: "ZEC", name: "Zechariah", chapters: 14, aliases: ["zec", "zech", "zc"] },
  { id: "MAL", name: "Malachi", chapters: 4, aliases: ["mal", "ml"] },
  // ---- New Testament ----
  { id: "MAT", name: "Matthew", chapters: 28, aliases: ["mat", "matt", "mt"] },
  { id: "MRK", name: "Mark", chapters: 16, aliases: ["mrk", "mk", "mar"] },
  { id: "LUK", name: "Luke", chapters: 24, aliases: ["luk", "lk"] },
  { id: "JHN", name: "John", chapters: 21, aliases: ["jhn", "jn", "joh"] },
  { id: "ACT", name: "Acts", chapters: 28, aliases: ["act", "ac"] },
  { id: "ROM", name: "Romans", chapters: 16, aliases: ["rom", "ro", "rm"] },
  { id: "1CO", name: "1 Corinthians", chapters: 16, aliases: ["1 cor", "1cor", "1 co", "1co", "i corinthians", "first corinthians"] },
  { id: "2CO", name: "2 Corinthians", chapters: 13, aliases: ["2 cor", "2cor", "2 co", "2co", "ii corinthians", "second corinthians"] },
  { id: "GAL", name: "Galatians", chapters: 6, aliases: ["gal", "ga"] },
  { id: "EPH", name: "Ephesians", chapters: 6, aliases: ["eph", "ephes"] },
  { id: "PHP", name: "Philippians", chapters: 4, aliases: ["php", "phil", "pp"] },
  { id: "COL", name: "Colossians", chapters: 4, aliases: ["col"] },
  { id: "1TH", name: "1 Thessalonians", chapters: 5, aliases: ["1 thess", "1thess", "1 th", "1th", "i thessalonians", "first thessalonians"] },
  { id: "2TH", name: "2 Thessalonians", chapters: 3, aliases: ["2 thess", "2thess", "2 th", "2th", "ii thessalonians", "second thessalonians"] },
  { id: "1TI", name: "1 Timothy", chapters: 6, aliases: ["1 tim", "1tim", "1 ti", "1ti", "i timothy", "first timothy"] },
  { id: "2TI", name: "2 Timothy", chapters: 4, aliases: ["2 tim", "2tim", "2 ti", "2ti", "ii timothy", "second timothy"] },
  { id: "TIT", name: "Titus", chapters: 3, aliases: ["tit"] },
  { id: "PHM", name: "Philemon", chapters: 1, singleChapter: true, aliases: ["phm", "phlm", "philem"] },
  { id: "HEB", name: "Hebrews", chapters: 13, aliases: ["heb"] },
  { id: "JAS", name: "James", chapters: 5, aliases: ["jas", "jm"] },
  { id: "1PE", name: "1 Peter", chapters: 5, aliases: ["1 pet", "1pet", "1 pe", "1pe", "1 pt", "1pt", "i peter", "first peter"] },
  { id: "2PE", name: "2 Peter", chapters: 3, aliases: ["2 pet", "2pet", "2 pe", "2pe", "2 pt", "2pt", "ii peter", "second peter"] },
  { id: "1JN", name: "1 John", chapters: 5, aliases: ["1 jn", "1jn", "1 jhn", "1jhn", "i john", "first john"] },
  { id: "2JN", name: "2 John", chapters: 1, singleChapter: true, aliases: ["2 jn", "2jn", "2 jhn", "2jhn", "ii john", "second john"] },
  { id: "3JN", name: "3 John", chapters: 1, singleChapter: true, aliases: ["3 jn", "3jn", "3 jhn", "3jhn", "iii john", "third john"] },
  { id: "JUD", name: "Jude", chapters: 1, singleChapter: true, aliases: ["jud", "jd"] },
  { id: "REV", name: "Revelation", chapters: 22, aliases: ["rev", "re", "apoc", "apocalypse"] },
];

// Ambiguous bare names → suggested canonical disambiguations.
const AMBIGUOUS: Record<string, string[]> = {
  peter: ["1 Peter", "2 Peter"],
  pet: ["1 Peter", "2 Peter"],
  pe: ["1 Peter", "2 Peter"],
  john: ["John", "1 John", "2 John", "3 John"],
  jn: ["John", "1 John", "2 John", "3 John"],
  samuel: ["1 Samuel", "2 Samuel"],
  sam: ["1 Samuel", "2 Samuel"],
  kings: ["1 Kings", "2 Kings"],
  kgs: ["1 Kings", "2 Kings"],
  chronicles: ["1 Chronicles", "2 Chronicles"],
  chr: ["1 Chronicles", "2 Chronicles"],
  corinthians: ["1 Corinthians", "2 Corinthians"],
  cor: ["1 Corinthians", "2 Corinthians"],
  thessalonians: ["1 Thessalonians", "2 Thessalonians"],
  thess: ["1 Thessalonians", "2 Thessalonians"],
  timothy: ["1 Timothy", "2 Timothy"],
  tim: ["1 Timothy", "2 Timothy"],
};

// ---- Helpers ----

const ROMAN: Record<string, string> = { i: "1", ii: "2", iii: "3" };
const WORD_NUM: Record<string, string> = { first: "1", second: "2", third: "3" };

function normalizeInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,;!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNumberPrefix(input: string): string {
  // Map "i john" → "1 john", "first john" → "1 john"
  const parts = input.split(" ");
  if (parts.length >= 2) {
    const head = parts[0];
    if (ROMAN[head]) parts[0] = ROMAN[head];
    else if (WORD_NUM[head]) parts[0] = WORD_NUM[head];
  }
  return parts.join(" ");
}

function splitBookAndRef(input: string): {
  bookPart: string;
  chapter?: number;
  verse?: number;
} {
  // Capture trailing "<chapter>" or "<chapter>:<verse>"
  const m = input.match(/^(.*?)\s+(\d+)(?::(\d+))?\s*$/);
  if (m) {
    return {
      bookPart: m[1].trim(),
      chapter: parseInt(m[2], 10),
      verse: m[3] ? parseInt(m[3], 10) : undefined,
    };
  }
  // Tight form like "1pe2" or "1pe2:5" — pull last digit-run as chapter
  const tight = input.match(/^([a-z]+\d?[a-z]*)(\d+)(?::(\d+))?$/);
  if (tight) {
    return {
      bookPart: tight[1].trim(),
      chapter: parseInt(tight[2], 10),
      verse: tight[3] ? parseInt(tight[3], 10) : undefined,
    };
  }
  return { bookPart: input };
}

function lookupBook(name: string): CanonicalBook | null {
  const n = name.toLowerCase().replace(/\s+/g, " ").trim();
  for (const b of BOOKS) {
    if (b.name.toLowerCase() === n) return b;
    if (b.aliases.includes(n)) return b;
  }
  // "psalm" → Psalms already in aliases; collapsed-space variants:
  const noSpace = n.replace(/\s+/g, "");
  for (const b of BOOKS) {
    if (b.name.toLowerCase().replace(/\s+/g, "") === noSpace) return b;
    if (b.aliases.some((a) => a.replace(/\s+/g, "") === noSpace)) return b;
  }
  return null;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i];
      dp[i] =
        a[i - 1] === b[j - 1]
          ? prev
          : Math.min(prev, dp[i], dp[i - 1]) + 1;
      prev = tmp;
    }
  }
  return dp[a.length];
}

function fuzzyClosest(name: string): string | undefined {
  const target = name.toLowerCase();
  let best: { name: string; dist: number } | null = null;
  for (const b of BOOKS) {
    const candidates = [b.name.toLowerCase(), ...b.aliases];
    for (const c of candidates) {
      const d = levenshtein(target, c);
      if (d <= 2) {
        const better =
          !best ||
          d < best.dist ||
          (d === best.dist && b.name.length < best.name.length);
        if (better) best = { name: b.name, dist: d };
      }
    }
  }
  return best ? best.name : undefined;
}

function ambiguousSuggestions(name: string): string[] {
  const n = name.toLowerCase().trim();
  return AMBIGUOUS[n] ?? [];
}

// ---- Diagnostics ----
const isDev = (import.meta as any)?.env?.DEV || false;
const isCapacitor =
  typeof window !== "undefined" &&
  !!(window as any).Capacitor?.isNativePlatform?.();

// ---- Public API ----

export function parseScriptureReference(input: string): ScriptureParseResult {
  const rawInput = input ?? "";
  try {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return logged(rawInput, "", { state: "empty" });
    }
    let normalized = normalizeInput(trimmed);
    if (!normalized) return logged(rawInput, "", { state: "empty" });

    normalized = normalizeNumberPrefix(normalized);

    const { bookPart, chapter, verse } = splitBookAndRef(normalized);
    const bookKey = bookPart.trim();

    if (!bookKey) {
      return logged(rawInput, normalized, { state: "invalid", normalizedInput: normalized });
    }

    // Step 5/6: if the bare book key is in the ambiguous table AND no chapter
    // was supplied, prefer disambiguation (e.g. "john" → Gospel + epistles)
    // even when an exact match exists for one of them.
    if (chapter == null) {
      const ambig = ambiguousSuggestions(bookKey);
      if (ambig.length > 0) {
        return logged(rawInput, normalized, {
          state: "ambiguous",
          suggestions: ambig,
          normalizedInput: normalized,
        });
      }
    }

    // Step 5: exact match (canonical + aliases)
    const book = lookupBook(bookKey);
    if (book) {
      // Single-chapter books: auto-fill chapter 1
      if (book.singleChapter) {
        const finalVerse = verse ?? (chapter && !book.singleChapter ? undefined : undefined);
        // If user typed "jude 5" they meant verse 5 of jude 1 — but spec says chapter=1; pass through.
        return logged(rawInput, normalized, {
          state: "valid",
          bookId: book.id,
          bookName: book.name,
          chapter: 1,
          verse: chapter ?? verse, // tolerate "jude 5" as verse 5
        });
      }
      if (chapter == null) {
        return logged(rawInput, normalized, {
          state: "missingChapter",
          bookId: book.id,
          bookName: book.name,
          maxChapters: book.chapters,
        });
      }
      if (chapter < 1 || chapter > book.chapters) {
        return logged(rawInput, normalized, {
          state: "invalid",
          normalizedInput: normalized,
        });
      }
      return logged(rawInput, normalized, {
        state: "valid",
        bookId: book.id,
        bookName: book.name,
        chapter,
        verse,
      });
    }

    // Step 6: ambiguous bare name
    const ambig = ambiguousSuggestions(bookKey);
    if (ambig.length > 0) {
      return logged(rawInput, normalized, {
        state: "ambiguous",
        suggestions: ambig,
        normalizedInput: normalized,
      });
    }

    // Step 7: fuzzy match
    const fuzzy = fuzzyClosest(bookKey);
    return logged(rawInput, normalized, {
      state: "invalid",
      normalizedInput: normalized,
      fuzzyMatch: fuzzy,
    });
  } catch (err) {
    if (isDev) {
      // TODO: Remove before production Play Store release
      console.error("[DABAR] scripture:error", {
        context: "parser",
        input: rawInput,
        errorMessage: (err as Error)?.message ?? "unknown",
        isCapacitor,
      });
    }
    return { state: "invalid", normalizedInput: rawInput };
  }
}

function logged(
  rawInput: string,
  normalized: string,
  result: ScriptureParseResult
): ScriptureParseResult {
  if (isDev) {
    // TODO: Remove before production Play Store release
    console.log("[DABAR] scripture:parse", {
      input: rawInput,
      normalized,
      state: result.state,
      bookId: result.bookId ?? null,
      chapter: result.chapter ?? null,
      suggestions: result.suggestions ?? null,
      fuzzyMatch: result.fuzzyMatch ?? null,
      isCapacitor,
    });
  }
  return result;
}

export function getAmbiguousSuggestions(bookNameFragment: string): string[] {
  if (!bookNameFragment) return [];
  return ambiguousSuggestions(bookNameFragment.toLowerCase().trim());
}

// Lookup helpers exported for fetchScripture validation
export function getCanonicalBook(bookId: string): {
  id: string;
  name: string;
  chapters: number;
} | null {
  const b = BOOKS.find((x) => x.id === bookId);
  return b ? { id: b.id, name: b.name, chapters: b.chapters } : null;
}

export function looksLikeScriptureReference(input: string): boolean {
  // Heuristic to decide whether to run the parser on Ask-screen input.
  // True for short inputs whose first token (after roman/word-num prefix)
  // matches a known book name/alias or an ambiguous key.
  const t = (input || "").trim();
  if (!t || t.length > 60) return false;
  if (t.endsWith("?")) return false;
  const wordCount = t.split(/\s+/).length;
  if (wordCount > 5) return false;
  const norm = normalizeNumberPrefix(normalizeInput(t));
  const { bookPart } = splitBookAndRef(norm);
  const key = bookPart.trim();
  if (!key) return false;
  if (lookupBook(key)) return true;
  if (ambiguousSuggestions(key).length > 0) return true;
  // Allow fuzzy on single-word inputs only
  if (wordCount <= 2 && fuzzyClosest(key)) return true;
  return false;
}

export const __canonicalBooks = BOOKS;

// ---- Citation extraction (fallback-safe) ----

const SCRIPTURE_BLOCK_RE =
  /\[SCRIPTURE\]\s*\n\s*reference:\s*(.+?)\n\s*text:\s*[\s\S]*?\n\s*\[\/SCRIPTURE\]/gi;

// Loose block form: tolerates missing newlines, missing text:, or unterminated blocks.
const LOOSE_BLOCK_RE =
  /\[SCRIPTURE\][\s\S]*?reference:\s*([^\n\[]+)/gi;

// Inline reference like "John 3:16", "1 Cor 13:4-7", "Psalm 23", "Psalm 23:1"
const INLINE_REF_RE =
  /\b((?:[1-3]\s*)?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+)(?::(\d+)(?:[-–]\d+)?)?\b/g;

function cleanRef(raw: string): string {
  return raw.replace(/[\s.,;:]+$/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Extract scripture references from model output.
 * Order of attempts (each only runs if previous yields nothing):
 *   1. Well-formed [SCRIPTURE] blocks
 *   2. Malformed/loose [SCRIPTURE] blocks (missing text:, unterminated)
 *   3. Inline references validated against the canonical book list
 * Always returns a deduped array; never throws.
 */
export function extractScriptureRefs(text: string): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (ref: string) => {
    const cleaned = cleanRef(ref);
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(cleaned);
  };

  try {
    let m: RegExpExecArray | null;
    SCRIPTURE_BLOCK_RE.lastIndex = 0;
    while ((m = SCRIPTURE_BLOCK_RE.exec(text)) !== null) push(m[1]);
    if (out.length > 0) return out;

    LOOSE_BLOCK_RE.lastIndex = 0;
    while ((m = LOOSE_BLOCK_RE.exec(text)) !== null) push(m[1]);
    if (out.length > 0) return out;

    // Strip any block scaffolding before inline scan to avoid double-counting
    const stripped = text.replace(/\[\/?SCRIPTURE\]/gi, " ");
    INLINE_REF_RE.lastIndex = 0;
    while ((m = INLINE_REF_RE.exec(stripped)) !== null) {
      const bookPart = m[1];
      const chapter = m[2];
      const verse = m[3];
      const book = lookupBook(bookPart);
      if (!book) continue;
      // For single-chapter books, "Jude 5" means verse 5
      const ref = book.singleChapter && !verse
        ? `${book.name} ${chapter}`
        : verse
          ? `${book.name} ${chapter}:${verse}`
          : `${book.name} ${chapter}`;
      push(ref);
    }
  } catch {
    // never throw — return whatever we collected
  }
  return out;
}
