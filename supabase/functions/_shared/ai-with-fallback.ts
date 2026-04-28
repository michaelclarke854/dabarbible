/**
 * Claude-first AI helper with automatic fallback to the Lovable AI Gateway.
 *
 * Why: ANTHROPIC_API_KEY may run out of credits (402), get rate limited (429),
 * or be temporarily unavailable. In all those cases we transparently fall back
 * to the Lovable AI Gateway so wisdom keeps flowing.
 *
 * Both helpers normalize their output to the OpenAI Chat Completions shape so
 * existing call sites (which read `choices[0].message.content` or stream
 * `choices[0].delta.content`) work unchanged.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const ANTHROPIC_VERSION = "2023-06-01";

export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-5";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIRequest = {
  messages: ChatMessage[];
  /** Lovable/OpenAI-style model id used for the fallback call. */
  fallbackModel: string;
  /** Claude model id. Defaults to claude-sonnet-4-5. */
  claudeModel?: string;
  maxTokens?: number;
  /** Optional OpenAI-style tool definitions (forwarded to fallback only). */
  tools?: unknown[];
  toolChoice?: unknown;
};

export type AIResult = {
  /** Which provider actually produced the response. */
  provider: "claude" | "lovable";
  /** OpenAI-shaped response body. */
  body: any;
};

/** True when the upstream error means we should try the fallback. */
function shouldFallback(status: number): boolean {
  // Out of credit / rate limited / auth issues / server errors
  return status === 402 || status === 429 || status === 401 || status === 403 || status >= 500;
}

/**
 * Transient errors worth retrying on the SAME provider before falling back:
 * - 429 (rate limited — often clears in <1s)
 * - 5xx (server hiccup)
 * Auth (401/403) and credit (402) won't recover from a retry, so we skip
 * those and fall straight through to the next provider.
 */
function isTransient(status: number): boolean {
  return status === 429 || status >= 500;
}

/** Backoff delays in ms between Claude attempts. Total worst-case wait ~700ms. */
const RETRY_BACKOFF_MS = [200, 500];

/** Honor `Retry-After` (seconds or HTTP-date) but cap to avoid user-perceptible latency. */
function retryAfterMs(headerValue: string | null, fallbackMs: number): number {
  if (!headerValue) return fallbackMs;
  const asInt = Number(headerValue);
  if (Number.isFinite(asInt)) return Math.min(asInt * 1000, 1500);
  const asDate = Date.parse(headerValue);
  if (Number.isFinite(asDate)) {
    return Math.min(Math.max(asDate - Date.now(), 0), 1500);
  }
  return fallbackMs;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Call Anthropic with short exponential backoff on transient failures.
 * Returns the final Response (success or terminal failure) or `null` on a
 * persistent network error after all retries.
 */
async function fetchClaudeWithRetry(body: unknown, headers: HeadersInit): Promise<Response | null> {
  const init: RequestInit = {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  };

  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
    try {
      const resp = await fetch(ANTHROPIC_URL, init);
      if (resp.ok || !isTransient(resp.status)) return resp;

      // Transient: maybe retry.
      if (attempt === RETRY_BACKOFF_MS.length) return resp; // out of retries
      const wait = retryAfterMs(resp.headers.get("retry-after"), RETRY_BACKOFF_MS[attempt]);
      // Drain the body so the connection can be reused.
      try { await resp.body?.cancel(); } catch { /* ignore */ }
      console.warn(`Claude ${resp.status} — retrying in ${wait}ms (attempt ${attempt + 1})`);
      await sleep(wait);
    } catch (e) {
      // Network error
      if (attempt === RETRY_BACKOFF_MS.length) {
        console.warn("Claude network error after retries:", e);
        return null;
      }
      const wait = RETRY_BACKOFF_MS[attempt];
      console.warn(`Claude network error — retrying in ${wait}ms (attempt ${attempt + 1}):`, e);
      await sleep(wait);
    }
  }
  return null;
}

/** Split an OpenAI-style messages array into Anthropic's system + messages shape. */
function splitForAnthropic(messages: ChatMessage[]): { system?: string; messages: ChatMessage[] } {
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const rest = messages.filter((m) => m.role !== "system");
  return { system: sys || undefined, messages: rest };
}

