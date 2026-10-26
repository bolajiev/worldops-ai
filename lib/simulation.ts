import type {
  ActionResult,
  RoadRuntime,
  ScenePlan,
  SimAgent,
  SimLogKind,
  SimulationState,
  WorldObject,
} from "./types";
import {
  buildNavigationGrid,
  cellAt,
  findPath,
  nearestWalkableCell,
  shelterGoalCell,
  type NavGrid,
} from "./navigation";

const LOG_LIMIT = 90;

function cloneState(state: SimulationState): SimulationState {
  return structuredClone(state);
}

function appendLog(
  state: SimulationState,
  kind: SimLogKind,
  message: string,
): void {
  state.logSeq += 1;
  state.log = [
    ...state.log,
    {
      id: `log-${state.tick}-${state.logSeq}`,
      tick: state.tick,
      kind,
      message,
    },
  ].slice(-LOG_LIMIT);
}

function isRescueOnly(shelter: WorldObject): boolean {
  return shelter.metadata?.rescueOnly === true;
}

function findDock(plan: ScenePlan): [number, number] {
  const dock = plan.objects.find((object) => object.type === "rescue_boat");
  if (dock) return [dock.position[0], dock.position[2]];
  const station = plan.objects.find(
    (object) => object.type === "shelter" && object.metadata?.rescueOnly === true,
  );
  if (station) return [station.position[0], station.position[2]];
  return [plan.worldBounds.width / 2 - 4, plan.worldBounds.depth / 2 - 4];
}

function initialRoads(plan: ScenePlan): Record<string, RoadRuntime> {
  const roads: Record<string, RoadRuntime> = {};
  for (const object of plan.objects) {
    if (object.type !== "road" && object.type !== "bridge") continue;
    const planBlocked = object.status === "blocked";
    roads[object.id] = {
      id: object.id,
      blockedBy: planBlocked ? "event" : null,
      protectedTicks: 0,
      flooded: false,
      planBlocked,
    };
  }
  return roads;
}

function routeById(plan: ScenePlan, id: string): WorldObject | undefined {
  return plan.objects.find(
    (object) =>
      object.id === id && (object.type === "road" || object.type === "bridge"),
  );
}

function updateRoadStates(
  plan: ScenePlan,
  grid: NavGrid,
  state: SimulationState,
): void {
  for (const object of plan.objects) {
    if (object.type !== "road" && object.type !== "bridge") continue;
    const runtime = state.roads[object.id];
    if (!runtime) continue;
    const indices = grid.roadCells[object.id] ?? [];
    const cells = indices.map((index) => grid.cells[index]).filter(Boolean);

    let flooded = false;
    if (object.type === "bridge") {
      flooded = cells.some((cell) => cell.bridge && cell.flooded);
    } else {
      const landCells = cells.filter((cell) => !cell.bridge);
      const floodCount = landCells.filter((cell) => cell.flooded).length;
      flooded = landCells.length > 0 && floodCount / landCells.length >= 0.35;
    }

    const wasFlooded = runtime.flooded;
    runtime.flooded = flooded;
    if (flooded && !wasFlooded) {
      appendLog(
        state,
        "warning",
        `${object.name} is impassable — flood water has cut the route.`,
      );
    } else if (!flooded && wasFlooded && runtime.protectedTicks > 0) {
      appendLog(state, "success", `${object.name} is holding behind the sandbag line.`);
    }
  }
}

function moveToward(
  from: [number, number],
  to: [number, number],
  budget: number,
): { position: [number, number]; remaining: number; arrived: boolean } {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const distance = Math.hypot(dx, dz);
  if (distance < 1e-6) {
    return { position: [to[0], to[1]], remaining: budget, arrived: true };
  }
  if (distance <= budget) {
    return { position: [to[0], to[1]], remaining: budget - distance, arrived: true };
  }
  const ratio = budget / distance;
  return {
    position: [from[0] + dx * ratio, from[1] + dz * ratio],
    remaining: 0,
    arrived: false,
  };
}

