import { describe, expect, it } from "vitest";
import { getDemoPlan } from "../lib/demo-plan";
import {
  buildNavigationGrid,
  cellAt,
  findPath,
  nearestWalkableCell,
  pathPoints,
  shelterGoalCell,
} from "../lib/navigation";

const plan = getDemoPlan();
const shelter = plan.objects.find((object) => object.id === "shelter-hilltop")!;
const bridge = plan.objects.find((object) => object.id === "bridge-causeway")!;

describe("Navigation grid", () => {
  it("keeps the causeway crossable before it overtops", () => {
    const grid = buildNavigationGrid(plan, plan.simulation.waterStart, {});
    const bridgeCell = cellAt(grid, bridge.position[0], bridge.position[2]);
    expect(bridgeCell?.bridge).toBe(true);
    expect(bridgeCell?.walkable).toBe(true);
  });

  it("floods low cells as the water rises", () => {
    const dry = buildNavigationGrid(plan, 0.2, {});
    const wet = buildNavigationGrid(plan, 0.6, {});
    expect(wet.floodCells.length).toBeGreaterThan(dry.floodCells.length);
    const bridgeCell = cellAt(wet, bridge.position[0], bridge.position[2]);
    expect(bridgeCell?.flooded).toBe(true);
    expect(bridgeCell?.walkable).toBe(false);
  });

  it("finds a route across the open causeway", () => {
    const grid = buildNavigationGrid(plan, 0.12, {});
    const goal = shelterGoalCell(grid, shelter);
    expect(goal).not.toBeNull();
    const start = nearestWalkableCell(grid, 29, 13, 4);
    expect(start).not.toBeNull();
    const path = findPath(grid, start!.index, goal!.index);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(8);
    const points = pathPoints(grid, path!);
    expect(points.length).toBe(path!.length);
  });

  it("returns no route once the causeway floods and no detour exists", () => {
    const grid = buildNavigationGrid(plan, 0.6, {});
    const goal = shelterGoalCell(grid, shelter)!;
    const start = nearestWalkableCell(grid, 24, 5, 4)!;
    const path = findPath(grid, start.index, goal.index);
    // The east bank is cut off: the causeway is submerged and the canal runs edge to edge.
    expect(path).toBeNull();
  });

  it("respects a manually closed route", () => {
    const open = buildNavigationGrid(plan, 0.12, {});
    const closed = buildNavigationGrid(plan, 0.12, {
      "bridge-causeway": { blockedBy: "user", protectedTicks: 0 },
    });
    const goalOpen = shelterGoalCell(open, shelter)!;
    const goalClosed = shelterGoalCell(closed, shelter)!;
    const startOpen = nearestWalkableCell(open, 26, 8, 4)!;
    const startClosed = nearestWalkableCell(closed, 26, 8, 4)!;
    expect(findPath(open, startOpen.index, goalOpen.index)).not.toBeNull();
    expect(findPath(closed, startClosed.index, goalClosed.index)).toBeNull();
  });

  it("keeps a protected causeway open after its clearance is exceeded", () => {
    const protectedGrid = buildNavigationGrid(plan, 0.8, {
      "bridge-causeway": { blockedBy: null, protectedTicks: 300 },
    });
    const cell = cellAt(protectedGrid, bridge.position[0], bridge.position[2]);
    expect(cell?.flooded).toBe(false);
    expect(cell?.walkable).toBe(true);
    const goal = shelterGoalCell(protectedGrid, shelter)!;
    const start = nearestWalkableCell(protectedGrid, 20, 5, 4)!;
    expect(findPath(protectedGrid, start.index, goal.index)).not.toBeNull();
  });

  it("blocks building footprints", () => {
    const grid = buildNavigationGrid(plan, 0.12, {});
    const school = plan.objects.find((object) => object.id === "school-central")!;
    const cell = cellAt(grid, school.position[0], school.position[2]);
    expect(cell?.building).toBe(true);
    expect(cell?.walkable).toBe(false);
  });
});
