import type { ScenePlan } from "./types";

export const EAST_PLATEAU = 0.72;
export const WEST_PLATEAU = 1.4;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * A stylized, deterministic elevation field. The west is high ground around the
 * hilltop shelter; the east falls away to the coast. Water rises from the east,
 * so low coastal cells are the first to flood.
 */
export function terrainElevation(plan: ScenePlan, x: number, z: number): number {
  const { width } = plan.worldBounds;
  const nx = clamp01((x + width / 2) / width);
  // A broad low eastern shelf, rising to high ground in the west.
  const rawRise = clamp01((0.82 - nx) / 0.82);
  const smoothRise = rawRise * rawRise * (3 - 2 * rawRise);
  let elevation =
    EAST_PLATEAU + (WEST_PLATEAU - EAST_PLATEAU) * smoothRise;

  const shelfStart = 0.9;
  if (nx > shelfStart) {
    const t = (nx - shelfStart) / (1 - shelfStart);
    elevation = elevation * (1 - t * t) + 0.12 * (t * t);
  }

  elevation += 0.022 * Math.sin(x * 0.31 + z * 0.17);
  elevation += 0.014 * Math.cos(z * 0.29 - x * 0.11);

  return Math.max(0.05, elevation);
}

export function waterRiseTicks(plan: ScenePlan, targetLevel: number): number {
  const { waterStart, waterRisePerTick } = plan.simulation;
  if (waterRisePerTick <= 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.ceil((targetLevel - waterStart) / waterRisePerTick));
}

export function floodPercent(plan: ScenePlan, level: number): number {
  const { waterStart, waterMax } = plan.simulation;
  if (waterMax <= waterStart) return 0;
  return clamp01((level - waterStart) / (waterMax - waterStart)) * 100;
}
