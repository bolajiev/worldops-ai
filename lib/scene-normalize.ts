import { ScenePlanDraftSchema, ScenePlanSchema, formatZodError } from "./scene-schema";
import type {
  AgentGoal,
  AgentRole,
  AgentStatus,
  ObjectStatus,
  PatchOperation,
  ScenePlan,
  SimulationSettings,
  Vec3,
  WorldAgent,
  WorldEvent,
  WorldObject,
  WorldObjectType,
  WorldObjective,
} from "./types";

const OBJECT_LIMIT = 100;
const AGENT_LIMIT = 30;

const DEFAULT_SCALE: Record<WorldObjectType, Vec3> = {
  house: [4.2, 3.4, 4.2],
  school: [8.4, 4.2, 5.4],
  clinic: [5.6, 3.8, 5.2],
  shelter: [4.6, 3, 4.6],
  road: [18, 0.12, 4.6],
  bridge: [8, 0.24, 4.6],
  barrier: [4, 1, 1],
  rescue_boat: [2.4, 0.8, 1.2],
  tree: [1.8, 3.2, 1.8],
  water: [8, 0.08, 8],
  factory: [10, 5, 7],
  machine: [2.2, 1.8, 2.2],
  conveyor: [6, 0.6, 1.4],
};

const DEFAULT_SIMULATION: SimulationSettings = {
  waterStart: 0.12,
  waterRisePerTick: 0.011,
  waterMax: 1.3,
  tickMs: 380,
  barrierDurationTicks: 420,
  boatSpeed: 2.4,
  boatCapacity: 2,
};

const RESIDENT_NAMES = [
  "Amara",
  "Tobi",
  "Ngozi",
  "Emeka",
  "Zainab",
  "Kofi",
  "Ada",
  "Femi",
  "Bisi",
  "Chidi",
  "Halima",
  "Ife",
  "Sade",
  "Uche",
  "Yemi",
  "Nneka",
];

const ROLE_SET = new Set<AgentRole>(["resident", "rescuer", "worker"]);
const GOAL_SET = new Set<AgentGoal>([
  "reach_shelter",
  "avoid_hazard",
  "rescue_resident",
  "operate_machine",
]);
const STATUS_SET = new Set<AgentStatus>(["idle", "moving", "safe", "in_danger", "rescued"]);
const OBJECT_STATUS_SET = new Set<ObjectStatus>(["normal", "blocked", "damaged", "active"]);

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function sanitizeText(value: unknown, fallback: string, max = 80): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  return cleaned || fallback;
}

function sanitizeId(value: unknown, fallback: string, used: Set<string>): string {
  const base = typeof value === "string" ? value : "";
  let candidate = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  if (!candidate || !/^[a-z0-9]/.test(candidate)) candidate = fallback;
  let unique = candidate;
  let suffix = 2;
  while (used.has(unique)) {
    unique = `${candidate}-${suffix}`;
    suffix += 1;
  }
  used.add(unique);
  return unique;
}

function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> | undefined {
  if (!metadata) return undefined;
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(metadata).slice(0, 12)) {
    const safeKey = sanitizeText(key, "", 40);
    if (!safeKey) continue;
    if (typeof value === "string") result[safeKey] = sanitizeText(value, "", 120);
    else if (typeof value === "number" && Number.isFinite(value)) {
      result[safeKey] = clamp(value, -1_000_000, 1_000_000);
    } else if (typeof value === "boolean") result[safeKey] = value;
  }
  return Object.keys(result).length ? result : undefined;
}

function normalizeVec3(value: Vec3, fallbackY: number): Vec3 {
  return [value[0], fallbackY, value[2]];
}

export type NormalizeResult = {
  plan: ScenePlan;
  warnings: string[];
};