function chooseRoute(
  grid: NavGrid,
  plan: ScenePlan,
  agent: SimAgent,
): { path: number[]; shelter: WorldObject } | null {
  const shelters = plan.objects.filter((object) => {
    if (object.type !== "shelter" || isRescueOnly(object)) return false;
    const shelterCell = cellAt(grid, object.position[0], object.position[2]);
    return !shelterCell?.flooded;
  });
  if (shelters.length === 0) return null;

  const start = nearestWalkableCell(grid, agent.position[0], agent.position[1], 2);
  if (!start?.walkable) return null;

  const preferred = shelters.find((shelter) => shelter.id === agent.preferredShelterId);
  const ordered = preferred
    ? [preferred, ...shelters.filter((shelter) => shelter.id !== preferred.id)]
    : shelters;

  let best: { path: number[]; shelter: WorldObject } | null = null;
  for (const shelter of ordered) {
    const goal = shelterGoalCell(grid, shelter);
    if (!goal) continue;
    const path = findPath(grid, start.index, goal.index);
    if (!path) continue;
    if (preferred && shelter.id === preferred.id) {
      return { path, shelter };
    }
    if (!best || path.length < best.path.length) {
      best = { path, shelter };
    }
  }
  return best;
}

function advanceAgent(
  plan: ScenePlan,
  grid: NavGrid,
  state: SimulationState,
  agent: SimAgent,
): void {
  const currentCell = cellAt(grid, agent.position[0], agent.position[1]);
  if (!agent.carriedBy && currentCell?.flooded) {
    if (agent.status !== "in_danger") {
      agent.status = "in_danger";
      agent.path = [];
      agent.targetShelterId = null;
      if (agent.lastDangerTick === null) {
        appendLog(
          state,
          "danger",
          `${agent.name} is caught in flood water and cannot walk out. A rescue skiff is needed.`,
        );
      }
      agent.lastDangerTick = state.tick;
    }
    return;
  }

  const route = chooseRoute(grid, plan, agent);
  if (!route) {
    if (agent.status !== "in_danger") {
      appendLog(
        state,
        "danger",
        `${agent.name} has no dry route to a shelter. Dispatch a skiff or open a new route.`,
      );
    }
    agent.status = "in_danger";
    agent.path = [];
    agent.targetShelterId = null;
    if (agent.lastDangerTick === null) agent.lastDangerTick = state.tick;
    return;
  }

  if (agent.status === "in_danger" || agent.status === "idle") {
    if (agent.status === "in_danger") {
      appendLog(state, "info", `${agent.name} found a route and is moving again.`);
    }
    agent.status = "moving";
    agent.lastDangerTick = null;
  }

  agent.targetShelterId = route.shelter.id;
  const points = route.path.map((index) => grid.cells[index]);
  let budget = agent.speed;
  let cursor = 1;
  let position: [number, number] = [agent.position[0], agent.position[1]];

  while (cursor < points.length && budget > 0.0001) {
    const target: [number, number] = [points[cursor].x, points[cursor].z];
    const step = moveToward(position, target, budget);
    position = step.position;
    budget = step.remaining;
    if (step.arrived) cursor += 1;
    else break;
  }

  agent.position = position;
  const remaining = points.slice(cursor).map(
    (cell) => [cell.x, cell.z] as [number, number],
  );
  agent.path = remaining;

  const distance = Math.hypot(
    agent.position[0] - route.shelter.position[0],
    agent.position[1] - route.shelter.position[2],
  );
  const atShelter = distance <= 6.5 || (remaining.length === 0 && distance <= 12);

  if (atShelter) {
    agent.status = "safe";
    agent.path = [];
    agent.targetShelterId = route.shelter.id;
    agent.lastDangerTick = null;
    appendLog(
      state,
      "success",
      `${agent.name} reached ${route.shelter.name}.`,
    );
  }
}

