import type {
  PatchOperation,
  ScenePlan,
  Vec3,
  WorldAgent,
  WorldObject,
  WorldObjectType,
} from "./types";

export type LocalEditResult =
  | { supported: true; operations: PatchOperation[] }
  | { supported: false; reason: string; suggestions: string[] };

const DEFAULT_SUGGESTIONS = [
  "Add a second shelter to the west",
  "Reroute residents to the west shelter",
  "Add a bridge north of the causeway",
  "Close Market Road",
];

const RESIDENT_NAMES = [
  "Sade",
  "Uche",
  "Yemi",
  "Nneka",
  "Kelechi",
  "Ayo",
  "Dayo",
  "Chinwe",
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nextId(plan: ScenePlan, base: string): string {
  const used = new Set([
    ...plan.objects.map((object) => object.id),
    ...plan.agents.map((agent) => agent.id),
    ...plan.events.map((event) => event.id),
  ]);
  if (!used.has(base)) return base;
  let index = 2;
  while (used.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function directionFromPrompt(prompt: string): "west" | "east" | "north" | "south" | null {
  if (/\bwest(?:ern|ward)?\b/.test(prompt)) return "west";
  if (/\beast(?:ern|ward)?\b/.test(prompt)) return "east";
  if (/\bnorth(?:ern|ward)?\b/.test(prompt)) return "north";
  if (/\bsouth(?:ern|ward)?\b/.test(prompt)) return "south";
  return null;
}

function buildingFootprints(plan: ScenePlan): WorldObject[] {
  return plan.objects.filter((object) =>
    ["house", "school", "clinic", "shelter", "factory"].includes(object.type),
  );
}

function spotIsFree(plan: ScenePlan, x: number, z: number, radius = 5): boolean {
  return !buildingFootprints(plan).some(
    (object) =>
      Math.hypot(object.position[0] - x, object.position[2] - z) <
      radius + (object.scale?.[0] ?? 4) / 2,
  );
}

function findPlacement(
  plan: ScenePlan,
  preferred: [number, number],
  radius = 5,
): [number, number] {
  const candidates: Array<[number, number]> = [
    preferred,
    [preferred[0], preferred[1] + 8],
    [preferred[0], preferred[1] - 8],
    [preferred[0] + 8, preferred[1]],
    [preferred[0] - 8, preferred[1]],
    [preferred[0], preferred[1] + 16],
    [preferred[0], preferred[1] - 16],
  ];
  const halfWidth = plan.worldBounds.width / 2 - 4;
  const halfDepth = plan.worldBounds.depth / 2 - 4;
  for (const [rawX, rawZ] of candidates) {
    const x = clamp(rawX, -halfWidth, halfWidth);
    const z = clamp(rawZ, -halfDepth, halfDepth);
    if (spotIsFree(plan, x, z, radius)) return [x, z];
  }
  return [
    clamp(preferred[0], -halfWidth, halfWidth),
    clamp(preferred[1], -halfDepth, halfDepth),
  ];
}

function placementForDirection(
  plan: ScenePlan,
  direction: "west" | "east" | "north" | "south" | null,
  selectedId?: string,
): [number, number] {
  const selected = selectedId
    ? plan.objects.find((object) => object.id === selectedId)
    : undefined;
  const halfWidth = plan.worldBounds.width / 2;
  const halfDepth = plan.worldBounds.depth / 2;
  const anchorZ = selected ? selected.position[2] : 8;
  const anchorX = selected ? selected.position[0] : 0;

  if (direction === "west") return findPlacement(plan, [-halfWidth + 5, anchorZ]);
  if (direction === "east") return findPlacement(plan, [halfWidth - 7, anchorZ]);
  if (direction === "north") return findPlacement(plan, [anchorX, -halfDepth + 7]);
  if (direction === "south") return findPlacement(plan, [anchorX, halfDepth - 7]);
  return findPlacement(plan, [anchorX - 9, anchorZ + 6]);
}

function resolveRoute(
  plan: ScenePlan,
  prompt: string,
  selectedId?: string,
): WorldObject | undefined {
  const routes = plan.objects.filter(
    (object) => object.type === "road" || object.type === "bridge",
  );
  const selected = routes.find((object) => object.id === selectedId);
  if (selected) return selected;
  if (/\bbridge|causeway\b/.test(prompt)) {
    const bridge = routes.find((object) => object.type === "bridge");
    if (bridge) return bridge;
  }
  for (const route of routes) {
    const name = route.name.toLowerCase();
    if (name.split(/\s+/).some((word) => word.length > 3 && prompt.includes(word))) {
      return route;
    }
  }
  return routes.find((object) => object.type === "road") ?? routes[0];
}

function routeUpdatesForReroute(
  plan: ScenePlan,
  shelterId: string,
): PatchOperation[] {
  return plan.agents
    .filter((agent) => agent.role === "resident")
    .map((agent) => ({
      op: "update_agent_goal" as const,
      id: agent.id,
      goal: "reach_shelter" as const,
      targetId: shelterId,
    }));
}

function shelterForDirection(
  plan: ScenePlan,
  direction: "west" | "east" | "north" | "south" | null,
  selectedId?: string,
): WorldObject | undefined {
  const shelters = plan.objects.filter(
    (object) =>
      object.type === "shelter" && object.metadata?.rescueOnly !== true,
  );
  if (selectedId) {
    const selected = shelters.find((shelter) => shelter.id === selectedId);
    if (selected) return selected;
  }
  if (!direction) return shelters[0];
  const score = (shelter: WorldObject): number => {
    if (direction === "west") return -shelter.position[0];
    if (direction === "east") return shelter.position[0];
    if (direction === "north") return -shelter.position[2];
    return shelter.position[2];
  };
  return [...shelters].sort((a, b) => score(b) - score(a))[0];
}

function addObject(
  plan: ScenePlan,
  type: WorldObjectType,
  name: string,
  position: [number, number],
  scale: Vec3,
  metadata?: Record<string, string | number | boolean>,
): WorldObject {
  return {
    id: nextId(plan, `${type}-relief`),
    type,
    name,
    position: [position[0], 0, position[1]],
    scale,
    status: "normal",
    metadata,
  };
}

export function localEdit(
  plan: ScenePlan,
  rawPrompt: string,
  selectedId?: string,
): LocalEditResult {
  const prompt = rawPrompt.toLowerCase().trim();
  if (!prompt) {
    return {
      supported: false,
      reason: "Describe the change you want to make.",
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }

  const direction = directionFromPrompt(prompt);
  const selectedObject = selectedId
    ? plan.objects.find((object) => object.id === selectedId)
    : undefined;

  const wantsShelter =
    /\b(add|create|place|build|put|make)\b/.test(prompt) &&
    /\bshelter|refuge|safe house\b/.test(prompt);
  const wantsBridge =
    /\b(add|create|place|build|put|make)\b/.test(prompt) &&
    /\bbridge|crossing\b/.test(prompt);

  if (wantsShelter) {
    const [x, z] = placementForDirection(plan, direction, selectedId);
    const label =
      direction === "west"
        ? "West Relief Shelter"
        : direction === "east"
          ? "East Relief Shelter"
          : direction === "north"
            ? "North Relief Shelter"
            : direction === "south"
              ? "South Relief Shelter"
              : "Relief Shelter";
    const shelter = addObject(plan, "shelter", label, [x, z], [4.8, 3, 4.8], {
      capacity: 24,
      editor: "local",
    });
    const operations: PatchOperation[] = [
      { op: "add_object", object: shelter },
    ];

    const wantsReroute =
      /\b(reroute|redirect|move|send|direct|evacuate)\b/.test(prompt) ||
      /\ball residents\b/.test(prompt) ||
      /\beveryone\b/.test(prompt);
    if (wantsReroute) {
      operations.push(...routeUpdatesForReroute(plan, shelter.id));
    }
    return { supported: true, operations };
  }

  if (wantsBridge) {
    const water = plan.objects.find((object) => object.type === "water");
    if (water) {
      const z = direction === "north" ? -10 : direction === "south" ? 16 : -9;
      const bridge = addObject(
        plan,
        "bridge",
        direction === "north" ? "North Relief Bridge" : "Relief Bridge",
        [water.position[0], z],
        [8, 0.32, 5],
        { clearance: 0.55, editor: "local" },
      );
      return { supported: true, operations: [{ op: "add_object", object: bridge }] };
    }
    const [x, z] = findPlacement(plan, [0, -8]);
    return {
      supported: true,
      operations: [
        {
          op: "add_object",
          object: addObject(plan, "bridge", "Relief Bridge", [x, z], [8, 0.32, 5], {
            clearance: 0.62,
            editor: "local",
          }),
        },
      ],
    };
  }

  const wantsBlock = /\b(block|close|shut|barricade|impassable)\b/.test(prompt);
  const wantsOpen = /\b(open|reopen|clear|unblock)\b/.test(prompt);
  if ((wantsBlock || wantsOpen) && /\broad|bridge|route|causeway|lane\b/.test(prompt)) {
    const route = resolveRoute(plan, prompt, selectedId);
    if (!route) {
      return {
        supported: false,
        reason: "There is no road or bridge to change.",
        suggestions: DEFAULT_SUGGESTIONS,
      };
    }
    return {
      supported: true,
      operations: [
        {
          op: "update_object",
          id: route.id,
          changes: { status: wantsOpen ? "normal" : "blocked" },
        },
      ],
    };
  }

  const wantsReroute =
    /\b(reroute|redirect|send|move|direct)\b/.test(prompt) &&
    /\b(resident|residents|people|everyone|evacuee)\b/.test(prompt);
  if (wantsReroute) {
    let target = shelterForDirection(plan, direction, selectedObject?.type === "shelter" ? selectedObject.id : selectedId);
    if (!target && direction) {
      const [x, z] = placementForDirection(plan, direction, selectedId);
      target = addObject(plan, "shelter", "Relief Shelter", [x, z], [4.8, 3, 4.8], {
        capacity: 24,
        editor: "local",
      });
      const operations: PatchOperation[] = [
        { op: "add_object", object: target },
        ...routeUpdatesForReroute(plan, target.id),
      ];
      return { supported: true, operations };
    }
    if (!target) {
      return {
        supported: false,
        reason: "I could not find a shelter to send residents to.",
        suggestions: DEFAULT_SUGGESTIONS,
      };
    }
    return {
      supported: true,
      operations: routeUpdatesForReroute(plan, target.id),
    };
  }

  const wantsHouse =
    /\b(add|create|place|build|put|make)\b/.test(prompt) &&
    /\bhouse|home|dwelling\b/.test(prompt);
  if (wantsHouse) {
    const [x, z] = placementForDirection(plan, direction, selectedId);
    const house = addObject(plan, "house", "Relief House", [x, z], [4.4, 3.4, 4.4]);
    return { supported: true, operations: [{ op: "add_object", object: house }] };
  }

  const wantsClinic =
    /\b(add|create|place|build|put|make)\b/.test(prompt) &&
    /\bclinic|hospital|medical\b/.test(prompt);
  if (wantsClinic) {
    const [x, z] = placementForDirection(plan, direction, selectedId);
    const clinic = addObject(plan, "clinic", "Relief Clinic", [x, z], [5.6, 3.8, 5.2], {
      beds: 6,
    });
    return { supported: true, operations: [{ op: "add_object", object: clinic }] };
  }

  const wantsSchool =
    /\b(add|create|place|build|put|make)\b/.test(prompt) &&
    /\bschool|classroom\b/.test(prompt);
  if (wantsSchool) {
    const [x, z] = placementForDirection(plan, direction, selectedId);
    const school = addObject(plan, "school", "Relief School", [x, z], [8, 4, 5], {
      occupancy: 0,
    });
    return { supported: true, operations: [{ op: "add_object", object: school }] };
  }

  const addResidentMatch = prompt.match(
    /\b(?:add|create)\s+(a|one|two|three|four|five|\d+)\s+(?:more\s+)?(?:resident|person|evacuee|villager)s?\b/,
  );
  if (addResidentMatch) {
    const wordToNumber: Record<string, number> = {
      a: 1,
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
    };
    const requested = wordToNumber[addResidentMatch[1]] ?? Number(addResidentMatch[1]);
    const count = Math.min(
      Number.isFinite(requested) ? requested : 1,
      Math.max(0, 30 - plan.agents.length),
      6,
    );
    if (count <= 0) {
      return {
        supported: false,
        reason: "This scene already has the maximum number of agents.",
        suggestions: DEFAULT_SUGGESTIONS,
      };
    }
    const house = plan.objects.find((object) => object.type === "house");
    const base = house
      ? [house.position[0], house.position[2] + 3]
      : [0, 0];
    const working = structuredClone(plan);
    const operations: PatchOperation[] = [];
    for (let index = 0; index < count; index += 1) {
      const agent: WorldAgent = {
        id: nextId(working, `resident-extra-${index + 1}`),
        name: RESIDENT_NAMES[index % RESIDENT_NAMES.length],
        role: "resident",
        position: [base[0] + index * 0.8, 0, base[1] + index * 0.8],
        goal: "reach_shelter",
        status: "idle",
        speed: 0.8,
        homeId: house?.id,
      };
      working.agents.push(agent);
      operations.push({ op: "add_agent", agent });
    }
    return { supported: true, operations };
  }

  const wantsRemove = /\b(remove|delete|delete this|take away)\b/.test(prompt);
  if (wantsRemove) {
    let target = selectedId
      ? plan.objects.find((object) => object.id === selectedId)
      : undefined;
    if (!target) {
      if (/\bhouse\b/.test(prompt)) {
        target = plan.objects.find((object) => object.type === "house");
      } else if (/\btree\b/.test(prompt)) {
        target = plan.objects.find((object) => object.type === "tree");
      } else if (/\bbridge\b/.test(prompt)) {
        target = plan.objects.find((object) => object.type === "bridge");
      }
    }
    if (target) {
      return {
        supported: true,
        operations: [{ op: "remove_object", id: target.id }],
      };
    }
  }

  if (/\b(barrier|sandbag|levee)\b/.test(prompt)) {
    return {
      supported: false,
      reason:
        "Sandbag barriers are deployed from the simulation so the engine can track their countdown. Select a road and use “Deploy barrier”.",
      suggestions: [
        "Select Old Causeway, then deploy a barrier",
        "Add a second shelter to the west",
      ],
    };
  }

  if (/\b(water|flood)\b/.test(prompt) && /\b(raise|stop|hold|lower|pause)\b/.test(prompt)) {
    return {
      supported: false,
      reason:
        "The flood is controlled by the simulation, not the scene planner. Use the flood-gate control in the simulation bar.",
      suggestions: ["Hold the water rise", "Add a second shelter to the west"],
    };
  }

  return {
    supported: false,
    reason:
      "The local editor only understands a small set of scene changes. Connect an LLM key for open-ended edits, or try one of the suggestions.",
    suggestions: DEFAULT_SUGGESTIONS,
  };
}
