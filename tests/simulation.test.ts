import { describe, expect, it } from "vitest";
import { getDemoPlan } from "../lib/demo-plan";
import { calculateMetrics } from "../lib/metrics";
import { applyScenePatch } from "../lib/scene-patcher";
import {
  beginSimulation,
  createInitialSimulation,
  deployBarrier,
  dispatchBoat,
  pauseSimulation,
  rebaseSimulation,
  stepSimulation,
  toggleRoute,
  toggleWaterHold,
} from "../lib/simulation";
import type { ScenePlan, SimulationState } from "../lib/types";

const plan = getDemoPlan();

function run(state: SimulationState, ticks: number, world: ScenePlan = plan): SimulationState {
  let current = state;
  for (let index = 0; index < ticks; index += 1) {
    current = stepSimulation(world, current);
  }
  return current;
}

function started(): SimulationState {
  return beginSimulation(createInitialSimulation(plan));
}

describe("Flood simulation", () => {
  it("is deterministic across identical runs", () => {
    const a = run(started(), 70);
    const b = run(started(), 70);
    expect(a.waterLevel).toBeCloseTo(b.waterLevel, 10);
    expect(a.status).toBe(b.status);
    expect(a.agents.map((agent) => [agent.id, agent.status, agent.position])).toEqual(
      b.agents.map((agent) => [agent.id, agent.status, agent.position]),
    );
    expect(calculateMetrics(plan, a)).toEqual(calculateMetrics(plan, b));
  });

  it("moves residents toward the shelter and logs route flooding", () => {
    const initial = createInitialSimulation(plan);
    const state = run(beginSimulation(initial), 30);
    expect(calculateMetrics(plan, state).safeResidents).toBeGreaterThanOrEqual(1);
    expect(state.agents.some((agent) => agent.status === "moving" || agent.status === "safe")).toBe(
      true,
    );
    expect(state.roads["bridge-causeway"].flooded).toBe(false);
    const later = run(state, 10);
    expect(later.roads["bridge-causeway"].flooded).toBe(true);
    expect(later.log.some((entry) => entry.message.includes("Old Causeway"))).toBe(true);
  });

  it("cuts off slow eastern residents when the causeway overtops", () => {
    const state = run(started(), 40);
    const metrics = calculateMetrics(plan, state);
    expect(metrics.inDangerResidents).toBeGreaterThanOrEqual(1);
    expect(metrics.safeResidents + metrics.inDangerResidents + metrics.movingResidents).toBe(
      metrics.totalResidents,
    );
    const danger = state.agents.filter((agent) => agent.status === "in_danger");
    expect(danger.map((agent) => agent.name)).toEqual(
      expect.arrayContaining(["Amara", "Ife"]),
    );
  });

  it("fails after the rescue window when nobody intervenes", () => {
    const state = run(started(), 150);
    const metrics = calculateMetrics(plan, state);
    expect(state.status).toBe("failed");
    expect(metrics.safeResidents).toBe(10);
    expect(metrics.inDangerResidents).toBe(2);
  });

  it("dispatch boats to stranded residents and changes the objective result", () => {
    let state = run(started(), 40);
    const before = calculateMetrics(plan, state);
    expect(before.inDangerResidents).toBe(2);
    const first = state.agents.find((agent) => agent.name === "Amara")!;
    const second = state.agents.find((agent) => agent.name === "Ife")!;

    const dispatch1 = dispatchBoat(plan, state, first.id);
    expect(dispatch1.ok).toBe(true);
    const dispatch2 = dispatchBoat(plan, dispatch1.state, second.id);
    expect(dispatch2.ok).toBe(true);
    state = run(dispatch2.state, 120);

    const after = calculateMetrics(plan, state);
    expect(state.status).toBe("success");
    expect(after.safeResidents).toBe(12);
    expect(after.rescuedResidents).toBeGreaterThanOrEqual(2);
    expect(after.boatsRemaining).toBe(0);
  });

  it("deploying a barrier keeps the causeway open and prevents the early cutoff", () => {
    const unprotected = run(started(), 40);
    const barrier = deployBarrier(plan, started(), "bridge-causeway");
    expect(barrier.ok).toBe(true);
    const protectedState = run(barrier.state, 40);
    const protectedMetrics = calculateMetrics(plan, protectedState);
    expect(protectedState.roads["bridge-causeway"].flooded).toBe(false);
    expect(protectedState.roads["bridge-causeway"].protectedTicks).toBeGreaterThan(0);
    expect(protectedMetrics.inDangerResidents).toBe(0);
    expect(calculateMetrics(plan, unprotected).inDangerResidents).toBeGreaterThan(0);
    expect(protectedMetrics.barriersRemaining).toBe(2);
  });

  it("closing the causeway re-paths residents and updates route metrics", () => {
    let state = started();
    const before = calculateMetrics(plan, state);
    const toggle = toggleRoute(plan, state, "bridge-causeway");
    expect(toggle.ok).toBe(true);
    state = run(toggle.state, 2);
    const after = calculateMetrics(plan, state);
    expect(state.roads["bridge-causeway"].blockedBy).toBe("user");
    expect(after.openRoutes).toBe(before.openRoutes - 1);
    expect(after.blockedRoutes).toBe(before.blockedRoutes + 1);
    expect(after.inDangerResidents).toBeGreaterThan(0);
  });

  it("holding the flood gate freezes the water level", () => {
    let state = run(started(), 20);
    const held = toggleWaterHold(state);
    expect(held.ok).toBe(true);
    const level = held.state.waterLevel;
    state = run(held.state, 25);
    expect(state.waterLevel).toBeCloseTo(level, 10);
    expect(state.waterHeld).toBe(true);
    const released = toggleWaterHold(state);
    const afterRelease = run(released.state, 5);
    expect(afterRelease.waterLevel).toBeGreaterThan(level);
  });

  it("pausing stops ticks and resetting starts clean", () => {
    const running = started();
    const paused = pauseSimulation(running);
    expect(paused.status).toBe("paused");
    const afterPaused = stepSimulation(plan, paused);
    expect(afterPaused.tick).toBe(paused.tick);
    const reset = createInitialSimulation(plan);
    expect(reset.tick).toBe(0);
    expect(reset.status).toBe("ready");
    expect(reset.resources.rescueBoats).toBe(plan.resourceBudget.rescueBoats);
  });

  it("rejects invalid interventions without mutating state", () => {
    const state = started();
    const noBoat = dispatchBoat(plan, state, "resident-does-not-exist");
    expect(noBoat.ok).toBe(false);
    expect(noBoat.state).toBe(state);
    const missingRoad = deployBarrier(plan, state, "road-does-not-exist");
    expect(missingRoad.ok).toBe(false);
    expect(missingRoad.state).toBe(state);
    const resident = state.agents.find((agent) => agent.role === "resident")!;
    const first = dispatchBoat(plan, state, resident.id);
    const duplicate = dispatchBoat(plan, first.state, resident.id);
    expect(duplicate.ok).toBe(false);
    const exhausted = {
      ...state,
      resources: { ...state.resources, rescueBoats: 0 },
    };
    expect(dispatchBoat(plan, exhausted, resident.id).ok).toBe(false);
  });
});

