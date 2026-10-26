import { z } from "zod";
import {
  AGENT_GOALS,
  AGENT_ROLES,
  AGENT_STATUSES,
  ENVIRONMENTS,
  EVENT_KINDS,
  OBJECT_TYPES,
  OBJECTIVE_KINDS,
} from "./types";

const finiteNumber = z.number().refine(Number.isFinite, "Must be a finite number");

export const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

export const SceneIdSchema = z
  .string()
  .min(1, "ID is required")
  .max(64)
  .regex(ID_PATTERN, "IDs may only contain letters, numbers, dashes and underscores");

const safeLabel = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((value) => !/[<>]/.test(value), "Labels may not contain HTML brackets");

export const Vec3Schema = z.tuple([finiteNumber, finiteNumber, finiteNumber]);

const metadataValue = z.union([z.string().max(120), finiteNumber, z.boolean()]);

const metadataSchema = z.record(z.string().max(40), metadataValue).optional();

export const WorldObjectSchema = z.object({
  id: SceneIdSchema,
  type: z.enum(OBJECT_TYPES),
  name: safeLabel,
  position: Vec3Schema,
  rotation: Vec3Schema.optional(),
  scale: Vec3Schema.optional(),
  status: z.enum(["normal", "blocked", "damaged", "active"]).optional(),
  metadata: metadataSchema,
});

export const WorldAgentSchema = z.object({
  id: SceneIdSchema,
  name: safeLabel,
  role: z.enum(AGENT_ROLES),
  position: Vec3Schema,
  goal: z.enum(AGENT_GOALS),
  status: z.enum(AGENT_STATUSES),
  targetId: SceneIdSchema.optional(),
  speed: finiteNumber.min(0.2).max(3),
  homeId: SceneIdSchema.optional(),
});

export const WorldObjectiveSchema = z.object({
  id: SceneIdSchema,
  description: z.string().trim().min(3).max(160).refine((v) => !/[<>]/.test(v)),
  kind: z.enum(OBJECTIVE_KINDS),
  target: finiteNumber.int().min(1).max(200).optional(),
});

export const WorldEventSchema = z.object({
  id: SceneIdSchema,
  kind: z.enum(EVENT_KINDS),
  atTick: finiteNumber.int().min(0).max(10000),
  targetId: SceneIdSchema.optional(),
  value: finiteNumber.min(0).max(5).optional(),
  description: z.string().trim().max(120).optional(),
});

export const SimulationSettingsSchema = z.object({
  waterStart: finiteNumber.min(0).max(2.5),
  waterRisePerTick: finiteNumber.min(0).max(0.2),
  waterMax: finiteNumber.min(0.2).max(4),
  tickMs: finiteNumber.int().min(120).max(3000),
  barrierDurationTicks: finiteNumber.int().min(10).max(1500),
  boatSpeed: finiteNumber.min(0.5).max(8),
  boatCapacity: finiteNumber.int().min(1).max(4),
});

export const WorldBoundsSchema = z.object({
  width: finiteNumber.min(30).max(110),
  depth: finiteNumber.min(30).max(110),
});

export const ResourceBudgetSchema = z.object({
  rescueBoats: finiteNumber.int().min(0).max(10),
  barriers: finiteNumber.int().min(0).max(10),
});

