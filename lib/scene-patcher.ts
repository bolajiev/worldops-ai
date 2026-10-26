import {
  PatchOperationSchema,
  ScenePatchSchema,
  ScenePlanSchema,
  formatZodError,
} from "./scene-schema";
import { humanize } from "./scene-normalize";
import type {
  PatchOperation,
  ScenePatch,
  ScenePlan,
  WorldAgent,
  WorldObject,
} from "./types";

export class PatchError extends Error {
  code: "invalid_patch" | "invalid_reference" | "limit_reached" | "not_found";

  constructor(code: PatchError["code"], message: string) {
    super(message);
    this.name = "PatchError";
    this.code = code;
  }
}

function insideBounds(
  plan: ScenePlan,
  position: [number, number, number],
): boolean {
  const halfWidth = plan.worldBounds.width / 2;
  const halfDepth = plan.worldBounds.depth / 2;
  return (
    position[0] >= -halfWidth &&
    position[0] <= halfWidth &&
    position[2] >= -halfDepth &&
    position[2] <= halfDepth &&
    position[1] >= 0 &&
    position[1] <= 20
  );
}

function allIds(plan: ScenePlan): Set<string> {
  return new Set([
    ...plan.objects.map((object) => object.id),
    ...plan.agents.map((agent) => agent.id),
    ...plan.events.map((event) => event.id),
  ]);
}

function objectById(plan: ScenePlan, id: string): WorldObject | undefined {
  return plan.objects.find((object) => object.id === id);
}

function agentById(plan: ScenePlan, id: string): WorldAgent | undefined {
  return plan.agents.find((agent) => agent.id === id);
}

function isRoute(object: WorldObject | undefined): boolean {
  return object?.type === "road" || object?.type === "bridge";
}

function assertPosition(plan: ScenePlan, position: [number, number, number], label: string): void {
  if (!insideBounds(plan, position)) {
    throw new PatchError(
      "invalid_patch",
      `${label} would fall outside the world bounds.`,
    );
  }
}

function assertScale(
  scale: [number, number, number] | undefined,
  type: string,
): void {
  if (!scale) return;
  const horizontalLimit =
    type === "road" || type === "bridge" || type === "water" || type === "conveyor"
      ? 120
      : 40;
  if (
    scale.some((value) => !Number.isFinite(value)) ||
    scale[0] < 0.2 ||
    scale[0] > horizontalLimit ||
    scale[1] < 0.05 ||
    scale[1] > 20 ||
    scale[2] < 0.2 ||
    scale[2] > horizontalLimit
  ) {
    throw new PatchError("invalid_patch", "Object scale is outside supported limits.");
  }
}

