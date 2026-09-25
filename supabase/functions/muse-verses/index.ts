import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import dailyVerses from "./daily-verses.json" with { type: "json" };
// Mirror of daily-verse/daily-verses.json (functions cannot import across folders). Only `ref` is used.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const MAX_BODY = 64 * 1024;
const LINK = "https://dabarbible.com/?utm_source=muse&utm_medium=connector&utm_campaign=get_verse";
const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const GENERIC_TOOL_ERROR = "Verse unavailable right now. Please try again later.";

const THEME_REFS: Record<string, string[]> = {
  peace: ["Philippians 4:6-7", "John 14:27", "John 16:33", "Psalm 46:10"],
  anxiety: ["1 Peter 5:7", "Philippians 4:6-7", "Matthew 11:28-30"],
  fear: ["Isaiah 41:10", "Psalm 27:1", "Joshua 1:9"],
  strength: ["Isaiah 40:31", "2 Corinthians 12:9", "Isaiah 41:10"],
  hope: ["Jeremiah 29:11", "Lamentations 3:22-23", "Hebrews 11:1", "Romans 8:28"],
  grief: ["Psalm 34:18", "Revelation 21:4", "Psalm 23:1"],
  guidance: ["Proverbs 3:5-6", "Psalm 119:105", "Psalm 16:11", "Matthew 6:33"],
  love: ["Romans 5:8", "1 Corinthians 13:4-7", "Ephesians 2:8-9"],
  rest: ["Matthew 11:28-30", "Psalm 23:1", "Psalm 46:10"],
  joy: ["Psalm 16:11", "James 1:2-4", "Galatians 5:22-23"],
  renewal: ["Psalm 51:10", "Romans 12:2", "Lamentations 3:22-23"],
  trust: ["Proverbs 3:5-6", "Romans 8:28", "Psalm 23:1"],
};
const THEMES = Object.keys(THEME_REFS);
const DAILY_REFS = (dailyVerses as { ref: string }[]).map((v) => v.ref);

const TOOL = {
  name: "get_verse",
  title: "Get a KJV verse",
  description:
    "Returns a King James Version Bible verse for a chosen theme, or today's verse when no theme is given. The verse text is quoted exactly from the KJV.",
  inputSchema: {
    type: "object",
    properties: { theme: { type: "string", enum: THEMES, description: "Optional theme" } },
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: {
      reference: { type: "string" },
      text: { type: "string" },
      translation: { type: "string" },
      theme: { type: ["string", "null"] },
      link: { type: "string" },
    },
    required: ["reference", "text", "translation", "link"],
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
};

type Id = string | number | null;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
const rpcResult = (id: Id, result: unknown) => json({ jsonrpc: "2.0", id, result });
const rpcError = (id: Id, code: number, message: string) => json({ jsonrpc: "2.0", id, error: { code, message } });
const toolError = (text: string) => ({ isError: true, content: [{ type: "text", text }] });

function dayOfYear(d: Date) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86400_000);
}

function parseRef(ref: string) {
  const m = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error(`Unparseable ref: ${ref}`);
  let slug = m[1].toLowerCase().replace(/\s+/g, "");
  if (slug === "psalm") slug = "psalms";
  const start = Number(m[3]);
  const end = m[4] ? Number(m[4]) : start;
  return { slug, chapter: Number(m[2]), start, end };
}

function clean(s: string) {
  return s
    .replace(/\{[^}]*:[^}]*\}/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/^\s*[A-Z]+\.\s+/, "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(ref: string): Promise<string> {
  const { slug, chapter, start, end } = parseRef(ref);
  const { data, error } = await anon
    .from("bible_verses")
    .select("verse,text")
    .eq("version", "KJV")
    .eq("book_slug", slug)
    .eq("chapter", chapter)
    .gte("verse", start)
    .lte("verse", end)
    .order("verse", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length !== end - start + 1) throw new Error(`Missing verses for ${ref}`);
  for (let i = 0; i < rows.length; i++) if (rows[i].verse !== start + i) throw new Error(`Gap in ${ref}`);
  return rows.map((r) => clean(r.text)).join(" ");
}

async function callGetVerse(args: unknown) {
  const invalid = toolError(`Unknown theme. Valid themes: ${THEMES.join(", ")}`);
  let theme: string | null = null;
  if (args !== undefined && args !== null) {
    if (typeof args !== "object" || Array.isArray(args)) return invalid;
    const keys = Object.keys(args as Record<string, unknown>);
    if (keys.some((k) => k !== "theme")) return invalid;
    const t = (args as Record<string, unknown>).theme;
    if (t !== undefined) {
      if (typeof t !== "string" || !THEMES.includes(t)) return invalid;
      theme = t;
    }
  }
  const now = new Date();
  const doy = dayOfYear(now);
  const reference = theme
    ? THEME_REFS[theme][doy % THEME_REFS[theme].length]
    : DAILY_REFS[(doy - 1) % DAILY_REFS.length];
  const text = await fetchText(reference);

  try {
    const { error } = await admin.from("muse_verse_calls").insert({ theme });
    if (error) console.error("usage insert failed", error);
  } catch (e) {
    console.error("usage insert threw", e);
  }

  return {
    content: [{ type: "text", text: `"${text}" — ${reference} (KJV)\n\nMore daily verses and reflections: ${LINK}` }],
    structuredContent: { reference, text, translation: "KJV", theme, link: LINK },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return new Response(null, { status: 405 });

  let id: Id = null;
  try {
    const { data: setting, error: sErr } = await admin
      .from("muse_connector_settings").select("enabled").eq("id", 1).maybeSingle();
    if (sErr) console.error("settings read failed", sErr);
    if (!setting || setting.enabled === false) return json({ error: "unavailable" }, 503);

    const len = Number(req.headers.get("content-length") ?? "0");
    if (len > MAX_BODY) return new Response(null, { status: 413 });
    const buf = await req.arrayBuffer();
    if (buf.byteLength > MAX_BODY) return new Response(null, { status: 413 });

    let msg: any;
    try {
      msg = JSON.parse(new TextDecoder().decode(buf));
    } catch {
      return rpcError(null, -32700, "Parse error");
    }

    if (!msg || typeof msg !== "object" || Array.isArray(msg) || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
      return rpcError(null, -32600, "Invalid Request");
    }
    if (!("id" in msg)) return new Response(null, { status: 202 });
    if (msg.id !== null && typeof msg.id !== "string" && typeof msg.id !== "number") {
      return rpcError(null, -32600, "Invalid Request");
    }
    id = msg.id;
    const params = msg.params ?? {};

    switch (msg.method) {
      case "initialize": {
        const pv = typeof params?.protocolVersion === "string" && SUPPORTED_VERSIONS.includes(params.protocolVersion)
          ? params.protocolVersion : "2025-06-18";
        return rpcResult(id, {
          protocolVersion: pv,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "dabarbible", title: "DaBarBible", version: "1.0.0" },
          instructions: "Returns King James Version Bible verses by theme.",
        });
      }
      case "ping":
        return rpcResult(id, {});
      case "tools/list":
        return rpcResult(id, { tools: [TOOL] });
      case "tools/call": {
        if (params?.name !== "get_verse") return rpcError(id, -32602, "Unknown tool");
        try {
          return rpcResult(id, await callGetVerse(params.arguments));
        } catch (e) {
          console.error("get_verse failed", e);
          return rpcResult(id, toolError(GENERIC_TOOL_ERROR));
        }
      }
      default:
        return rpcError(id, -32601, "Method not found");
    }
  } catch (e) {
    console.error("muse-verses internal error", e);
    return rpcError(id, -32603, "Internal error");
  }
});
