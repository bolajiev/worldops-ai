export const COLORS = {
  ocean: "#082a30",
  oceanDeep: "#051b20",
  sand: "#a08d62",
  sandLight: "#b9a374",
  grass: "#5c704b",
  grassLight: "#6a7d56",
  grassDark: "#4b6041",
  asphalt: "#303634",
  asphaltLight: "#3a413d",
  curb: "#808a7a",
  marking: "#d8b36a",
  houseWalls: ["#d8c7a5", "#cfb795", "#c9c0a4", "#d5b9a0", "#c8c8b2"],
  roofs: ["#a9503c", "#8f4436", "#b35e42", "#7e4b3c", "#a86a4a"],
  water: "#2d95a2",
  waterDeep: "#1a6f7c",
  danger: "#ff6a55",
  safe: "#9ad99a",
  accent: "#ffb45c",
  teal: "#63d2c9",
  shelter: "#5cc4b8",
};

export const MOVING = "#ffb45c";
export const IDLE = "#91a6a2";

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

export function pickFrom<T>(items: readonly T[], seed: string): T {
  return items[hashString(seed) % items.length];
}

export function statusColor(status: string): string {
  if (status === "safe") return COLORS.safe;
  if (status === "in_danger") return COLORS.danger;
  if (status === "rescued") return COLORS.teal;
  if (status === "moving") return MOVING;
  return IDLE;
}
