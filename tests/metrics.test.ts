import { describe, expect, it } from "vitest";
import { getDemoPlan } from "../lib/demo-plan";
import { calculateMetrics, getRoadStatus } from "../lib/metrics";
import { createInitialSimulation } from "../lib/simulation";

const plan = getDemoPlan();

describe("Calculated metrics", () => {
  it("derives every outcome from simulation state", () => {
    const state = createInitialSimulation(plan);
    const residents = state.agents.filter((agent) => agent.role === "resident");
    residents[0].status = "safe";
    residents[1].status = "rescued";
    residents[1].rescuedByBoat = true;
    residents[2].status = "in_danger";
    residents[3].status = "moving";
    for (const agent of residents.slice(4)) agent.status = "idle";

    state.roads["road-market"].flooded = true;
    state.roads["road-riverside"].blockedBy = "user";
    state.roads["road-school"].protectedTicks = 120;
    state.resources = { rescueBoats: 1, barriers: 2 };
    state.status = "running";
    state.waterLevel = 0.74;
    state.tick = 42;

    const metrics = calculateMetrics(plan, state);
    expect(metrics.totalResidents).toBe(12);
    expect(metrics.safeResidents).toBe(2);
    expect(metrics.rescuedResidents).toBe(1);
    expect(metrics.inDangerResidents).toBe(1);
    expect(metrics.movingResidents).toBe(1);
    expect(metrics.idleResidents).toBe(8);
    expect(metrics.totalRoutes).toBe(7);
    expect(metrics.floodedRoutes).toBe(1);
    expect(metrics.blockedRoutes).toBe(2);
    expect(metrics.protectedRoutes).toBe(1);
    expect(metrics.openRoutes).toBe(5);
    expect(metrics.boatsRemaining).toBe(1);
    expect(metrics.boatsUsed).toBe(1);
    expect(metrics.barriersRemaining).toBe(2);
    expect(metrics.barriersUsed).toBe(1);
    expect(metrics.objectiveProgress).toBe(2);
    expect(metrics.objectiveTarget).toBe(12);
    expect(metrics.missionStatus).toBe("running");
    expect(metrics.waterLevel).toBe(0.74);
    expect(metrics.tick).toBe(42);
  });

  it("counts residents in every status bucket without double-counting", () => {
    const state = createInitialSimulation(plan);
    const metrics = calculateMetrics(plan, state);
    expect(
      metrics.safeResidents +
        metrics.inDangerResidents +
        metrics.movingResidents +
        metrics.idleResidents,
    ).toBe(metrics.totalResidents);
  });

  it("reports route status with the right precedence", () => {
    const planObject = plan.objects.find((object) => object.id === "bridge-causeway")!;
    expect(
      getRoadStatus(planObject, {
        id: planObject.id,
        blockedBy: null,
        protectedTicks: 0,
        flooded: false,
        planBlocked: false,
      }),
    ).toBe("open");
    expect(
      getRoadStatus(planObject, {
        id: planObject.id,
        blockedBy: "user",
        protectedTicks: 0,
        flooded: false,
        planBlocked: false,
      }),
    ).toBe("blocked");
    expect(
      getRoadStatus(planObject, {
        id: planObject.id,
        blockedBy: "user",
        protectedTicks: 0,
        flooded: true,
        planBlocked: false,
      }),
    ).toBe("flooded");
    expect(
      getRoadStatus(planObject, {
        id: planObject.id,
        blockedBy: null,
        protectedTicks: 100,
        flooded: false,
        planBlocked: false,
      }),
    ).toBe("protected");
  });
});
