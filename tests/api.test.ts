import { afterEach, describe, expect, it, vi } from "vitest";
import { getDemoPlan } from "../lib/demo-plan";
import { POST as generateScene } from "../app/api/generate-scene/route";
import { POST as editScene } from "../app/api/edit-scene/route";
import { ScenePlanSchema } from "../lib/scene-schema";

const originalKey = process.env.LLM_API_KEY;
const originalBase = process.env.LLM_BASE_URL;
const originalModel = process.env.LLM_MODEL;
let ipCounter = 0;

function uniqueIp(): string {
  ipCounter += 1;
  return `10.0.0.${ipCounter}`;
}

function generateRequest(prompt: string, ip = uniqueIp()): Request {
  return new Request("http://localhost/api/generate-scene", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ prompt }),
  });
}

function editRequest(
  prompt: string,
  plan: unknown,
  ip = uniqueIp(),
): Request {
  return new Request("http://localhost/api/edit-scene", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ prompt, plan, tick: 12 }),
  });
}

function mockAiResponse(content: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(content) } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey === undefined) delete process.env.LLM_API_KEY;
  else process.env.LLM_API_KEY = originalKey;
  if (originalBase === undefined) delete process.env.LLM_BASE_URL;
  else process.env.LLM_BASE_URL = originalBase;
  if (originalModel === undefined) delete process.env.LLM_MODEL;
  else process.env.LLM_MODEL = originalModel;
});

describe("Scene generation API", () => {
  it("returns a labelled local demo scene when no key is configured", async () => {
    delete process.env.LLM_API_KEY;
    const response = await generateScene(generateRequest("Create a flooded town"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mode).toBe("local");
    expect(data.sourceLabel).toBe("LOCAL DEMO");
    expect(data.notice).toMatch(/No LLM key/i);
    expect(ScenePlanSchema.safeParse(data.plan).success).toBe(true);
    expect(data.plan.title).toBe("Rising Tide");
  });

  it("exercises the AI path with a mocked OpenAI-compatible response", async () => {
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_BASE_URL = "https://example.invalid/v1";
    process.env.LLM_MODEL = "test-model";
    const generated = getDemoPlan();
    generated.title = "Mocked AI Flood Watch";
    mockAiResponse(generated);

    const response = await generateScene(generateRequest("Flood the delta town"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mode).toBe("ai");
    expect(data.plan.title).toBe("Mocked AI Flood Watch");
    expect(ScenePlanSchema.safeParse(data.plan).success).toBe(true);
  });

  it("falls back to the built-in scene when the model returns invalid JSON", async () => {
    process.env.LLM_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "not valid json" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const response = await generateScene(generateRequest("Create a town"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mode).toBe("fallback");
    expect(data.sourceLabel).toBe("BUILT-IN FALLBACK");
    expect(ScenePlanSchema.safeParse(data.plan).success).toBe(true);
  });

  it("rejects overlong prompts and malformed bodies", async () => {
    const overlong = await generateScene(
      generateRequest("x".repeat(1300)),
    );
    expect(overlong.status).toBe(400);
    const malformed = await generateScene(
      new Request("http://localhost/api/generate-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": uniqueIp() },
        body: "{not json",
      }),
    );
    expect(malformed.status).toBe(400);
  });
});

describe("Scene edit API", () => {
  it("applies a local natural-language edit and reports an app-derived summary", async () => {
    delete process.env.LLM_API_KEY;
    const plan = getDemoPlan();
    const response = await editScene(
      editRequest("Add a second shelter to the west and reroute residents", plan),
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mode).toBe("local");
    expect(data.plan.objects).toHaveLength(plan.objects.length + 1);
    expect(data.summary).toContain("Added West Relief Shelter");
    expect(data.summary).toContain("Redirected 12 residents");
    expect(ScenePlanSchema.safeParse(data.plan).success).toBe(true);
  });

  it("returns a helpful 422 for unsupported edits", async () => {
    delete process.env.LLM_API_KEY;
    const response = await editScene(
      editRequest("Spawn a dragon over the clinic", getDemoPlan()),
    );
    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error).toMatch(/local editor/i);
    expect(data.suggestions.length).toBeGreaterThan(0);
  });

  it("validates and applies an AI patch", async () => {
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_BASE_URL = "https://example.invalid/v1";
    mockAiResponse({
      operations: [
        { op: "update_object", id: "road-market", changes: { status: "blocked" } },
      ],
    });
    const plan = getDemoPlan();
    const response = await editScene(editRequest("Close Market Road", plan));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mode).toBe("ai");
    expect(
      data.plan.objects.find((object: { id: string }) => object.id === "road-market")
        ?.status,
    ).toBe("blocked");
    expect(data.summary).toContain("Updated Market Road");
  });
});
