import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProviderError,
  callChat,
  extractJsonObject,
  getAiModel,
  isAiConfigured,
} from "../lib/provider";

const originalKey = process.env.LLM_API_KEY;
const originalModel = process.env.LLM_MODEL;
const originalBase = process.env.LLM_BASE_URL;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey === undefined) delete process.env.LLM_API_KEY;
  else process.env.LLM_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.LLM_MODEL;
  else process.env.LLM_MODEL = originalModel;
  if (originalBase === undefined) delete process.env.LLM_BASE_URL;
  else process.env.LLM_BASE_URL = originalBase;
});

describe("LLM provider adapter", () => {
  beforeEach(() => {
    delete process.env.LLM_API_KEY;
  });

  it("reports the unconfigured state without making a request", async () => {
    expect(isAiConfigured()).toBe(false);
    await expect(
      callChat([{ role: "user", content: "hi" }]),
    ).rejects.toMatchObject({ code: "not_configured" });
  });

  it("calls an OpenAI-compatible endpoint and returns message content", async () => {
    process.env.LLM_API_KEY = "test-secret";
    process.env.LLM_MODEL = "test-model";
    process.env.LLM_BASE_URL = "https://example.invalid/v1/";
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"answer":42}' } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const content = await callChat([
      { role: "system", content: "Return JSON" },
      { role: "user", content: "hello" },
    ]);
    expect(content).toBe('{"answer":42}');
    expect(getAiModel()).toBe("test-model");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://example.invalid/v1/chat/completions");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("test-model");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages).toHaveLength(2);
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-secret");
  });

  it("maps HTTP failures to a safe ProviderError without leaking the body", async () => {
    process.env.LLM_API_KEY = "test-secret";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("secret upstream details", { status: 500 })),
    );
    await expect(callChat([{ role: "user", content: "hello" }])).rejects.toBeInstanceOf(
      ProviderError,
    );
    await expect(callChat([{ role: "user", content: "hello" }])).rejects.toMatchObject({
      code: "http",
      message: "AI provider returned HTTP 500.",
    });
  });

  it("extracts JSON from fenced model output", () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJsonObject('Here is the scene: {"a":{"b":[1,2]}}')).toEqual({
      a: { b: [1, 2] },
    });
    expect(() => extractJsonObject("No object here")).toThrow(ProviderError);
  });
});
