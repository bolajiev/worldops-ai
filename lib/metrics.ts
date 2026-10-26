import type {
  Metrics,
  RoadRuntime,
  RoadStatus,
  ScenePlan,
  SimulationState,
  WorldObject,
} from "./types";

export function getRoadStatus(
  object: WorldObject,
  runtime: RoadRuntime | undefined,
): RoadStatus {
  if (!runtime) return object.status === "blocked" ? "blocked" : "open";
  if (runtime.flooded) return "flooded";
  if (runtime.blockedBy) return "blocked";
  if (runtime.protectedTicks > 0) return "protected";
  return "open";
}

export function calculateMetrics(
  plan: ScenePlan,
  state: SimulationState,
): Metrics {
  const residents = state.agents.filter((agent) => agent.role === "resident");
  const safeResidents = residents.filter(
    (agent) => agent.status === "safe" || agent.status === "rescued",
  ).length;
  const rescuedResidents = residents.filter(
    (agent) => agent.rescuedByBoat && (agent.status === "safe" || agent.status === "rescued"),
  ).length;
  const inDangerResidents = residents.filter(
    (agent) => agent.status === "in_danger",
  ).length;
  const movingResidents = residents.filter(
    (agent) => agent.status === "moving",
  ).length;
  const idleResidents = residents.filter((agent) => agent.status === "idle").length;

  const routes = plan.objects.filter(
    (object) => object.type === "road" || object.type === "bridge",
  );
  const statuses = routes.map((route) => getRoadStatus(route, state.roads[route.id]));
  const openRoutes = statuses.filter(
    (status) => status === "open" || status === "protected",
  ).length;
  const blockedRoutes = statuses.filter(
    (status) => status === "blocked" || status === "flooded",
  ).length;
  const floodedRoutes = statuses.filter((status) => status === "flooded").length;
  const protectedRoutes = statuses.filter((status) => status === "protected").length;

  const evacuationObjective = plan.objectives.find(
    (objective) => objective.kind === "evacuate_residents",
  );
  const objectiveTarget =
    evacuationObjective?.target ?? Math.max(1, residents.length);

  const totalBudgetBoats = plan.resourceBudget.rescueBoats;
  const totalBudgetBarriers = plan.resourceBudget.barriers;

  return {
    totalResidents: residents.length,
    safeResidents,
    rescuedResidents,
    inDangerResidents,
    movingResidents,
    idleResidents,
    totalRoutes: routes.length,
    openRoutes,
    blockedRoutes,
    floodedRoutes,
    protectedRoutes,
    boatsRemaining: state.resources.rescueBoats,
    barriersRemaining: state.resources.barriers,
    boatsUsed: Math.max(0, totalBudgetBoats - state.resources.rescueBoats),
    barriersUsed: Math.max(0, totalBudgetBarriers - state.resources.barriers),
    objectiveProgress: safeResidents,
    objectiveTarget,
    missionStatus: state.status,
    waterLevel: state.waterLevel,
    tick: state.tick,
  };
}
