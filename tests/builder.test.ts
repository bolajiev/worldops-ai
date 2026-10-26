import { describe, expect, it } from "vitest";
import { getDemoPlan } from "../lib/demo-plan";
import {
  BUILD_PALETTE,
  createDuplicateObject,
  createPlacedObject,
  createPlacedResident,
  operationsForPlacement,
} from "../lib/builder";
import { applyScenePatch } from "../lib/scene-patcher";
import { ScenePlanSchema } from "../lib/scene-schema";

describe("Direct object builder", () => {
  it("creates valid, uniquely identified objects at the clicked position", () => {
    const plan = getDemoPlan();
    const house = createPlacedObject(plan, "house", 4, -3);
    expect(house.type).toBe("house");
    expect(house.position[0]).toBeCloseTo(4, 5);
    expect(house.position[2]).toBeCloseTo(-3, 5);
    expect(plan.objects.some((object) => object.id === house.id)).toBe(false);
    expect(house.name).toContain("House");
    expect(house.scale).toHaveLength(3);
  });

  it("keeps every palette entry inside the supported schema", () => {
    const plan = getDemoPlan();
    for (const item of BUILD_PALETTE) {
      const object = createPlacedObject(plan, item.type, 0, 0);
      const result = applyScenePatch(plan, { operations: [{ op: "add_object", object }] });
      expect(ScenePlanSchema.safeParse(result.plan).success).toBe(true);
    }
  });

  it("creates residents and adds them through the patch engine", () => {
    const plan = getDemoPlan();
    const resident = createPlacedResident(plan, -2, 8);
    const result = applyScenePatch(plan, {
      operations: [{ op: "add_agent", agent: resident }],
    });
    expect(result.plan.agents.some((agent) => agent.id === resident.id)).toBe(true);
    expect(result.plan.agents.length).toBe(plan.agents.length + 1);
    expect(ScenePlanSchema.safeParse(result.plan).success).toBe(true);
  });

  it("builds operations for placement and moving", () => {
    const plan = getDemoPlan();
    const placement = operationsForPlacement(
      plan,
      { kind: "object", type: "tree" },
      3,
      4,
    );
    expect(placement?.operations[0].op).toBe("add_object");
    expect(placement?.selected.kind).toBe("object");

    const move = operationsForPlacement(
      plan,
      { kind: "move", id: "house-mango" },
      -8,
      2,
    );
    expect(move?.operations[0].op).toBe("update_object");
    const result = applyScenePatch(plan, { operations: move!.operations });
    expect(
      result.plan.objects.find((object) => object.id === "house-mango")?.position[0],
    ).toBeCloseTo(-8, 5);
  });

  it("duplicates an object without reusing its id", () => {
    const plan = getDemoPlan();
    const original = plan.objects.find((object) => object.id === "house-mango")!;
    const copy = createDuplicateObject(plan, original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toContain("copy");
    expect(copy.position).not.toEqual(original.position);
    const result = applyScenePatch(plan, {
      operations: [{ op: "add_object", object: copy }],
    });
    expect(result.plan.objects.some((object) => object.id === copy.id)).toBe(true);
  });
});
