export type Vec3 = [number, number, number];

export const OBJECT_TYPES = [
  "house",
  "school",
  "clinic",
  "shelter",
  "road",
  "bridge",
  "barrier",
  "rescue_boat",
  "tree",
  "water",
  "factory",
  "machine",
  "conveyor",
] as const;

export type WorldObjectType = (typeof OBJECT_TYPES)[number];

export const AGENT_ROLES = ["resident", "rescuer", "worker"] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export const AGENT_GOALS = [
  "reach_shelter",
  "avoid_hazard",
  "rescue_resident",
  "operate_machine",
] as const;
export type AgentGoal = (typeof AGENT_GOALS)[number];

export const AGENT_STATUSES = ["idle", "moving", "safe", "in_danger", "rescued"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const OBJECTIVE_KINDS = [
  "evacuate_residents",
  "reach_target",
  "keep_route_open",
  "produce_items",
] as const;
export type ObjectiveKind = (typeof OBJECTIVE_KINDS)[number];

export const EVENT_KINDS = [
  "raise_water",
  "block_route",
  "open_route",
  "add_hazard",
  "trigger_alarm",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const ENVIRONMENTS = ["coastal_town", "factory", "village", "custom"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export type ObjectStatus = "normal" | "blocked" | "damaged" | "active";

export type MetadataValue = string | number | boolean;

export type WorldObject = {
  id: string;
  type: WorldObjectType;
  name: string;
  position: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  status?: ObjectStatus;
  metadata?: Record<string, MetadataValue>;
};

export type WorldAgent = {
  id: string;
  name: string;
  role: AgentRole;
  position: Vec3;
  goal: AgentGoal;
  status: AgentStatus;
  targetId?: string;
  speed: number;
  homeId?: string;
};

export type WorldObjective = {
  id: string;
  description: string;
  kind: ObjectiveKind;
  target?: number;
};

export type WorldEvent = {
  id: string;
  kind: EventKind;
  atTick: number;
  targetId?: string;
  value?: number;
  description?: string;
};

export type ResourceBudget = {
  rescueBoats: number;
  barriers: number;
};

export type SimulationSettings = {
  waterStart: number;
  waterRisePerTick: number;
  waterMax: number;
  tickMs: number;
  barrierDurationTicks: number;
  boatSpeed: number;
  boatCapacity: number;
};

export type ScenePlan = {
  version: 1;
  title: string;
  description: string;
  environment: Environment;
  worldBounds: { width: number; depth: number };
  simulation: SimulationSettings;
  objects: WorldObject[];
  agents: WorldAgent[];
  objectives: WorldObjective[];
  events: WorldEvent[];
  resourceBudget: ResourceBudget;
};

export type RoadStatus = "open" | "blocked" | "flooded" | "protected";

export type SimAgentStatus = "idle" | "moving" | "safe" | "in_danger" | "rescued";

export type SimAgent = {
  id: string;
  name: string;
  role: AgentRole;
  status: SimAgentStatus;
  position: [number, number];
  path: Array<[number, number]>;
  pathIndex: number;
  targetShelterId: string | null;
  preferredShelterId: string | null;
  speed: number;
  lastDangerTick: number | null;
  carriedBy: string | null;
  rescuedByBoat: boolean;
};

export type RoadRuntime = {
  id: string;
  blockedBy: "user" | "event" | null;
  protectedTicks: number;
  flooded: boolean;
  planBlocked: boolean;
};

export type BoatRuntime = {
  id: string;
  name: string;
  position: [number, number];
  home: [number, number];
  targetAgentId: string | null;
  passengers: string[];
  phase: "to_rescue" | "returning" | "idle";
  status: "en_route" | "returning" | "idle";
};

export type BarrierRuntime = {
  id: string;
  roadId: string;
  position: [number, number];
  ticksRemaining: number;
};

export type SimLogKind = "info" | "success" | "warning" | "danger" | "command" | "edit";

export type SimLogEntry = {
  id: string;
  tick: number;
  kind: SimLogKind;
  message: string;
};

export type MissionStatus = "ready" | "running" | "paused" | "success" | "failed";

export type SimulationState = {
  tick: number;
  status: MissionStatus;
  waterLevel: number;
  waterHeld: boolean;
  waterMaxed: boolean;
  peakTick: number | null;
  agents: SimAgent[];
  roads: Record<string, RoadRuntime>;
  boats: BoatRuntime[];
  barriers: BarrierRuntime[];
  resources: ResourceBudget;
  log: SimLogEntry[];
  logSeq: number;
  eventsApplied: string[];
  started: boolean;
  floodCells: Array<[number, number]>;
};

export type Metrics = {
  totalResidents: number;
  safeResidents: number;
  rescuedResidents: number;
  inDangerResidents: number;
  movingResidents: number;
  idleResidents: number;
  totalRoutes: number;
  openRoutes: number;
  blockedRoutes: number;
  floodedRoutes: number;
  protectedRoutes: number;
  boatsRemaining: number;
  barriersRemaining: number;
  boatsUsed: number;
  barriersUsed: number;
  objectiveProgress: number;
  objectiveTarget: number;
  missionStatus: MissionStatus;
  waterLevel: number;
  tick: number;
};

export type PatchOperation =
  | { op: "add_object"; object: WorldObject }
  | {
      op: "update_object";
      id: string;
      changes: Partial<
        Pick<WorldObject, "name" | "position" | "rotation" | "scale" | "status" | "metadata">
      >;
    }
  | { op: "remove_object"; id: string }
  | { op: "add_agent"; agent: WorldAgent }
  | {
      op: "update_agent_goal";
      id: string;
      goal: AgentGoal;
      targetId?: string;
    }
  | { op: "remove_agent"; id: string }
  | { op: "add_event"; event: WorldEvent }
  | {
      op: "update_objective";
      id: string;
      description?: string;
      target?: number;
    }
  | {
      op: "update_meta";
      title?: string;
      description?: string;
      resourceBudget?: Partial<ResourceBudget>;
    };

export type ScenePatch = {
  operations: PatchOperation[];
};

export type PlanSource = "builtin" | "ai" | "local" | "edited" | "fallback";

export type GenerationMode = "ai" | "local" | "fallback";

export type GenerateSceneResponse = {
  plan: ScenePlan;
  mode: GenerationMode;
  notice: string;
  sourceLabel: string;
};

export type EditSceneResponse = {
  plan: ScenePlan;
  mode: GenerationMode;
  operations: PatchOperation[];
  summary: string;
  notice: string;
};

export type ActionResult = {
  state: SimulationState;
  ok: boolean;
  message: string;
};

export type Selection = {
  kind: "object" | "agent" | "boat" | "barrier";
  id: string;
};

export type CameraFocus = {
  target: Vec3;
  nonce: number;
};

export type PlacementTool =
  | { kind: "object"; type: WorldObjectType }
  | { kind: "resident" }
  | { kind: "move"; id: string };
