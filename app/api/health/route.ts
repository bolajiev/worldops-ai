import { getAiModel, isAiConfigured } from "@/lib/provider";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const ai = isAiConfigured();
  return Response.json(
    {
      ok: true,
      aiConfigured: ai,
      mode: ai ? "ai" : "local",
      model: ai ? getAiModel() : null,
      ruleset: "flood_evacuation",
      version: "1.0.0",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
