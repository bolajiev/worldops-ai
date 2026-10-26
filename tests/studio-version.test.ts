import { describe, expect, it } from "vitest";
import { getDemoPlan } from "../lib/demo-plan";
import {
  VERSION_LIMIT,
  appendVersion,
  makeVersion,
  nextVersionLabel,
  nextVersionNumber,
  sourceLabelFor,
} from "../lib/studio";

describe("Studio versions", () => {
  it("snapshots a plan without sharing mutable references", () => {
    const plan = getDemoPlan();
    const version = makeVersion(plan, "v1", "Rising Tide · example", "example", "v1");
    plan.title = "Mutated original";
    plan.objects[0].name = "Mutated object";
    expect(version.plan.title).toBe("Rising Tide");
    expect(version.plan.objects[0].name).not.toBe("Mutated object");
    expect(version.source).toBe("example");
  });

  it("appends versions and drops the oldest beyond the cap", () => {
    const plan = getDemoPlan();
    let versions = Array.from({ length: VERSION_LIMIT }, (_, index) =>
      makeVersion(plan, `v${index + 1}`, `Version ${index + 1}`, "manual", `id-${index}`),
    );
    const newest = makeVersion(plan, "v25", "Newest", "ai", "id-new");
    versions = appendVersion(versions, newest);
    expect(versions).toHaveLength(VERSION_LIMIT);
    expect(versions[0].id).toBe("id-1");
    expect(versions[versions.length - 1].id).toBe("id-new");
  });

  it("computes the next label without reusing numbers", () => {
    const plan = getDemoPlan();
    const versions = [
      makeVersion(plan, "v2", "Two", "manual", "1"),
      makeVersion(plan, "v9", "Nine", "ai", "2"),
    ];
    expect(nextVersionNumber(versions)).toBe(10);
    expect(nextVersionLabel(versions)).toBe("v10");
    expect(sourceLabelFor("ai")).toBe("AI");
    expect(sourceLabelFor("restore")).toBe("Restored");
  });

  it("does not mutate the version array on append", () => {
    const plan = getDemoPlan();
    const versions = [makeVersion(plan, "v1", "One", "example", "1")];
    const next = makeVersion(plan, "v2", "Two", "manual", "2");
    const result = appendVersion(versions, next);
    expect(versions).toHaveLength(1);
    expect(result).toHaveLength(2);
  });
});