function moveBoat(
  plan: ScenePlan,
  state: SimulationState,
  boatIndex: number,
): void {
  const boat = state.boats[boatIndex];
  if (!boat || boat.phase === "idle") return;

  if (boat.phase === "to_rescue") {
    const target = boat.targetAgentId
      ? state.agents.find((agent) => agent.id === boat.targetAgentId)
      : null;
    if (!target || target.status === "safe" || target.carriedBy !== null) {
      boat.phase = "returning";
      boat.status = "returning";
      boat.targetAgentId = null;
      return;
    }

    const step = moveToward(boat.position, target.position, plan.simulation.boatSpeed);
    boat.position = step.position;

    const candidates = state.agents
      .filter(
        (agent) =>
          agent.role === "resident" &&
          agent.status !== "safe" &&
          agent.status !== "rescued" &&
          agent.carriedBy === null &&
          Math.hypot(
            agent.position[0] - boat.position[0],
            agent.position[1] - boat.position[1],
          ) <= 2.8,
      )
      .sort((a, b) => {
        if (a.id === boat.targetAgentId) return -1;
        if (b.id === boat.targetAgentId) return 1;
        const da = Math.hypot(
          a.position[0] - boat.position[0],
          a.position[1] - boat.position[1],
        );
        const db = Math.hypot(
          b.position[0] - boat.position[0],
          b.position[1] - boat.position[1],
        );
        return da - db;
      });

    for (const agent of candidates) {
      if (boat.passengers.length >= plan.simulation.boatCapacity) break;
      if (boat.passengers.includes(agent.id)) continue;
      agent.status = "rescued";
      agent.carriedBy = boat.id;
      agent.rescuedByBoat = true;
      agent.path = [];
      agent.targetShelterId = null;
      agent.lastDangerTick = null;
      boat.passengers.push(agent.id);
      appendLog(
        state,
        "success",
        `${boat.name} recovered ${agent.name} from the flood zone.`,
      );
    }

    if (
      boat.passengers.length >= plan.simulation.boatCapacity ||
      boat.passengers.includes(boat.targetAgentId ?? "")
    ) {
      boat.phase = "returning";
      boat.status = "returning";
    }
  } else if (boat.phase === "returning") {
    const step = moveToward(boat.position, boat.home, plan.simulation.boatSpeed);
    boat.position = step.position;
    if (step.arrived) {
      for (const [passengerIndex, passengerId] of boat.passengers.entries()) {
        const agent = state.agents.find((entry) => entry.id === passengerId);
        if (!agent) continue;
        agent.status = "safe";
        agent.carriedBy = null;
        agent.path = [];
        agent.position = [boat.home[0] + 1.2 + passengerIndex * 0.6, boat.home[1] - 1.2];
      }
      if (boat.passengers.length > 0) {
        appendLog(
          state,
          "success",
          `${boat.name} delivered ${boat.passengers.length} resident${
            boat.passengers.length === 1 ? "" : "s"
          } to the rescue dock.`,
        );
      }
      boat.passengers = [];
      boat.phase = "idle";
      boat.status = "idle";
      boat.targetAgentId = null;
    }
  }

  for (const passengerId of boat.passengers) {
    const agent = state.agents.find((entry) => entry.id === passengerId);
    if (agent) {
      agent.position = [boat.position[0], boat.position[1]];
    }
  }
}

function resolveOutcome(plan: ScenePlan, state: SimulationState): void {
  const residents = state.agents.filter((agent) => agent.role === "resident");
  const allSafe = residents.every(
    (agent) => agent.status === "safe" || agent.status === "rescued",
  );
  if (allSafe && residents.length > 0 && state.status !== "success") {
    state.status = "success";
    appendLog(
      state,
      "success",
      "Evacuation complete — every resident is safe.",
    );
    return;
  }
  const atPeak = state.waterLevel >= plan.simulation.waterMax - 1e-9;
  if (atPeak && state.status === "running" && !allSafe) {
    if (state.peakTick === null) state.peakTick = state.tick;
    const rescueGrace = 15;
    if (state.tick - state.peakTick >= rescueGrace) {
      state.status = "failed";
      appendLog(
        state,
        "danger",
        "The rescue window has closed with residents still at risk.",
      );
    }
  }
}

export function createInitialSimulation(plan: ScenePlan): SimulationState {
  const geometry = buildNavigationGrid(plan, plan.simulation.waterStart, initialRoads(plan));
  const state: SimulationState = {
    tick: 0,
    status: "ready",
    waterLevel: plan.simulation.waterStart,
    waterHeld: false,
    waterMaxed: false,
    peakTick: null,
    agents: [],
    roads: initialRoads(plan),
    boats: [],
    barriers: [],
    resources: { ...plan.resourceBudget },
    log: [],
    logSeq: 0,
    eventsApplied: [],
    started: false,
    floodCells: geometry.floodCells,
  };

  appendLog(
    state,
    "info",
    `${plan.title} staged. ${plan.agents.filter((agent) => agent.role === "resident").length} residents awaiting evacuation.`,
  );

  for (const [index, agent] of plan.agents.entries()) {
    const cell = nearestWalkableCell(
      geometry,
      agent.position[0],
      agent.position[2],
      10,
    );
    const preferredShelter = plan.objects.find(
      (object) =>
        object.id === agent.targetId &&
        object.type === "shelter" &&
        !isRescueOnly(object),
    );
    const simAgent: SimAgent = {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: "idle",
      position: cell
        ? [cell.x, cell.z]
        : [agent.position[0], agent.position[2]],
      path: [],
      pathIndex: 0,
      targetShelterId: null,
      preferredShelterId: preferredShelter?.id ?? null,
      speed: agent.speed,
      lastDangerTick: null,
      carriedBy: null,
      rescuedByBoat: false,
    };
    state.agents.push(simAgent);
    if (index === 0 && !cell) {
      appendLog(state, "warning", "A starting position was adjusted to reach dry ground.");
    }
  }

  updateRoadStates(plan, geometry, state);
  return state;
}

