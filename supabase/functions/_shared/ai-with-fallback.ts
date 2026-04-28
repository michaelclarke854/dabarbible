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
 * Anthropic emits events like `event: content_block_delta` with
 * `data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}`.
 * We only forward text deltas, re-shaped as
 * `data: {"choices":[{"delta":{"content":"..."}}]}` so consumers parsing
 * the OpenAI format (seek-wisdom's reader) work unchanged.
 */
function claudeSSEToOpenAISSE(input: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = input.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl).replace(/\r$/, "");
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload) continue;
            try {
              const evt = JSON.parse(payload);
              if (
                evt?.type === "content_block_delta" &&
                evt?.delta?.type === "text_delta" &&
                typeof evt.delta.text === "string"
              ) {
                const out = `data: ${JSON.stringify({
                  choices: [{ delta: { content: evt.delta.text } }],
                })}\n\n`;
                controller.enqueue(encoder.encode(out));
              } else if (evt?.type === "message_stop") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              }
            } catch {
              /* skip malformed event */
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        console.error("Claude SSE relay error:", e);
      } finally {
        controller.close();
      }
    },
  });
}