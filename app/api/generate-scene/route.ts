import { ZodError } from "zod";
import { getDemoPlan } from "@/lib/demo-plan";
import { buildGenerateMessages } from "@/lib/prompts";
import {
  callChat,
  extractJsonObject,
  getSessionId,
  isAiConfigured,
} from "@/lib/provider";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { normalizeScenePlan } from "@/lib/scene-normalize";
import { formatZodError, GenerateRequestSchema } from "@/lib/scene-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const jsonHeaders = { "Cache-Control": "no-store" };

function errorMessage(error: unknown): string {
  if (error instanceof ZodError) return formatZodError(error);
  if (error instanceof Error) return error.message.slice(0, 400);
  return "Unknown scene generation error";
}

export async function POST(request: Request): Promise<Response> {
  const limit = rateLimit(clientKey(request, "generate"), 8, 60_000);
  if (!limit.allowed) {
    return Response.json(
      { error: `Too many generations. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429, headers: jsonHeaders },
    );
  }

  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return Response.json({ error: "Could not read the request." }, { status: 400, headers: jsonHeaders });
  }
  if (bodyText.length > 20_000) {
    return Response.json({ error: "Request is too large." }, { status: 413, headers: jsonHeaders });
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400, headers: jsonHeaders });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: formatZodError(parsed.error) },
      { status: 400, headers: jsonHeaders },
    );
  }

  if (!isAiConfigured()) {
    return Response.json(
      {
        plan: getDemoPlan(),
        mode: "local",
        sourceLabel: "LOCAL DEMO",
        notice:
          "No LLM key is configured. WorldOps loaded its built-in Rising Tide scenario; your prompt was not sent to an AI model. You can still run, intervene and edit this world.",
      },
      { headers: jsonHeaders },
    );
  }

  const sessionId = getSessionId(request);
  let correction: string | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await callChat(
        buildGenerateMessages(parsed.data.prompt, correction),
        sessionId,
      );
      const raw = extractJsonObject(text);
      const { plan, warnings } = normalizeScenePlan(raw);
      return Response.json(
        {
          plan,
          mode: "ai",
          sourceLabel: "AI GENERATED",
          notice: warnings.length
            ? `Scene validated. ${warnings.join(" ")}`
            : "Scene generated and validated against the WorldOps schema.",
        },
        { headers: jsonHeaders },
      );
    } catch (error) {
      lastError = error;
      correction = errorMessage(error);
      console.error(
        `[generate-scene] attempt ${attempt + 1} failed: ${correction}`,
      );
    }
  }

  console.error("[generate-scene] falling back to built-in scenario", lastError);
  return Response.json(
    {
      plan: getDemoPlan(),
      mode: "fallback",
      sourceLabel: "BUILT-IN FALLBACK",
      notice:
        "The AI scene service was unavailable or returned an invalid plan. WorldOps loaded the built-in Rising Tide scenario so you can keep playing.",
    },
    { headers: jsonHeaders },
  );
}