export function beginSimulation(state: SimulationState): SimulationState {
  if (state.status === "running" || state.status === "success" || state.status === "failed") {
    return state;
  }
  const next = cloneState(state);
  next.status = "running";
  next.started = true;
  appendLog(next, "info", "Evacuation started. The flood is rising from the east.");
  return next;
}

export function pauseSimulation(state: SimulationState): SimulationState {
  if (state.status !== "running") return state;
  const next = cloneState(state);
  next.status = "paused";
  appendLog(next, "info", "Simulation paused.");
  return next;
}

export function stepSimulation(
  plan: ScenePlan,
  state: SimulationState,
): SimulationState {
  if (state.status !== "running") return state;
  const next = cloneState(state);
  next.tick += 1;

  for (const event of plan.events) {
    if (next.eventsApplied.includes(event.id) || event.atTick > next.tick) continue;
    next.eventsApplied.push(event.id);
    if (event.kind === "raise_water") {
      const value = event.value ?? 0.1;
      if (next.waterHeld) {
        appendLog(
          next,
          "warning",
          "Surge held back by the closed flood gate.",
        );
      } else {
        next.waterLevel = Math.min(plan.simulation.waterMax, next.waterLevel + value);
        appendLog(
          next,
          "warning",
          event.description ??
            `Storm surge: the flood rose by ${value.toFixed(2)} m.`,
        );
      }
    } else if (event.kind === "block_route" && event.targetId) {
      const route = routeById(plan, event.targetId);
      if (route && next.roads[route.id]) {
        next.roads[route.id].blockedBy = "event";
        appendLog(
          next,
          "warning",
          event.description ?? `${route.name} has been closed.`,
        );
      }
    } else if (event.kind === "open_route" && event.targetId) {
      const route = routeById(plan, event.targetId);
      if (route && next.roads[route.id]) {
        next.roads[route.id].blockedBy = null;
        appendLog(
          next,
          "success",
          event.description ?? `${route.name} has been reopened.`,
        );
      }
    } else if (event.kind === "add_hazard") {
      appendLog(
        next,
        "warning",
        event.description ?? "A new hazard has appeared in the district.",
      );
    } else if (event.kind === "trigger_alarm") {
      appendLog(
        next,
        "command",
        event.description ?? "Emergency sirens sound across the district.",
      );
    }
  }

  if (!next.waterHeld && next.waterLevel < plan.simulation.waterMax) {
    next.waterLevel = Math.min(
      plan.simulation.waterMax,
      next.waterLevel + plan.simulation.waterRisePerTick,
    );
  }
  if (next.waterLevel >= plan.simulation.waterMax - 1e-9 && !next.waterMaxed) {
    next.waterMaxed = true;
    next.peakTick = next.tick;
    appendLog(next, "danger", "The flood has reached its peak water level.");
  }

  for (const barrier of next.barriers) {
    barrier.ticksRemaining -= 1;
  }
  const activeBarriers = next.barriers.filter((barrier) => barrier.ticksRemaining > 0);
  if (activeBarriers.length !== next.barriers.length) {
    for (const expired of next.barriers) {
      if (expired.ticksRemaining > 0) continue;
      const route = routeById(plan, expired.roadId);
      if (route && next.roads[expired.roadId]) {
        next.roads[expired.roadId].protectedTicks = 0;
      }
      appendLog(
        next,
        "warning",
        `Sandbags on ${route?.name ?? "a route"} are overwhelmed by the water.`,
      );
    }
  }
  next.barriers = activeBarriers;
  for (const barrier of next.barriers) {
    if (next.roads[barrier.roadId]) {
      next.roads[barrier.roadId].protectedTicks = barrier.ticksRemaining;
    }
  }

  const grid = buildNavigationGrid(plan, next.waterLevel, next.roads);
  next.floodCells = grid.floodCells;
  updateRoadStates(plan, grid, next);

  for (const agent of next.agents) {
    if (agent.status === "safe" || agent.status === "rescued") continue;
    advanceAgent(plan, grid, next, agent);
  }

  for (let index = 0; index < next.boats.length; index += 1) {
    moveBoat(plan, next, index);
  }

  resolveOutcome(plan, next);
  return next;
}