export const ScenePlanSchema = z
  .object({
    version: z.literal(1),
    title: safeLabel,
    description: z
      .string()
      .trim()
      .min(1)
      .max(400)
      .refine((v) => !/[<>]/.test(v), "Description may not contain HTML"),
    environment: z.enum(ENVIRONMENTS),
    worldBounds: WorldBoundsSchema,
    simulation: SimulationSettingsSchema,
    objects: z.array(WorldObjectSchema).min(1).max(100),
    agents: z.array(WorldAgentSchema).max(30),
    objectives: z.array(WorldObjectiveSchema).min(1).max(8),
    events: z.array(WorldEventSchema).max(40),
    resourceBudget: ResourceBudgetSchema,
  })
  .superRefine((plan, ctx) => {
    const seen = new Set<string>();
    const add = (id: string, path: (string | number)[]) => {
      if (seen.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate ID "${id}"`,
          path,
        });
      }
      seen.add(id);
    };

    plan.objects.forEach((object, index) => add(object.id, ["objects", index, "id"]));
    plan.agents.forEach((agent, index) => add(agent.id, ["agents", index, "id"]));
    plan.events.forEach((event, index) => add(event.id, ["events", index, "id"]));

    const halfWidth = plan.worldBounds.width / 2;
    const halfDepth = plan.worldBounds.depth / 2;

    plan.objects.forEach((object, index) => {
      const [, y, z] = object.position;
      const [x] = object.position;
      if (
        x < -halfWidth ||
        x > halfWidth ||
        z < -halfDepth ||
        z > halfDepth ||
        y < 0 ||
        y > 20
      ) {
        ctx.addIssue({
          code: "custom",
          message: `Object "${object.id}" is outside world bounds`,
          path: ["objects", index, "position"],
        });
      }
    });

    plan.agents.forEach((agent, index) => {
      const [x, y, z] = agent.position;
      if (
        x < -halfWidth ||
        x > halfWidth ||
        z < -halfDepth ||
        z > halfDepth ||
        y < 0 ||
        y > 20
      ) {
        ctx.addIssue({
          code: "custom",
          message: `Agent "${agent.id}" is outside world bounds`,
          path: ["agents", index, "position"],
        });
      }
    });

    const objectIds = new Set(plan.objects.map((object) => object.id));
    const agentIds = new Set(plan.agents.map((agent) => agent.id));

    plan.agents.forEach((agent, index) => {
      if (agent.targetId && !objectIds.has(agent.targetId) && !agentIds.has(agent.targetId)) {
        ctx.addIssue({
          code: "custom",
          message: `Agent "${agent.id}" targets an unknown entity`,
          path: ["agents", index, "targetId"],
        });
      }
    });

    plan.events.forEach((event, index) => {
      if (event.targetId && !objectIds.has(event.targetId)) {
        ctx.addIssue({
          code: "custom",
          message: `Event "${event.id}" targets an unknown object`,
          path: ["events", index, "targetId"],
        });
      }
    });
  });

export type ScenePlanInput = z.input<typeof ScenePlanSchema>;

const DraftObjectSchema = z.object({
  id: z.string().max(128).optional(),
  type: z.enum(OBJECT_TYPES),
  name: z.string().max(160).optional(),
  position: Vec3Schema,
  rotation: Vec3Schema.optional(),
  scale: Vec3Schema.optional(),
  status: z.enum(["normal", "blocked", "damaged", "active"]).optional(),
  metadata: z
    .record(z.string().max(40), z.union([z.string().max(160), z.number(), z.boolean()]))
    .optional(),
});

const DraftAgentSchema = z.object({
  id: z.string().max(128).optional(),
  name: z.string().max(160).optional(),
  role: z.enum(AGENT_ROLES).optional(),
  position: Vec3Schema,
  goal: z.enum(AGENT_GOALS).optional(),
  status: z.enum(AGENT_STATUSES).optional(),
  targetId: z.string().max(128).optional(),
  speed: finiteNumber.optional(),
  homeId: z.string().max(128).optional(),
});

const DraftObjectiveSchema = z.object({
  id: z.string().max(128).optional(),
  description: z.string().max(200).optional(),
  kind: z.enum(OBJECTIVE_KINDS).optional(),
  target: finiteNumber.optional(),
});

const DraftEventSchema = z.object({
  id: z.string().max(128).optional(),
  kind: z.enum(EVENT_KINDS),
  atTick: finiteNumber.optional(),
  targetId: z.string().max(128).optional(),
  value: finiteNumber.optional(),
  description: z.string().max(160).optional(),
});

export const ScenePlanDraftSchema = z.object({
  version: finiteNumber.optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(600).optional(),
  environment: z.enum(ENVIRONMENTS).optional(),
  worldBounds: z
    .object({
      width: finiteNumber.optional(),
      depth: finiteNumber.optional(),
    })
    .optional(),
  simulation: z
    .object({
      waterStart: finiteNumber.optional(),
      waterRisePerTick: finiteNumber.optional(),
      waterMax: finiteNumber.optional(),
      tickMs: finiteNumber.optional(),
      barrierDurationTicks: finiteNumber.optional(),
      boatSpeed: finiteNumber.optional(),
      boatCapacity: finiteNumber.optional(),
    })
    .optional(),
  objects: z.array(DraftObjectSchema).max(160),
  agents: z.array(DraftAgentSchema).max(50).optional(),
  objectives: z.array(DraftObjectiveSchema).max(12).optional(),
  events: z.array(DraftEventSchema).max(60).optional(),
  resourceBudget: z
    .object({
      rescueBoats: finiteNumber.optional(),
      barriers: finiteNumber.optional(),
    })
    .optional(),
});

export const PatchOperationSchema = z
  .discriminatedUnion("op", [
    z.object({
      op: z.literal("add_object"),
      object: WorldObjectSchema,
    }),
    z.object({
      op: z.literal("update_object"),
      id: SceneIdSchema,
      changes: z
        .object({
          name: safeLabel.optional(),
          position: Vec3Schema.optional(),
          rotation: Vec3Schema.optional(),
          scale: Vec3Schema.optional(),
          status: z.enum(["normal", "blocked", "damaged", "active"]).optional(),
          metadata: metadataSchema,
        })
        .refine((changes) => Object.keys(changes).length > 0, "No changes supplied"),
    }),
    z.object({
      op: z.literal("remove_object"),
      id: SceneIdSchema,
    }),
    z.object({
      op: z.literal("add_agent"),
      agent: WorldAgentSchema,
    }),
    z.object({
      op: z.literal("update_agent_goal"),
      id: SceneIdSchema,
      goal: z.enum(AGENT_GOALS),
      targetId: SceneIdSchema.optional(),
    }),
    z.object({
      op: z.literal("remove_agent"),
      id: SceneIdSchema,
    }),
    z.object({
      op: z.literal("add_event"),
      event: WorldEventSchema,
    }),
    z.object({
      op: z.literal("update_objective"),
      id: SceneIdSchema,
      description: safeLabel.optional(),
      target: finiteNumber.int().min(1).max(200).optional(),
    }),
    z.object({
      op: z.literal("update_meta"),
      title: safeLabel.optional(),
      description: z.string().trim().max(400).optional(),
      resourceBudget: ResourceBudgetSchema.partial().optional(),
    }),
  ])
  .refine((value) => value !== undefined, "Expected a supported operation");

export const ScenePatchSchema = z.object({
  operations: z.array(PatchOperationSchema).min(1).max(30),
});

export const GenerateRequestSchema = z.object({
  prompt: z.string().trim().min(3, "Describe the world you want").max(1200),
});

export const EditRequestSchema = z.object({
  prompt: z.string().trim().min(2, "Describe an edit").max(600),
  plan: ScenePlanSchema,
  selectedId: z.string().max(64).optional(),
  tick: z.number().int().min(0).max(100000).optional(),
});

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => {
      const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    })
    .join("; ");
}