function applyOperation(plan: ScenePlan, operation: PatchOperation): void {
  switch (operation.op) {
    case "add_object": {
      if (plan.objects.length >= 100) {
        throw new PatchError("limit_reached", "This scene already has 100 objects.");
      }
      if (allIds(plan).has(operation.object.id)) {
        throw new PatchError(
          "invalid_patch",
          `"${operation.object.id}" is already used by another entity.`,
        );
      }
      assertPosition(plan, operation.object.position, operation.object.name);
      assertScale(operation.object.scale, operation.object.type);
      plan.objects.push(structuredClone(operation.object));
      return;
    }
    case "update_object": {
      const object = objectById(plan, operation.id);
      if (!object) {
        throw new PatchError("not_found", `Object "${operation.id}" does not exist.`);
      }
      if (operation.changes.position) {
        assertPosition(plan, operation.changes.position, object.name);
        object.position = [...operation.changes.position];
      }
      assertScale(operation.changes.scale, object.type);
      if (operation.changes.scale) object.scale = [...operation.changes.scale];
      if (operation.changes.rotation) object.rotation = [...operation.changes.rotation];
      if (operation.changes.name) object.name = operation.changes.name;
      if (operation.changes.status) object.status = operation.changes.status;
      if (operation.changes.metadata) {
        object.metadata = { ...object.metadata, ...operation.changes.metadata };
      }
      return;
    }
    case "remove_object": {
      const object = objectById(plan, operation.id);
      if (!object) {
        throw new PatchError("not_found", `Object "${operation.id}" does not exist.`);
      }
      if (object.type === "shelter") {
        const remainingShelters = plan.objects.filter(
          (entry) =>
            entry.type === "shelter" &&
            entry.id !== object.id &&
            entry.metadata?.rescueOnly !== true,
        );
        if (remainingShelters.length === 0) {
          throw new PatchError(
            "invalid_patch",
            "A scene needs at least one evacuation shelter.",
          );
        }
      }
      plan.objects = plan.objects.filter((entry) => entry.id !== object.id);
      plan.events = plan.events.filter((event) => event.targetId !== object.id);
      for (const agent of plan.agents) {
        if (agent.targetId === object.id) agent.targetId = undefined;
        if (agent.homeId === object.id) agent.homeId = undefined;
      }
      return;
    }
    case "add_agent": {
      if (plan.agents.length >= 30) {
        throw new PatchError("limit_reached", "This scene already has 30 agents.");
      }
      if (allIds(plan).has(operation.agent.id)) {
        throw new PatchError(
          "invalid_patch",
          `"${operation.agent.id}" is already used by another entity.`,
        );
      }
      assertPosition(plan, operation.agent.position, operation.agent.name);
      if (operation.agent.targetId) {
        const target = objectById(plan, operation.agent.targetId);
        if (!target) {
          throw new PatchError(
            "invalid_reference",
            `Agent target "${operation.agent.targetId}" does not exist.`,
          );
        }
        if (operation.agent.goal === "reach_shelter" && target.type !== "shelter") {
          throw new PatchError(
            "invalid_reference",
            "An evacuation goal must target a shelter.",
          );
        }
      }
      if (operation.agent.homeId && !objectById(plan, operation.agent.homeId)) {
        throw new PatchError("invalid_reference", "Agent home building does not exist.");
      }
      plan.agents.push(structuredClone(operation.agent));
      return;
    }
    case "update_agent_goal": {
      const agent = agentById(plan, operation.id);
      if (!agent) {
        throw new PatchError("not_found", `Agent "${operation.id}" does not exist.`);
      }
      if (operation.targetId) {
        const target = objectById(plan, operation.targetId);
        const targetAgent = agentById(plan, operation.targetId);
        if (!target && !targetAgent) {
          throw new PatchError(
            "invalid_reference",
            `Target "${operation.targetId}" does not exist.`,
          );
        }
        if (operation.goal === "reach_shelter" && target?.type !== "shelter") {
          throw new PatchError(
            "invalid_reference",
            "A reach_shelter goal must target a shelter.",
          );
        }
      }
      agent.goal = operation.goal;
      agent.targetId = operation.targetId;
      return;
    }
    case "remove_agent": {
      const agent = agentById(plan, operation.id);
      if (!agent) {
        throw new PatchError("not_found", `Agent "${operation.id}" does not exist.`);
      }
      if (agent.role === "resident") {
        const otherResidents = plan.agents.filter(
          (entry) => entry.role === "resident" && entry.id !== agent.id,
        );
        if (otherResidents.length === 0) {
          throw new PatchError("invalid_patch", "A scene needs at least one resident.");
        }
      }
      plan.agents = plan.agents.filter((entry) => entry.id !== agent.id);
      for (const other of plan.agents) {
        if (other.targetId === agent.id) other.targetId = undefined;
      }
      return;
    }
    case "add_event": {
      if (plan.events.length >= 40) {
        throw new PatchError("limit_reached", "This scene already has 40 events.");
      }
      if (allIds(plan).has(operation.event.id)) {
        throw new PatchError(
          "invalid_patch",
          `Event ID "${operation.event.id}" is already in use.`,
        );
      }
      if (operation.event.targetId) {
        const target = objectById(plan, operation.event.targetId);
        if (!target) {
          throw new PatchError(
            "invalid_reference",
            `Event target "${operation.event.targetId}" does not exist.`,
          );
        }
        if (
          (operation.event.kind === "block_route" ||
            operation.event.kind === "open_route") &&
          !isRoute(target)
        ) {
          throw new PatchError(
            "invalid_reference",
            "Route events must target a road or bridge.",
          );
        }
      }
      plan.events.push(structuredClone(operation.event));
      return;
    }
    case "update_objective": {
      const objective = plan.objectives.find((entry) => entry.id === operation.id);
      if (!objective) {
        throw new PatchError("not_found", `Objective "${operation.id}" does not exist.`);
      }
      if (operation.description !== undefined) objective.description = operation.description;
      if (operation.target !== undefined) objective.target = operation.target;
      return;
    }
    case "update_meta": {
      if (operation.title !== undefined) plan.title = operation.title;
      if (operation.description !== undefined) plan.description = operation.description;
      if (operation.resourceBudget) {
        plan.resourceBudget = {
          rescueBoats:
            operation.resourceBudget.rescueBoats ?? plan.resourceBudget.rescueBoats,
          barriers:
            operation.resourceBudget.barriers ?? plan.resourceBudget.barriers,
        };
      }
      return;
    }
    default: {
      const exhaustive: never = operation;
      throw new PatchError(
        "invalid_patch",
        `Unsupported operation ${(exhaustive as { op?: string }).op ?? "unknown"}.`,
      );
    }
  }
}