export function dispatchBoat(
  plan: ScenePlan,
  state: SimulationState,
  agentId: string,
): ActionResult {
  const agent = state.agents.find((entry) => entry.id === agentId);
  if (!agent) {
    return { state, ok: false, message: "Select a resident to dispatch a rescue skiff." };
  }
  if (agent.role !== "resident") {
    return { state, ok: false, message: "Rescue skiffs are assigned to residents." };
  }
  if (agent.status === "safe" || agent.status === "rescued") {
    return { state, ok: false, message: `${agent.name} is already safe.` };
  }
  if (state.boats.some((boat) => boat.targetAgentId === agentId)) {
    return { state, ok: false, message: `A skiff is already en route to ${agent.name}.` };
  }
  if (state.resources.rescueBoats <= 0) {
    return { state, ok: false, message: "No rescue skiffs remaining." };
  }

  const next = cloneState(state);
  const boatsUsed = plan.resourceBudget.rescueBoats - next.resources.rescueBoats;
  const home = findDock(plan);
  const id = `skiff-${boatsUsed + 1}`;
  next.boats.push({
    id,
    name: `Rescue Skiff ${boatsUsed + 1}`,
    position: [home[0], home[1]],
    home,
    targetAgentId: agentId,
    passengers: [],
    phase: "to_rescue",
    status: "en_route",
  });
  next.resources.rescueBoats -= 1;
  appendLog(
    next,
    "command",
    `Rescue Skiff ${boatsUsed + 1} dispatched to ${agent.name}.`,
  );
  return { state: next, ok: true, message: `Skiff dispatched to ${agent.name}.` };
}

export function deployBarrier(
  plan: ScenePlan,
  state: SimulationState,
  roadId: string,
): ActionResult {
  const route = routeById(plan, roadId);
  if (!route) {
    return { state, ok: false, message: "Select a road or bridge first." };
  }
  if (state.barriers.some((barrier) => barrier.roadId === roadId)) {
    return { state, ok: false, message: `${route.name} already has a sandbag line.` };
  }
  if (state.resources.barriers <= 0) {
    return { state, ok: false, message: "No sandbag barriers remaining." };
  }

  const next = cloneState(state);
  const duration = plan.simulation.barrierDurationTicks;
  next.resources.barriers -= 1;
  next.barriers.push({
    id: `barrier-${next.barriers.length + 1}`,
    roadId,
    position: [route.position[0], route.position[2]],
    ticksRemaining: duration,
  });
  if (next.roads[roadId]) {
    next.roads[roadId].protectedTicks = duration;
    next.roads[roadId].flooded = false;
  }
  appendLog(
    next,
    "command",
    `Sandbag barrier deployed on ${route.name}. The route is protected for a limited time.`,
  );
  return {
    state: next,
    ok: true,
    message: `Sandbag barrier deployed on ${route.name}.`,
  };
}

export function toggleRoute(
  plan: ScenePlan,
  state: SimulationState,
  roadId: string,
): ActionResult {
  const route = routeById(plan, roadId);
  if (!route) {
    return { state, ok: false, message: "Select a road or bridge first." };
  }
  const runtime = state.roads[roadId];
  if (!runtime) {
    return { state, ok: false, message: "That route is not simulated." };
  }
  const next = cloneState(state);
  const nextRoad = next.roads[roadId];
  if (nextRoad.blockedBy) {
    nextRoad.blockedBy = null;
    nextRoad.planBlocked = false;
    appendLog(next, "command", `${route.name} reopened by the operator.`);
    return { state: next, ok: true, message: `${route.name} reopened.` };
  }
  nextRoad.blockedBy = "user";
  nextRoad.planBlocked = true;
  appendLog(next, "command", `${route.name} closed by the operator.`);
  return { state: next, ok: true, message: `${route.name} closed.` };
}

export function toggleWaterHold(state: SimulationState): ActionResult {
  const next = cloneState(state);
  next.waterHeld = !next.waterHeld;
  appendLog(
    next,
    "command",
    next.waterHeld
      ? "Flood gate closed — the water rise is on hold."
      : "Flood gate reopened — the water is rising again.",
  );
  return {
    state: next,
    ok: true,
    message: next.waterHeld ? "Water rise on hold." : "Water rising.",
  };
}

