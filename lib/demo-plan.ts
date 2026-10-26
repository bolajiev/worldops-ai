import demoJson from "../data/flood-rescue-demo.json";
import { normalizeScenePlan } from "./scene-normalize";
import type { ScenePlan } from "./types";

export const DEMO_PROMPT =
  "Create a low-lying coastal town with a school, a clinic, six houses, a canal and causeway, twelve residents and a hilltop shelter. A flood is approaching from the east. Make evacuation the objective.";

let cached: ScenePlan | null = null;

export function getDemoPlan(): ScenePlan {
  if (!cached) {
    cached = normalizeScenePlan(demoJson).plan;
  }
  return structuredClone(cached);
}