function validateFinalPlan(plan: ScenePlan): void {
  if (!plan.objects.some((object) => object.type === "road")) {
    throw new PatchError("invalid_patch", "A scene needs at least one road.");
  }
  if (
    !plan.objects.some(
      (object) =>
        object.type === "shelter" && object.metadata?.rescueOnly !== true,
    )
  ) {
    throw new PatchError("invalid_patch", "A scene needs an evacuation shelter.");
  }
  if (!plan.agents.some((agent) => agent.role === "resident")) {
    throw new PatchError("invalid_patch", "A scene needs at least one resident.");
  }
  const parsed = ScenePlanSchema.safeParse(plan);
  if (!parsed.success) {
    throw new PatchError(
      "invalid_patch",
      `The edited scene is invalid: ${formatZodError(parsed.error)}`,
    );
  }
}

export function summarizePatch(
  before: ScenePlan,
  after: ScenePlan,
  operations: PatchOperation[],
): string {
  const objectName = (id: string): string =>
    after.objects.find((object) => object.id === id)?.name ??
    before.objects.find((object) => object.id === id)?.name ??
    id;
  const agentName = (id: string): string =>
    after.agents.find((agent) => agent.id === id)?.name ??
    before.agents.find((agent) => agent.id === id)?.name ??
    id;

  const parts: string[] = [];
  const redirects = new Map<string, string[]>();

  for (const operation of operations) {
    switch (operation.op) {
      case "add_object": {
        parts.push(`Added ${operation.object.name} (${humanize(operation.object.type).toLowerCase()}).`);
        break;
      }
      case "update_object": {
        const object = objectById(after, operation.id);
        parts.push(`Updated ${object?.name ?? operation.id}.`);
        break;
      }
      case "remove_object": {
        const object = objectById(before, operation.id);
        parts.push(`Removed ${object?.name ?? operation.id}.`);
        break;
      }
      case "add_agent": {
        parts.push(`Added resident ${operation.agent.name}.`);
        break;
      }
      case "update_agent_goal": {
        const target = operation.targetId ? objectName(operation.targetId) : null;
        const key = target ?? "their assigned goal";
        const group = redirects.get(key) ?? [];
        group.push(agentName(operation.id));
        redirects.set(key, group);
        break;
      }
      case "remove_agent": {
        const agent = agentById(before, operation.id);
        parts.push(`Removed ${agent?.name ?? operation.id}.`);
        break;
      }
      case "add_event": {
        parts.push(`Scheduled ${humanize(operation.event.kind).toLowerCase()}.`);
        break;
      }
      case "update_objective": {
        parts.push("Updated the mission objective.");
        break;
      }
      case "update_meta": {
        parts.push("Updated the world details.");
        break;
      }
    }
  }

  for (const [target, names] of redirects) {
    if (names.length === 1) {
      parts.push(`Redirected ${names[0]} to ${target}.`);
    } else {
      parts.push(`Redirected ${names.length} residents to ${target}.`);
    }
  }

  return parts.join(" ");
}

export function applyScenePatch(
  plan: ScenePlan,
  patchInput: ScenePatch | unknown,
): { plan: ScenePlan; operations: PatchOperation[]; summary: string } {
  const parsedPatch = ScenePatchSchema.safeParse(patchInput);
  if (!parsedPatch.success) {
    throw new PatchError(
      "invalid_patch",
      `Patch is invalid: ${formatZodError(parsedPatch.error)}`,
    );
  }

  const before = plan;
  const next = structuredClone(plan);

  for (const rawOperation of parsedPatch.data.operations) {
    const parsedOperation = PatchOperationSchema.safeParse(rawOperation);
    if (!parsedOperation.success) {
      throw new PatchError(
        "invalid_patch",
        `Operation is invalid: ${formatZodError(parsedOperation.error)}`,
      );
    }
    applyOperation(next, parsedOperation.data as PatchOperation);
  }

  validateFinalPlan(next);
  const summary = summarizePatch(before, next, parsedPatch.data.operations as PatchOperation[]);
  return { plan: next, operations: parsedPatch.data.operations as PatchOperation[], summary };
}