/** Normalize an Anthropic /messages response into OpenAI Chat Completions shape. */
function anthropicToOpenAI(json: any) {
  const text =
    Array.isArray(json?.content)
      ? json.content.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("")
      : "";
  return {
    id: json?.id,
    model: json?.model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: json?.stop_reason ?? "stop",
      },
    ],
  };
}

/**
 * Non-streaming chat completion. Tries Claude first, falls back to Lovable AI
 * on credit/rate/auth/server errors or network failure.
 *
 * Returns null if BOTH providers failed (caller decides how to respond).
 */
export async function chatWithFallback(req: AIRequest): Promise<AIResult | null> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const claudeModel = req.claudeModel ?? DEFAULT_CLAUDE_MODEL;
  const maxTokens = req.maxTokens ?? 1024;

  // ── Try Claude first ──────────────────────────────────────────────────
  if (anthropicKey) {
    try {
      const { system, messages } = splitForAnthropic(req.messages);
      const resp = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: claudeModel,
          max_tokens: maxTokens,
          system,
          messages,
        }),
      });

      if (resp.ok) {
        const json = await resp.json();
        return { provider: "claude", body: anthropicToOpenAI(json) };
      }

      if (!shouldFallback(resp.status)) {
        // Non-recoverable (e.g. 400 bad request) — surface as a failure so
        // we don't silently hide a real bug behind the fallback.
        console.error("Claude error (no fallback):", resp.status, await resp.text());
        return null;
      }
      console.warn(`Claude ${resp.status} — falling back to Lovable AI`);
    } catch (e) {
      console.warn("Claude network error — falling back to Lovable AI:", e);
    }
  }

  // ── Fallback: Lovable AI Gateway ──────────────────────────────────────
  if (!lovableKey) {
    console.error("Lovable fallback unavailable: LOVABLE_API_KEY missing");
    return null;
  }

  const body: Record<string, unknown> = {
    model: req.fallbackModel,
    messages: req.messages,
    max_tokens: maxTokens,
  };
  if (req.tools) body.tools = req.tools;
  if (req.toolChoice) body.tool_choice = req.toolChoice;

  const resp = await fetch(LOVABLE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    console.error("Lovable AI error:", resp.status, await resp.text());
    return null;
  }
  const json = await resp.json();
  return { provider: "lovable", body: json };
}

/**
 * Streaming variant. Returns a Response whose body is an OpenAI-style SSE
 * stream (`data: {choices:[{delta:{content}}]}\n\n` ... `data: [DONE]`).
 *
 * Tries Claude streaming first; on credit/rate/auth/server errors (or network
 * failure) it transparently falls back to the Lovable AI Gateway and pipes
 * the gateway's SSE stream straight through.
 *
 * Returns null if BOTH providers failed. The caller should send an error
 * response in that case.
 */
export async function streamChatWithFallback(req: AIRequest): Promise<{
  provider: "claude" | "lovable";
  stream: ReadableStream<Uint8Array>;
} | { provider: "error"; status: number }> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const claudeModel = req.claudeModel ?? DEFAULT_CLAUDE_MODEL;
  const maxTokens = req.maxTokens ?? 1024;

  // ── Try Claude streaming ──────────────────────────────────────────────
  if (anthropicKey) {
    try {
      const { system, messages } = splitForAnthropic(req.messages);
      const resp = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: claudeModel,
          max_tokens: maxTokens,
          stream: true,
          system,
          messages,
        }),
      });

      if (resp.ok && resp.body) {
        return { provider: "claude", stream: claudeSSEToOpenAISSE(resp.body) };
      }

      if (!shouldFallback(resp.status)) {
        console.error("Claude stream error (no fallback):", resp.status);
        return { provider: "error", status: resp.status };
      }
      console.warn(`Claude stream ${resp.status} — falling back to Lovable AI`);
    } catch (e) {
      console.warn("Claude stream network error — falling back:", e);
    }
  }

  // ── Fallback: Lovable AI Gateway streaming ────────────────────────────
  if (!lovableKey) {
    return { provider: "error", status: 500 };
  }

  const resp = await fetch(LOVABLE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: req.fallbackModel,
      max_tokens: maxTokens,
      stream: true,
      messages: req.messages,
    }),
  });

  if (!resp.ok || !resp.body) {
    return { provider: "error", status: resp.status || 500 };
  }
  return { provider: "lovable", stream: resp.body };
}