describe("Live rebase after an edit", () => {
  it("preserves simulation progress and stable IDs while adding a shelter", () => {
    const before = run(started(), 12);
    const shelter = {
      id: "shelter-west-relief",
      type: "shelter" as const,
      name: "West Relief Shelter",
      position: [-31, 0, 6] as [number, number, number],
      scale: [4.8, 3, 4.8] as [number, number, number],
      status: "normal" as const,
    };
    const patch = applyScenePatch(plan, {
      operations: [
        { op: "add_object", object: shelter },
        { op: "update_agent_goal", id: before.agents[0].id, goal: "reach_shelter", targetId: shelter.id },
      ],
    });
    const originalIds = plan.objects.map((object) => object.id);
    for (const id of originalIds) {
      expect(patch.plan.objects.some((object) => object.id === id)).toBe(true);
    }
    const rebased = rebaseSimulation(patch.plan, before, "Test edit");
    expect(rebased.tick).toBe(before.tick);
    expect(rebased.waterLevel).toBeCloseTo(before.waterLevel, 10);
    expect(rebased.agents.find((agent) => agent.id === before.agents[0].id)?.preferredShelterId).toBe(
      shelter.id,
    );
    expect(rebased.agents.find((agent) => agent.id === before.agents[0].id)?.position).toEqual(
      before.agents[0].position,
    );
    expect(rebased.log.at(-1)?.message).toContain("Test edit");
  });
});