export function rebaseSimulation(
  plan: ScenePlan,
  previous: SimulationState,
  notice?: string,
): SimulationState {
  const next = createInitialSimulation(plan);
  next.tick = previous.tick;
  next.status = previous.status;
  next.started = previous.started;
  next.waterLevel = Math.min(previous.waterLevel, plan.simulation.waterMax);
  next.waterHeld = previous.waterHeld;
  next.waterMaxed = previous.waterMaxed;
  next.peakTick = previous.peakTick;
  next.resources = {
    rescueBoats: Math.min(previous.resources.rescueBoats, plan.resourceBudget.rescueBoats),
    barriers: Math.min(previous.resources.barriers, plan.resourceBudget.barriers),
  };
  next.log = previous.log;
  next.logSeq = previous.logSeq;
  next.eventsApplied = previous.eventsApplied.slice();

  for (const object of plan.objects) {
    if (object.type !== "road" && object.type !== "bridge") continue;
    if (!next.roads[object.id]) continue;
    const old = previous.roads[object.id];
    const planBlocked = object.status === "blocked";
    if (old) {
      next.roads[object.id] = { ...old };
      if (planBlocked && !old.planBlocked) {
        next.roads[object.id].blockedBy = "event";
      }
      if (!planBlocked && old.planBlocked && next.roads[object.id].blockedBy === "event") {
        next.roads[object.id].blockedBy = null;
      }
      next.roads[object.id].planBlocked = planBlocked;
    } else {
      next.roads[object.id] = {
        id: object.id,
        blockedBy: planBlocked ? "event" : null,
        protectedTicks: 0,
        flooded: false,
        planBlocked,
      };
    }
  }

  next.agents = next.agents.map((agent) => {
    const old = previous.agents.find((entry) => entry.id === agent.id);
    if (!old) return agent;
    return {
      ...agent,
      position: old.position,
      status: old.status === "rescued" && !old.carriedBy ? "safe" : old.status,
      preferredShelterId: agent.preferredShelterId,
      targetShelterId: null,
      path: [],
      lastDangerTick: old.lastDangerTick,
      carriedBy: old.carriedBy,
      rescuedByBoat: old.rescuedByBoat,
      speed: old.speed,
      name: old.name,
    };
  });

  const home = findDock(plan);
  next.boats = previous.boats
    .filter((boat) => !boat.targetAgentId || next.agents.some((agent) => agent.id === boat.targetAgentId))
    .map((boat) => ({
      ...boat,
      home,
      passengers: boat.passengers.filter((id) => next.agents.some((agent) => agent.id === id)),
      targetAgentId:
        boat.targetAgentId && next.agents.some((agent) => agent.id === boat.targetAgentId)
          ? boat.targetAgentId
          : null,
    }));
  for (const boat of next.boats) {
    if (!boat.targetAgentId && boat.phase === "to_rescue") {
      boat.phase = boat.passengers.length ? "returning" : "idle";
      boat.status = boat.passengers.length ? "returning" : "idle";
    }
  }
  for (const agent of next.agents) {
    if (agent.carriedBy && !next.boats.some((boat) => boat.id === agent.carriedBy)) {
      agent.carriedBy = null;
      agent.status = "safe";
    }
  }

  next.barriers = previous.barriers
    .filter((barrier) => next.roads[barrier.roadId])
    .map((barrier) => {
      const route = routeById(plan, barrier.roadId);
      return {
        ...barrier,
        position: route
          ? ([route.position[0], route.position[2]] as [number, number])
          : barrier.position,
      };
    });
  for (const barrier of next.barriers) {
    if (next.roads[barrier.roadId]) {
      next.roads[barrier.roadId].protectedTicks = barrier.ticksRemaining;
    }
  }

  const geometry = buildNavigationGrid(plan, next.waterLevel, next.roads);
  next.floodCells = geometry.floodCells;
  updateRoadStates(plan, geometry, next);

  const allSafe = next.agents
    .filter((agent) => agent.role === "resident")
    .every((agent) => agent.status === "safe" || agent.status === "rescued");
  if (next.status === "success" && !allSafe) {
    next.status = "paused";
  }
  if (next.status === "failed") {
    next.status = "paused";
  }

  if (notice) {
    appendLog(next, "edit", notice);
  }
  return next;
}
