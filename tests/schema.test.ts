import { describe, expect, it } from "vitest";
import { getDemoPlan } from "../lib/demo-plan";
import { normalizeScenePlan } from "../lib/scene-normalize";
import { ScenePlanSchema, formatZodError } from "../lib/scene-schema";
import type { ScenePlan } from "../lib/types";

function expectInvalid(plan: unknown): string {
  const result = ScenePlanSchema.safeParse(plan);
  expect(result.success).toBe(false);
  return result.success ? "" : formatZodError(result.error);
}

describe("ScenePlan schema", () => {
  it("accepts the built-in flood-rescue plan", () => {
    const plan = getDemoPlan();
    const parsed = ScenePlanSchema.safeParse(plan);
    expect(parsed.success).toBe(true);
    expect(plan.agents.filter((agent) => agent.role === "resident")).toHaveLength(12);
    expect(plan.objects.filter((object) => object.type === "house")).toHaveLength(6);
  });

  it("rejects unsupported object types", () => {
    const plan = getDemoPlan();
    (plan.objects[0] as unknown as { type: string }).type = "dragon";
    expect(expectInvalid(plan)).toContain("type");
  });

  it("rejects duplicate IDs across entities", () => {
    const plan = getDemoPlan();
    plan.objects[1].id = plan.objects[0].id;
    expect(expectInvalid(plan)).toContain("Duplicate ID");
  });

  it("rejects NaN, Infinity and out-of-bounds positions", () => {
    const plan = getDemoPlan();
    plan.objects[0].position[0] = Number.NaN;
    expect(expectInvalid(plan)).toMatch(/NaN|finite/i);

    const infinite = getDemoPlan();
    infinite.agents[0].position[1] = Number.POSITIVE_INFINITY;
    expect(expectInvalid(infinite)).toMatch(/Infinity|finite/i);

    const outside = getDemoPlan();
    outside.objects[0].position[0] = 999;
    expect(expectInvalid(outside)).toContain("outside world bounds");
  });

  it("rejects dangling target references", () => {
    const plan = getDemoPlan();
    plan.agents[0].targetId = "shelter-that-does-not-exist";
    expect(expectInvalid(plan)).toContain("unknown entity");
  });
});

describe("Scene normalization", () => {
  it("caps oversized scenes and clamps positions and scale", () => {
    const base = getDemoPlan();
    const raw = structuredClone(base) as ScenePlan;
    raw.objects = Array.from({ length: 130 }, (_, index) => ({
      ...base.objects[index % base.objects.length],
      id: `tree-extra-${index}`,
      type: "tree",
      position: [200, 0, -200] as [number, number, number],
      scale: [500, 50, 500] as [number, number, number],
    }));
    raw.agents = [];
    const { plan, warnings } = normalizeScenePlan(raw);
    expect(plan.objects.length).toBeLessThanOrEqual(100);
    expect(warnings.some((warning) => warning.includes("capped"))).toBe(true);
    for (const object of plan.objects) {
      expect(object.position[0]).toBeLessThanOrEqual(plan.worldBounds.width / 2);
      expect(object.position[0]).toBeGreaterThanOrEqual(-plan.worldBounds.width / 2);
      expect(object.position[2]).toBeLessThanOrEqual(plan.worldBounds.depth / 2);
      expect((object.scale ?? [1, 1, 1])[0]).toBeLessThanOrEqual(120);
    }
    expect(ScenePlanSchema.safeParse(plan).success).toBe(true);
  });

  it("adds a shelter, road and residents when a sparse plan omits them", () => {
    const raw = {
      title: "Sparse Test",
      objects: [
        {
          type: "tree",
          name: "Lone Tree",
          position: [0, 0, 0],
          scale: [2, 3, 2],
        },
      ],
      agents: [],
      objectives: [],
      events: [],
    };
    const { plan, warnings } = normalizeScenePlan(raw);
    expect(plan.objects.some((object) => object.type === "shelter")).toBe(true);
    expect(plan.objects.some((object) => object.type === "road")).toBe(true);
    expect(plan.agents.filter((agent) => agent.role === "resident").length).toBeGreaterThan(0);
    expect(warnings.length).toBeGreaterThan(0);
    expect(ScenePlanSchema.safeParse(plan).success).toBe(true);
  });

  it("sanitizes labels and deduplicates IDs", () => {
    const raw = {
      title: "<script>Bad</script>",
      objects: [
        {
          id: "same",
          type: "house",
          name: "<b>House</b>",
          position: [0, 0, 0],
        },
        {
          id: "same",
          type: "road",
          name: "Road",
          position: [0, 0, 0],
        },
        {
          id: "safe-shelter",
          type: "shelter",
          name: "Safe Shelter",
          position: [-20, 0, -10],
        },
      ],
      agents: [
        {
          id: "a",
          name: "<img src=x>Resident",
          position: [0, 0, 0],
          speed: 0.8,
        },
      ],
      objectives: [],
      events: [],
    };
    const { plan } = normalizeScenePlan(raw);
    expect(plan.title).not.toContain("<");
    expect(plan.objects[0].name).not.toContain("<");
    expect(plan.agents[0].name).not.toContain("<");
    const ids = plan.objects.map((object) => object.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ScenePlanSchema.safeParse(plan).success).toBe(true);
  });
});
