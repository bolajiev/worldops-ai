import type {
  PatchOperation,
  PlacementTool,
  ScenePlan,
  Vec3,
  WorldAgent,
  WorldObject,
  WorldObjectType,
} from "./types";

export const BUILD_PALETTE: Array<{
  type: WorldObjectType;
  label: string;
  hint: string;
}> = [
  { type: "house", label: "House", hint: "Place a home for residents" },
  { type: "shelter", label: "Shelter", hint: "Add an evacuation destination" },
  { type: "tree", label: "Tree", hint: "Add greenery" },
  { type: "road", label: "Road", hint: "Add a walkable route" },
  { type: "bridge", label: "Bridge", hint: "Cross water or a canal" },
  { type: "clinic", label: "Clinic", hint: "Add a medical building" },
  { type: "school", label: "School", hint: "Add a community building" },
];

const DEFAULT_SCALE: Record<string, Vec3> = {
  house: [4.2, 3.4, 4.2],
  school: [8.4, 4.2, 5.4],
  clinic: [5.6, 3.8, 5.2],
  shelter: [4.8, 3, 4.8],
  road: [12, 0.12, 4.6],
  bridge: [8, 0.32, 5],
  barrier: [4, 1, 1],
  rescue_boat: [2.4, 0.8, 1.2],
  tree: [1.9, 3.4, 1.9],
  water: [8, 0.08, 8],
  factory: [10, 5, 7],
  machine: [2.2, 1.8, 2.2],
  conveyor: [6, 0.6, 1.4],
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safePosition(plan: ScenePlan, x: number, z: number): [number, number] {
  const halfWidth = plan.worldBounds.width / 2 - 1.5;
  const halfDepth = plan.worldBounds.depth / 2 - 1.5;
  return [clamp(x, -halfWidth, halfWidth), clamp(z, -halfDepth, halfDepth)];
}

export function defaultScale(type: WorldObjectType): Vec3 {
  return DEFAULT_SCALE[type] ?? [4, 3, 4];
}

export function nextEntityId(plan: ScenePlan, base: string): string {
  const used = new Set([
    ...plan.objects.map((object) => object.id),
    ...plan.agents.map((agent) => agent.id),
    ...plan.events.map((event) => event.id),
  ]);
  if (!used.has(base)) return base;
  let index = 2;
  while (used.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function displayName(type: WorldObjectType): string {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
}

export function createPlacedObject(
  plan: ScenePlan,
  type: WorldObjectType,
  x: number,
  z: number,
): WorldObject {
  const [safeX, safeZ] = safePosition(plan, x, z);
  const scale = defaultScale(type);
  const metadata: Record<string, string | number | boolean> = {
    editor: "direct",
  };
  if (type === "shelter") metadata.capacity = 20;
  if (type === "bridge") metadata.clearance = 0.55;
  if (type === "road") metadata.lane = "built";
  return {
    id: nextEntityId(plan, `${type}-built`),
    type,
    name: `${displayName(type)} ${plan.objects.filter((object) => object.type === type).length + 1}`,
    position: [safeX, type === "bridge" ? 0.16 : 0.02, safeZ],
    scale,
    status: "normal",
    metadata,
  };
}

export function createPlacedResident(
  plan: ScenePlan,
  x: number,
  z: number,
): WorldAgent {
  const [safeX, safeZ] = safePosition(plan, x, z);
  const names = ["Ada", "Kofi", "Nia", "Tunde", "Zuri", "Femi", "Sade", "Ayo"];
  const index = plan.agents.length % names.length;
  return {
    id: nextEntityId(plan, "resident-built"),
    name: `${names[index]} ${plan.agents.length + 1}`,
    role: "resident",
    position: [safeX, 0, safeZ],
    goal: "reach_shelter",
    status: "idle",
    speed: 0.8,
  };
}

export function createDuplicateObject(
  plan: ScenePlan,
  object: WorldObject,
): WorldObject {
  const [x, z] = safePosition(plan, object.position[0] + 1.2, object.position[2] + 1.2);
  return {
    ...structuredClone(object),
    id: nextEntityId(plan, `${object.type}-copy`),
    name: `${object.name} copy`,
    position: [x, object.position[1], z],
  };
}

export function operationsForPlacement(
  plan: ScenePlan,
  tool: PlacementTool,
  x: number,
  z: number,
): { operations: PatchOperation[]; selected: { kind: "object" | "agent"; id: string } } | null {
  if (tool.kind === "move") {
    const object = plan.objects.find((entry) => entry.id === tool.id);
    if (!object) return null;
    const [safeX, safeZ] = safePosition(plan, x, z);
    return {
      operations: [
        {
          op: "update_object",
          id: object.id,
          changes: { position: [safeX, object.position[1], safeZ] },
        },
      ],
      selected: { kind: "object", id: object.id },
    };
  }
  if (tool.kind === "resident") {
    const agent = createPlacedResident(plan, x, z);
    return {
      operations: [{ op: "add_agent", agent }],
      selected: { kind: "agent", id: agent.id },
    };
  }
  const object = createPlacedObject(plan, tool.type, x, z);
  return {
    operations: [{ op: "add_object", object }],
    selected: { kind: "object", id: object.id },
  };
}
