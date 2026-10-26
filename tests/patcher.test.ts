import { describe, expect, it } from "vitest";
import { getDemoPlan } from "../lib/demo-plan";
import { localEdit } from "../lib/local-editor";
import { applyScenePatch, PatchError, summarizePatch } from "../lib/scene-patcher";
import type { ScenePlan } from "../lib/types";

function fresh(): ScenePlan {
  return getDemoPlan();
}

describe("Scene patches", () => {
  it("adds a shelter while preserving every existing ID and position", () => {
    const plan = fresh();
    const originalIds = plan.objects.map((object) => object.id);
    const originalPositions = new Map(
      plan.objects.map((object) => [object.id, [...object.position]]),
    );
    const result = applyScenePatch(plan, {
      operations: [
        {
          op: "add_object",
          object: {
            id: "shelter-west-relief",
            type: "shelter",
            name: "West Relief Shelter",
            position: [-31, 0, 6],
            scale: [4.8, 3, 4.8],
          },
        },
      ],
    });
    expect(result.plan.objects).toHaveLength(plan.objects.length + 1);
    for (const id of originalIds) {
      expect(result.plan.objects.some((object) => object.id === id)).toBe(true);
      const found = result.plan.objects.find((object) => object.id === id)!;
      expect(found.position).toEqual(originalPositions.get(id));
    }
    expect(result.summary).toContain("West Relief Shelter");
    expect(result.operations).toHaveLength(1);
  });

  it("applies compound reroutes and produces an app-derived summary", () => {
    const plan = fresh();
    const operations = [
      {
        op: "add_object" as const,
        object: {
          id: "shelter-west-relief",
          type: "shelter" as const,
          name: "West Relief Shelter",
          position: [-31, 0, 6] as [number, number, number],
          scale: [4.8, 3, 4.8] as [number, number, number],
        },
      },
      ...plan.agents
        .filter((agent) => agent.role === "resident")
        .map((agent) => ({
          op: "update_agent_goal" as const,
          id: agent.id,
          goal: "reach_shelter" as const,
          targetId: "shelter-west-relief",
        })),
    ];
    const result = applyScenePatch(plan, { operations });
    expect(result.plan.agents.every((agent) => agent.targetId === "shelter-west-relief")).toBe(true);
    expect(result.summary).toContain("Redirected 12 residents");
  });

  it("rejects an invalid patch atomically", () => {
    const plan = fresh();
    const before = structuredClone(plan);
    expect(() =>
      applyScenePatch(plan, {
        operations: [
          {
            op: "add_object",
            object: {
              id: "shelter-valid",
              type: "shelter",
              name: "Valid Shelter",
              position: [-30, 0, 5],
              scale: [4, 3, 4],
            },
          },
          { op: "update_object", id: "not-a-real-object", changes: { name: "Nope" } },
        ],
      }),
    ).toThrow(PatchError);
    expect(plan).toEqual(before);
  });

  it("rejects duplicate IDs and out-of-bounds additions", () => {
    const plan = fresh();
    expect(() =>
      applyScenePatch(plan, {
        operations: [
          {
            op: "add_object",
            object: {
              id: plan.objects[0].id,
              type: "shelter",
              name: "Duplicate",
              position: [0, 0, 0],
            },
          },
        ],
      }),
    ).toThrow(/already used/i);
    expect(() =>
      applyScenePatch(plan, {
        operations: [
          {
            op: "add_object",
            object: {
              id: "shelter-outside",
              type: "shelter",
              name: "Outside",
              position: [999, 0, 0],
            },
          },
        ],
      }),
    ).toThrow(/outside/i);
  });

  it("rejects removing the last evacuation shelter", () => {
    const plan = fresh();
    const shelters = plan.objects.filter(
      (object) => object.type === "shelter" && object.metadata?.rescueOnly !== true,
    );
    expect(shelters).toHaveLength(1);
    expect(() =>
      applyScenePatch(plan, {
        operations: [{ op: "remove_object", id: shelters[0].id }],
      }),
    ).toThrow(/at least one evacuation shelter/i);
  });

  it("rejects invalid goal targets", () => {
    const plan = fresh();
    expect(() =>
      applyScenePatch(plan, {
        operations: [
          {
            op: "update_agent_goal",
            id: plan.agents[0].id,
            goal: "reach_shelter",
            targetId: "house-mango",
          },
        ],
      }),
    ).toThrow(/must target a shelter/i);
  });

  it("updates a route status in the plan", () => {
    const plan = fresh();
    const result = applyScenePatch(plan, {
      operations: [{ op: "update_object", id: "road-market", changes: { status: "blocked" } }],
    });
    expect(result.plan.objects.find((object) => object.id === "road-market")?.status).toBe(
      "blocked",
    );
    expect(result.plan.objects.find((object) => object.id === "road-riverside")?.status).toBe(
      "normal",
    );
  });
});

describe("Local edit parser", () => {
  it("adds a west shelter and reroutes residents", () => {
    const plan = fresh();
    const result = localEdit(
      plan,
      "Add a second shelter to the west and reroute residents around the flooded road",
    );
    expect(result.supported).toBe(true);
    if (!result.supported) return;
    const applied = applyScenePatch(plan, { operations: result.operations });
    const shelter = applied.plan.objects.find(
      (object) => object.type === "shelter" && object.id.startsWith("shelter-relief"),
    );
    expect(shelter).toBeDefined();
    expect(shelter!.position[0]).toBeLessThan(0);
    expect(applied.plan.agents.every((agent) => agent.targetId === shelter!.id)).toBe(true);
  });

  it("adds a bridge over the canal", () => {
    const plan = fresh();
    const result = localEdit(plan, "Add a bridge north of the causeway");
    expect(result.supported).toBe(true);
    if (!result.supported) return;
    const applied = applyScenePatch(plan, { operations: result.operations });
    const bridges = applied.plan.objects.filter((object) => object.type === "bridge");
    expect(bridges).toHaveLength(2);
  });

  it("closes a named road", () => {
    const plan = fresh();
    const result = localEdit(plan, "Close Market Road");
    expect(result.supported).toBe(true);
    if (!result.supported) return;
    const applied = applyScenePatch(plan, { operations: result.operations });
    expect(applied.plan.objects.find((object) => object.id === "road-market")?.status).toBe(
      "blocked",
    );
  });

  it("returns a helpful unsupported response for an unrelated fantasy request", () => {
    const plan = fresh();
    const result = localEdit(plan, "Spawn a fire-breathing dragon over the school");
    expect(result.supported).toBe(false);
    if (result.supported) return;
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.reason.length).toBeGreaterThan(10);
  });

  it("does not mutate the input plan", () => {
    const plan = fresh();
    const before = structuredClone(plan);
    localEdit(plan, "Add 3 residents near the market");
    expect(plan).toEqual(before);
  });
});

describe("Summary construction", () => {
  it("uses actual entity names from the resulting plan", () => {
    const plan = fresh();
    const result = applyScenePatch(plan, {
      operations: [
        { op: "update_objective", id: "objective-evacuate", target: 10 },
        { op: "update_meta", title: "New Title" },
      ],
    });
    const summary = summarizePatch(plan, result.plan, result.operations);
    expect(summary).toContain("Updated the mission objective");
    expect(summary).toContain("Updated the world details");
  });
});