/**
 * Convert Anthropic's SSE event stream into an OpenAI-style SSE stream.
 *
 * Follows the SSE spec (https://html.spec.whatwg.org/multipage/server-sent-events.html):
 *   - Events are separated by a blank line (\n\n, \r\n\r\n, or \r\r).
 *   - A field line is `name: value` (the single space after the colon is optional).
 *   - Multiple `data:` lines in one event are joined with `\n` to form the payload.
 *   - Lines starting with `:` are comments / keep-alives and must be ignored.
 *   - Lines without a colon are field names with empty value.
 *
 * Anthropic emits events like:
 *   event: content_block_delta
 *   data: {"type":"content_block_delta","index":0,
 *   data: "delta":{"type":"text_delta","text":"hello"}}
 *
 * We forward only `text_delta` chunks, reshaped as
 * `data: {"choices":[{"delta":{"content":"..."}}]}\n\n` so any OpenAI-style
 * SSE consumer (seek-wisdom's reader) works unchanged. `[DONE]` is emitted
 * exactly once on `message_stop` or stream end — never both.
 */
function claudeSSEToOpenAISSE(input: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = input.getReader();
      let buffer = "";
      let doneSent = false;

      const sendDone = () => {
        if (doneSent) return;
        doneSent = true;
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      };

      const emitText = (text: string) => {
        if (!text) return;
        const out = `data: ${JSON.stringify({
          choices: [{ delta: { content: text } }],
        })}\n\n`;
        controller.enqueue(encoder.encode(out));
      };

      // Process one complete SSE event block (text between blank lines).
      // Concatenates consecutive `data:` field lines per the SSE spec.
      const processEvent = (block: string) => {
        if (!block) return;
        const dataLines: string[] = [];
        for (const rawLine of block.split("\n")) {
          const line = rawLine.replace(/\r$/, "");
          if (!line || line.startsWith(":")) continue; // blank or comment
          const colon = line.indexOf(":");
          const field = colon === -1 ? line : line.slice(0, colon);
          if (field !== "data") continue;
          // Per spec: strip a single leading space from the value.
          let value = colon === -1 ? "" : line.slice(colon + 1);
          if (value.startsWith(" ")) value = value.slice(1);
          dataLines.push(value);
        }
        if (dataLines.length === 0) return;
        const payload = dataLines.join("\n");

        let evt: any;
        try {
          evt = JSON.parse(payload);
        } catch {
          return; // skip malformed
        }

        if (
          evt?.type === "content_block_delta" &&
          evt?.delta?.type === "text_delta" &&
          typeof evt.delta.text === "string"
        ) {
          emitText(evt.delta.text);
        } else if (evt?.type === "message_stop") {
          sendDone();
        } else if (evt?.type === "error") {
          console.error("Claude stream error event:", evt?.error);
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Split on any SSE event boundary: \n\n, \r\n\r\n, or \r\r.
          // Keep the trailing partial block in the buffer.
          let boundary = findEventBoundary(buffer);
          while (boundary !== -1) {
            const block = buffer.slice(0, boundary.start);
            buffer = buffer.slice(boundary.end);
            processEvent(block);
            boundary = findEventBoundary(buffer);
          }
        }

        // Flush any final block that arrived without a trailing blank line.
        const tail = buffer.replace(/\r/g, "").trim();
        if (tail) processEvent(tail);

        sendDone();
      } catch (e) {
        console.error("Claude SSE relay error:", e);
        sendDone();
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * Locate the next SSE event boundary in `buf`. Returns the index range to
 * slice off (`start` = end of event content, `end` = start of next event)
 * or -1 when no complete boundary is present yet.
 */
function findEventBoundary(
  buf: string,
): -1 | { start: number; end: number } {
  // Order matters: check the longest sequence first.
  const candidates: Array<{ sep: string }> = [
    { sep: "\r\n\r\n" },
    { sep: "\n\n" },
    { sep: "\r\r" },
  ];
  let best: { start: number; end: number } | null = null;
  for (const { sep } of candidates) {
    const i = buf.indexOf(sep);
    if (i === -1) continue;
    if (!best || i < best.start) {
      best = { start: i, end: i + sep.length };
    }
  }
  return best ?? -1;
}