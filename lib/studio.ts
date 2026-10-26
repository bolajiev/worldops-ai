import type { ScenePlan } from "./types";

export type StudioView = "welcome" | "build" | "run";
export type StudioLeftTab = "agent" | "layers";
export type StudioVersionSource = "example" | "ai" | "local" | "manual" | "restore";

export type StudioVersion = {
  id: string;
  label: string;
  summary: string;
  plan: ScenePlan;
  source: StudioVersionSource;
};

export const VERSION_LIMIT = 24;

export function makeVersion(
  plan: ScenePlan,
  label: string,
  summary: string,
  source: StudioVersionSource,
  id: string = crypto.randomUUID(),
): StudioVersion {
  return {
    id,
    label,
    summary,
    source,
    plan: structuredClone(plan),
  };
}

export function appendVersion(
  versions: StudioVersion[],
  version: StudioVersion,
  limit: number = VERSION_LIMIT,
): StudioVersion[] {
  return [...versions, version].slice(-limit);
}

export function nextVersionNumber(versions: StudioVersion[]): number {
  const highest = versions.reduce((max, version) => {
    const numeric = Number(version.label.replace(/[^0-9]/g, ""));
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);
  return highest + 1;
}

export function nextVersionLabel(versions: StudioVersion[]): string {
  return `v${nextVersionNumber(versions)}`;
}

export function sourceLabelFor(source: StudioVersionSource): string {
  if (source === "ai") return "AI";
  if (source === "local") return "Local";
  if (source === "manual") return "Manual";
  if (source === "restore") return "Restored";
  return "Example";
}
