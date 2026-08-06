import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { normalizeVerse } from "../_shared/verse-normalize.ts";

const SOURCE_URL =
  "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json";

interface SourceBook {
  abbrev: string;
  name: string;
  chapters: string[][];
}

interface VerseRow {
  version: string;
  book_slug: string;
  book_name: string;
  book_order: number;
  chapter: number;
  verse: number;
  text: string;
  text_norm: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const seedSecret = Deno.env.get("SEED_SECRET");
  if (!seedSecret) {
    return json({ ok: false, error: "SEED_SECRET not configured" }, 503);
  }
  if (req.headers.get("x-seed-secret") !== seedSecret) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const startedAt = Date.now();
  let lastBookProcessed = 0;

  try {
    let startBook = 1;
    try {
      const body = await req.json();
      if (body && typeof body.startBook === "number" && body.startBook >= 1) {
        startBook = Math.floor(body.startBook);
      }
    } catch {
      // no body -> default
    }
    lastBookProcessed = startBook - 1;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const res = await fetch(SOURCE_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch corpus: ${res.status}`);
    }
    let raw = await res.text();
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const books = JSON.parse(raw) as SourceBook[];

    let booksProcessed = 0;
    let versesUpserted = 0;
    let batch: VerseRow[] = [];

    const flush = async () => {
      if (batch.length === 0) return;
      const { error } = await supabase
        .from("bible_verses")
        .upsert(batch, {
          onConflict: "version,book_slug,chapter,verse",
          ignoreDuplicates: true,
        });
      if (error) throw new Error(error.message);
      versesUpserted += batch.length;
      batch = [];
    };

    for (let b = startBook - 1; b < books.length; b++) {
      const book = books[b];
      const bookOrder = b + 1;
      const bookSlug = book.name.toLowerCase().replace(/[^a-z0-9]/g, "");

      for (let c = 0; c < book.chapters.length; c++) {
        const chapter = book.chapters[c];
        for (let v = 0; v < chapter.length; v++) {
          const text = chapter[v];
          batch.push({
            version: "KJV",
            book_slug: bookSlug,
            book_name: book.name,
            book_order: bookOrder,
            chapter: c + 1,
            verse: v + 1,
            text,
            text_norm: normalizeVerse(text),
          });
          if (batch.length >= 1000) await flush();
        }
      }

      booksProcessed++;
      lastBookProcessed = bookOrder;
      if (bookOrder % 10 === 0) {
        console.log(
          `bible-seed: processed book ${bookOrder} (${book.name}), ${versesUpserted} verses upserted so far`,
        );
      }
    }

    await flush();

    return json({
      ok: true,
      booksProcessed,
      versesUpserted,
      lastBookProcessed,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (err) {
    console.error("bible-seed failed:", err);
    return json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        lastBookProcessed,
      },
      500,
    );
  }
});