export function normalizeScenePlan(raw: unknown): NormalizeResult {
  const draft = ScenePlanDraftSchema.parse(raw);
  const warnings: string[] = [];
  const usedIds = new Set<string>();

  const width = clamp(draft.worldBounds?.width ?? 72, 30, 110);
  const depth = clamp(draft.worldBounds?.depth ?? 52, 30, 110);
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  const rawObjects = draft.objects.slice(0, OBJECT_LIMIT);
  if (draft.objects.length > OBJECT_LIMIT) {
    warnings.push(`Scene capped at ${OBJECT_LIMIT} objects.`);
  }

  const objects: WorldObject[] = rawObjects.map((object, index) => {
    const type = object.type;
    const id = sanitizeId(object.id, `${type}-${index + 1}`, usedIds);
    const horizontalLimit =
      type === "road" || type === "bridge" || type === "water" || type === "conveyor"
        ? 120
        : 40;
    const scale = object.scale
      ? ([
          clamp(object.scale[0], 0.2, horizontalLimit),
          clamp(object.scale[1], 0.05, 20),
          clamp(object.scale[2], 0.2, horizontalLimit),
        ] as Vec3)
      : DEFAULT_SCALE[type];

    const metadata = sanitizeMetadata(object.metadata);

    return {
      id,
      type,
      name: sanitizeText(object.name, humanize(type), 80),
      position: [
        clamp(object.position[0], -halfWidth + 1, halfWidth - 1),
        clamp(object.position[1], 0, 20),
        clamp(object.position[2], -halfDepth + 1, halfDepth - 1),
      ],
      rotation: object.rotation ? normalizeVec3(object.rotation, 0) : undefined,
      scale,
      status: object.status && OBJECT_STATUS_SET.has(object.status) ? object.status : "normal",
      metadata,
    };
  });

  const roads = objects.filter((object) => object.type === "road");
  if (roads.length === 0 && objects.length < OBJECT_LIMIT) {
    objects.push({
      id: sanitizeId("road-main", "road-main", usedIds),
      type: "road",
      name: "Main Road",
      position: [0, 0.02, 0],
      scale: [Math.min(width * 0.8, 56), 0.12, 4.6],
      status: "normal",
    });
    warnings.push("No road was supplied; added a main road.");
  }

  const shelters = objects.filter((object) => object.type === "shelter");
  if (shelters.length === 0 && objects.length < OBJECT_LIMIT) {
    objects.push({
      id: sanitizeId("shelter-main", "shelter-main", usedIds),
      type: "shelter",
      name: "Hilltop Shelter",
      position: [-width * 0.3, 0, -depth * 0.25],
      scale: DEFAULT_SCALE.shelter,
      status: "normal",
    });
    warnings.push("No shelter was supplied; added one on high ground.");
  }

  const rawAgents = (draft.agents ?? []).slice(0, AGENT_LIMIT);
  if ((draft.agents?.length ?? 0) > AGENT_LIMIT) {
    warnings.push(`Scene capped at ${AGENT_LIMIT} agents.`);
  }

  const objectIds = new Set(objects.map((object) => object.id));
  const agents: WorldAgent[] = rawAgents.map((agent, index) => {
    const role: AgentRole = agent.role && ROLE_SET.has(agent.role) ? agent.role : "resident";
    const goal: AgentGoal = agent.goal && GOAL_SET.has(agent.goal) ? agent.goal : "reach_shelter";
    const status: AgentStatus =
      agent.status && STATUS_SET.has(agent.status) ? agent.status : "idle";
    let targetId = agent.targetId;
    if (targetId && !objectIds.has(targetId)) targetId = undefined;
    let homeId = agent.homeId;
    if (homeId && !objectIds.has(homeId)) homeId = undefined;
    const fallbackName =
      role === "resident"
        ? RESIDENT_NAMES[index % RESIDENT_NAMES.length]
        : role === "rescuer"
          ? `Rescue ${index + 1}`
          : `Worker ${index + 1}`;
    return {
      id: sanitizeId(agent.id, `${role}-${index + 1}`, usedIds),
      name: sanitizeText(agent.name, fallbackName, 60),
      role,
      position: [
        clamp(agent.position[0], -halfWidth + 1, halfWidth - 1),
        clamp(agent.position[1], 0, 3),
        clamp(agent.position[2], -halfDepth + 1, halfDepth - 1),
      ],
      goal,
      status,
      targetId,
      speed: clamp(agent.speed ?? 0.8, 0.25, 2.5),
      homeId,
    };
  });

  if (!agents.some((agent) => agent.role === "resident") && agents.length < AGENT_LIMIT) {
    const shelter = objects.find((object) => object.type === "shelter");
    const baseX = clamp(-width * 0.08, -halfWidth + 3, halfWidth - 3);
    const baseZ = clamp(Math.min(halfDepth - 4, 6), -halfDepth + 3, halfDepth - 3);
    for (let index = 0; index < 4 && agents.length < AGENT_LIMIT; index += 1) {
      agents.push({
        id: sanitizeId(`resident-${index + 1}`, `resident-${index + 1}`, usedIds),
        name: RESIDENT_NAMES[index % RESIDENT_NAMES.length],
        role: "resident",
        position: [baseX + (index % 2) * 2.5, 0, baseZ + Math.floor(index / 2) * 2.5],
        goal: "reach_shelter",
        status: "idle",
        targetId: shelter?.id,
        speed: 0.8,
        homeId: undefined,
      });
    }
    warnings.push("No residents were supplied; added four evacuees.");
  }

  const residentCount = agents.filter((agent) => agent.role === "resident").length;

  const rawEvents = (draft.events ?? []).slice(0, 40);
  const events: WorldEvent[] = [];
  for (const [index, event] of rawEvents.entries()) {
    let targetId = event.targetId;
    if (targetId && !objectIds.has(targetId)) {
      if (event.kind === "block_route" || event.kind === "open_route" || event.kind === "add_hazard") {
        warnings.push(`Dropped event "${event.id ?? index}" with unknown target.`);
        continue;
      }
      targetId = undefined;
    }
    events.push({
      id: sanitizeId(event.id, `event-${index + 1}`, usedIds),
      kind: event.kind,
      atTick: Math.round(clamp(event.atTick ?? 0, 0, 10000)),
      targetId,
      value:
        event.value === undefined ? undefined : clamp(event.value, 0, 5),
      description: event.description
        ? sanitizeText(event.description, "", 120)
        : undefined,
    });
  }

  const rawObjectives = (draft.objectives ?? []).slice(0, 8);
  const objectives: WorldObjective[] = rawObjectives.map((objective, index) => ({
    id: sanitizeId(objective.id, `objective-${index + 1}`, usedIds),
    description: sanitizeText(
      objective.description,
      "Evacuate residents to a shelter before the flood cuts off the town.",
      160,
    ),
    kind: objective.kind ?? "evacuate_residents",
    target:
      objective.target === undefined
        ? objective.kind === "evacuate_residents"
          ? residentCount
          : undefined
        : Math.round(clamp(objective.target, 1, 200)),
  }));

  if (objectives.length === 0) {
    objectives.push({
      id: sanitizeId("objective-evacuate", "objective-evacuate", usedIds),
      description: "Evacuate every resident to a shelter before the flood overtakes the town.",
      kind: "evacuate_residents",
      target: residentCount,
    });
  }
  for (const objective of objectives) {
    if (objective.kind === "evacuate_residents" && objective.target === undefined) {
      objective.target = residentCount;
    }
  }

  const simulation: SimulationSettings = {
    waterStart: clamp(draft.simulation?.waterStart ?? DEFAULT_SIMULATION.waterStart, 0, 2),
    waterRisePerTick: clamp(
      draft.simulation?.waterRisePerTick ?? DEFAULT_SIMULATION.waterRisePerTick,
      0,
      0.15,
    ),
    waterMax: clamp(draft.simulation?.waterMax ?? DEFAULT_SIMULATION.waterMax, 0.3, 3.5),
    tickMs: Math.round(clamp(draft.simulation?.tickMs ?? DEFAULT_SIMULATION.tickMs, 150, 2000)),
    barrierDurationTicks: Math.round(
      clamp(
        draft.simulation?.barrierDurationTicks ?? DEFAULT_SIMULATION.barrierDurationTicks,
        20,
        1200,
      ),
    ),
    boatSpeed: clamp(draft.simulation?.boatSpeed ?? DEFAULT_SIMULATION.boatSpeed, 0.8, 6),
    boatCapacity: Math.round(
      clamp(draft.simulation?.boatCapacity ?? DEFAULT_SIMULATION.boatCapacity, 1, 3),
    ),
  };
  if (simulation.waterMax <= simulation.waterStart + 0.1) {
    simulation.waterMax = Math.min(3.5, simulation.waterStart + 0.25);
    warnings.push("Flood ceiling raised to create a usable simulation.");
  }

  const plan: ScenePlan = {
    version: 1,
    title: sanitizeText(draft.title, "Untitled Flood Watch", 80),
    description: sanitizeText(
      draft.description,
      "A flood-threatened settlement. Move residents to high ground before the water closes the routes.",
      400,
    ),
    environment: draft.environment ?? "coastal_town",
    worldBounds: { width, depth },
    simulation,
    objects: objects.slice(0, OBJECT_LIMIT),
    agents: agents.slice(0, AGENT_LIMIT),
    objectives,
    events,
    resourceBudget: {
      rescueBoats: Math.round(clamp(draft.resourceBudget?.rescueBoats ?? 2, 0, 10)),
      barriers: Math.round(clamp(draft.resourceBudget?.barriers ?? 3, 0, 10)),
    },
  };

  const parsed = ScenePlanSchema.safeParse(plan);
  if (!parsed.success) {
    throw new Error(`Scene could not be normalized: ${formatZodError(parsed.error)}`);
  }

  const referencedAgents = new Set(agents.map((agent) => agent.id));
  for (const agent of parsed.data.agents) {
    if (agent.targetId && !objectIds.has(agent.targetId) && !referencedAgents.has(agent.targetId)) {
      throw new Error(`Scene reference ${agent.targetId} could not be resolved`);
    }
  }

  return { plan: parsed.data, warnings };
}

export function humanize(value: string): string {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function clampOperationPosition(op: PatchOperation, plan: ScenePlan): PatchOperation {
  const halfWidth = plan.worldBounds.width / 2 - 1;
  const halfDepth = plan.worldBounds.depth / 2 - 1;
  if (op.op === "add_object") {
    return {
      ...op,
      object: {
        ...op.object,
        position: [
          clamp(op.object.position[0], -halfWidth, halfWidth),
          0,
          clamp(op.object.position[2], -halfDepth, halfDepth),
        ],
      },
    };
  }
  if (op.op === "add_agent") {
    return {
      ...op,
      agent: {
        ...op.agent,
        position: [
          clamp(op.agent.position[0], -halfWidth, halfWidth),
          0,
          clamp(op.agent.position[2], -halfDepth, halfDepth),
        ],
      },
    };
  }
  return op;
}
