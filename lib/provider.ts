export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export class ProviderError extends Error {
  code: "not_configured" | "timeout" | "http" | "empty_response" | "bad_response";

  constructor(code: ProviderError["code"], message: string) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
  }
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY?.trim());
}

export function getAiModel(): string {
  return process.env.LLM_MODEL?.trim() || "gpt-4.1-mini";
}

function providerUrl(): string {
  const base = (process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  );
  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    throw new ProviderError("not_configured", "LLM_BASE_URL is not a valid URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new ProviderError("not_configured", "LLM_BASE_URL must use http or https.");
  }
  return `${base}/chat/completions`;
}

function contentFromResponse(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new ProviderError("bad_response", "Provider returned an unexpected payload.");
  }
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new ProviderError("empty_response", "Provider returned no choices.");
  }
  const message = (choices[0] as { message?: unknown }).message;
  if (!message || typeof message !== "object") {
    throw new ProviderError("bad_response", "Provider response had no message.");
  }
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const text = content
      .map((part) =>
        part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string"
          ? (part as { text: string }).text
          : "",
      )
      .join("\n")
      .trim();
    if (text) return text;
  }
  throw new ProviderError("empty_response", "Provider returned empty content.");
}

export async function callChat(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) {
    throw new ProviderError("not_configured", "No LLM key is configured.");
  }

  let response: Response;
  try {
    response = await fetch(providerUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getAiModel(),
        messages,
        temperature: 0.15,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ProviderError("timeout", "The AI provider timed out.");
    }
    throw new ProviderError("http", "Could not reach the AI provider.");
  }

  if (!response.ok) {
    throw new ProviderError("http", `AI provider returned HTTP ${response.status}.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ProviderError("bad_response", "AI provider returned invalid JSON.");
  }
  return contentFromResponse(payload);
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new ProviderError("bad_response", "The model did not return a JSON object.");
  }
  const candidate = withoutFences.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    throw new ProviderError("bad_response", "The model returned malformed JSON.");
  }
}
