// Hardened scripture data fetch for DABAR.
// Validates references before network calls, applies 8s AbortController timeout,
// caches success + transient failures (60s) to survive Android WebView stalls.

import { getCanonicalBook } from "./scriptureParser";

export interface VerseData {
  verse: number;
  text: string;
}

export interface ScriptureFetchResult {
  success: boolean;
  verses?: VerseData[];
  error?: "not_found" | "timeout" | "network" | "invalid_reference" | "unknown";
  friendlyMessage?: string;
}

const FRIENDLY = {
  invalid_reference:
    "That scripture reference wasn't found. Please check the book and chapter.",
  timeout:
    "Scripture is taking too long to load. Please check your connection and try again.",
  network: "Unable to load scripture right now. Please check your connection.",
  not_found:
    "That chapter wasn't found. It may not be available in this translation.",
  unknown: "Something went wrong loading that scripture. Please try again.",
} as const;

const FETCH_TIMEOUT_MS = 8000;
const FAILURE_TTL_MS = 60_000;

interface CacheEntry {
  at: number;
  result: ScriptureFetchResult;
}
const cache = new Map<string, CacheEntry>();

const isDev = (import.meta as any)?.env?.DEV || false;
const isCapacitor =
  typeof window !== "undefined" &&
  !!(window as any).Capacitor?.isNativePlatform?.();

function logLookup(args: {
  bookId: string;
  chapter: number;
  translation: string;
  cacheHit: boolean;
  result: ScriptureFetchResult;
}) {
  if (!isDev) return;
  // TODO: Remove before production Play Store release
  console.log("[DABAR] scripture:lookup", {
    bookId: args.bookId,
    chapter: args.chapter,
    translation: args.translation,
    cacheHit: args.cacheHit,
    success: args.result.success,
    error: args.result.error ?? null,
    isCapacitor,
  });
}

export async function fetchScripture(
  bookId: string,
  chapter: number,
  translation: string = "kjv"
): Promise<ScriptureFetchResult> {
  const trans = (translation || "kjv").toLowerCase();
  const key = `${bookId}-${chapter}-${trans}`;

  // Validate book + chapter BEFORE any network call
  const book = getCanonicalBook(bookId);
  if (!book) {
    const result: ScriptureFetchResult = {
      success: false,
      error: "invalid_reference",
      friendlyMessage: FRIENDLY.invalid_reference,
    };
    logLookup({ bookId, chapter, translation: trans, cacheHit: false, result });
    return result;
  }
  if (!Number.isFinite(chapter) || chapter < 1 || chapter > book.chapters) {
    const result: ScriptureFetchResult = {
      success: false,
      error: "invalid_reference",
      friendlyMessage: FRIENDLY.invalid_reference,
    };
    logLookup({ bookId, chapter, translation: trans, cacheHit: false, result });
    return result;
  }

  // Cache check (success cached for session; failures cached for FAILURE_TTL_MS)
  const cached = cache.get(key);
  if (cached) {
    if (cached.result.success) {
      logLookup({
        bookId,
        chapter,
        translation: trans,
        cacheHit: true,
        result: cached.result,
      });
      return cached.result;
    }
    if (Date.now() - cached.at < FAILURE_TTL_MS) {
      logLookup({
        bookId,
        chapter,
        translation: trans,
        cacheHit: true,
        result: cached.result,
      });
      return cached.result;
    }
    cache.delete(key);
  }

  const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID;
  const bookQuery = book.name.replace(/ /g, "+");
  const url = `https://${projectId}.supabase.co/functions/v1/bible-proxy?ref=${encodeURIComponent(
    bookQuery + "+" + chapter
  )}&translation=${encodeURIComponent(trans)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let result: ScriptureFetchResult;
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      result =
        res.status === 404
          ? { success: false, error: "not_found", friendlyMessage: FRIENDLY.not_found }
          : { success: false, error: "network", friendlyMessage: FRIENDLY.network };
    } else {
      const data = await res.json().catch(() => null);
      const versesRaw = data && Array.isArray(data.verses) ? data.verses : null;
      if (!versesRaw || versesRaw.length === 0) {
        result = {
          success: false,
          error: "not_found",
          friendlyMessage: FRIENDLY.not_found,
        };
      } else {
        const verses: VerseData[] = versesRaw.map((v: any) => ({
          verse: Number(v.verse),
          text: String(v.text || "").trim(),
        }));
        result = { success: true, verses };
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      result = { success: false, error: "timeout", friendlyMessage: FRIENDLY.timeout };
    } else {
      result = { success: false, error: "network", friendlyMessage: FRIENDLY.network };
    }
    if (isDev) {
      // TODO: Remove before production Play Store release
      console.error("[DABAR] scripture:error", {
        context: "fetch",
        input: `${bookId} ${chapter} ${trans}`,
        errorMessage: err?.message ?? "unknown",
        isCapacitor,
      });
    }
  } finally {
    clearTimeout(timer);
  }

  cache.set(key, { at: Date.now(), result });
  logLookup({ bookId, chapter, translation: trans, cacheHit: false, result });
  return result;
}

export function _clearScriptureCacheForTest() {
  cache.clear();
}
