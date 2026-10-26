"use client";

import { create } from "zustand";
import { DEMO_PROMPT, getDemoPlan } from "./demo-plan";
import { calculateMetrics } from "./metrics";
import { ScenePlanSchema } from "./scene-schema";
import {
  beginSimulation,
  createInitialSimulation,
  deployBarrier as deployBarrierAction,
  dispatchBoat as dispatchBoatAction,
  pauseSimulation,
  rebaseSimulation,
  stepSimulation,
  toggleRoute as toggleRouteAction,
  toggleWaterHold as toggleWaterHoldAction,
} from "./simulation";
import type {
  CameraFocus,
  GenerationMode,
  Metrics,
  PlanSource,
  ScenePlan,
  Selection,
  SimulationState,
} from "./types";

export type ToastMessage = {
  id: number;
  kind: "info" | "success" | "error";
  text: string;
};

export type HistoryEntry = {
  id: number;
  kind: "generate" | "edit";
  prompt: string;
  summary: string;
  mode: GenerationMode | "builtin";
};

type WorldOpsStore = {
  plan: ScenePlan;
  sim: SimulationState;
  metrics: Metrics;
  source: PlanSource;
  sourceLabel: string;
  generationMode: GenerationMode | "builtin";
  notice: string | null;
  selected: Selection | null;
  focus: CameraFocus | null;
  speed: 1 | 2 | 4;
  worldNonce: number;
  isGenerating: boolean;
  isEditing: boolean;
  generationError: string | null;
  editError: string | null;
  editSuggestions: string[];
  editNotice: string | null;
  lastEditSummary: string | null;
  aiConfigured: boolean | null;
  history: HistoryEntry[];
  toast: ToastMessage | null;
  pressCount: number;

  loadPlan: (
    plan: ScenePlan,
    options: {
      source: PlanSource;
      sourceLabel: string;
      mode: GenerationMode | "builtin";
      notice: string;
    },
  ) => void;
  reset: () => void;
  start: () => void;
  pause: () => void;
  toggleRun: () => void;
  tick: () => void;
  setSpeed: (speed: 1 | 2 | 4) => void;
  toggleWaterHold: () => void;
  dispatchBoat: (agentId: string) => void;
  deployBarrier: (roadId: string) => void;
  toggleRoute: (roadId: string) => void;
  select: (selection: Selection | null, focus?: boolean) => void;
  setFocusTo: (target: [number, number, number]) => void;
  clearFocus: () => void;
  generate: (prompt: string) => Promise<void>;
  applyEdit: (prompt: string) => Promise<void>;
  loadDemo: (notice?: string) => void;
  setAiConfigured: (configured: boolean | null) => void;
  dismissToast: () => void;
  clearEditError: () => void;
};

let toastId = 1;
let historyId = 1;

const seededPlan = getDemoPlan();
const seededSim = createInitialSimulation(seededPlan);

function focusTargetFor(
  plan: ScenePlan,
  sim: SimulationState,
  selection: Selection,
): [number, number, number] {
  if (selection.kind === "object") {
    const object = plan.objects.find((entry) => entry.id === selection.id);
    if (object) return [object.position[0], 1, object.position[2]];
  }
  if (selection.kind === "agent") {
    const agent = sim.agents.find((entry) => entry.id === selection.id);
    if (agent) return [agent.position[0], 0.8, agent.position[1]];
  }
  if (selection.kind === "boat") {
    const boat = sim.boats.find((entry) => entry.id === selection.id);
    if (boat) return [boat.position[0], 0.6, boat.position[1]];
  }
  if (selection.kind === "barrier") {
    const barrier = sim.barriers.find((entry) => entry.id === selection.id);
    if (barrier) return [barrier.position[0], 0.5, barrier.position[1]];
  }
  return [0, 0, 0];
}

export const useWorldOps = create<WorldOpsStore>()((set, get) => ({
  plan: seededPlan,
  sim: seededSim,
  metrics: calculateMetrics(seededPlan, seededSim),
  source: "builtin",
  sourceLabel: "BUILT-IN SCENARIO",
  generationMode: "builtin",
  notice:
    "Built-in scenario staged. Press play, inspect a resident, or describe a new world.",
  selected: null,
  focus: null,
  speed: 1,
  worldNonce: 0,
  isGenerating: false,
  isEditing: false,
  generationError: null,
  editError: null,
  editSuggestions: [],
  editNotice: null,
  lastEditSummary: null,
  aiConfigured: null,
  history: [],
  toast: null,
  pressCount: 0,

  loadPlan: (plan, options) => {
    const sim = createInitialSimulation(plan);
    set((state) => ({
      plan,
      sim,
      metrics: calculateMetrics(plan, sim),
      source: options.source,
      sourceLabel: options.sourceLabel,
      generationMode: options.mode,
      notice: options.notice,
      selected: null,
      focus: null,
      worldNonce: state.worldNonce + 1,
      editError: null,
      editNotice: null,
      lastEditSummary: null,
      generationError: null,
      toast: {
        id: toastId++,
        kind: options.mode === "ai" ? "success" : "info",
        text:
          options.mode === "ai"
            ? "AI scene generated, validated and loaded."
            : "Scenario loaded.",
      },
    }));
  },

  reset: () => {
    const { plan } = get();
    const sim = createInitialSimulation(plan);
    set((state) => ({
      sim,
      metrics: calculateMetrics(plan, sim),
      focus: null,
      worldNonce: state.worldNonce + 1,
      editError: null,
      toast: { id: toastId++, kind: "info", text: "Scenario reset. Nothing has happened yet." },
    }));
  },

  start: () => {
    const { plan, sim } = get();
    if (sim.status === "running") return;
    const next = beginSimulation(sim);
    set({
      sim: next,
      metrics: calculateMetrics(plan, next),
      toast: { id: toastId++, kind: "info", text: "Simulation running." },
    });
  },

  pause: () => {
    const { plan, sim } = get();
    if (sim.status !== "running") return;
    const next = pauseSimulation(sim);
    set({
      sim: next,
      metrics: calculateMetrics(plan, next),
      toast: { id: toastId++, kind: "info", text: "Simulation paused." },
    });
  },

  toggleRun: () => {
    const { sim } = get();
    if (sim.status === "running") get().pause();
    else get().start();
  },

  tick: () => {
    const { plan, sim } = get();
    if (sim.status !== "running") return;
    const next = stepSimulation(plan, sim);
    const metrics = calculateMetrics(plan, next);
    set({ sim: next, metrics });
    if (next.status === "success") {
      set({
        toast: {
          id: toastId++,
          kind: "success",
          text: "Evacuation complete — every resident is safe.",
        },
      });
    } else if (next.status === "failed") {
      set({
        toast: {
          id: toastId++,
          kind: "error",
          text: "Rescue window closed. Reset and try a different plan.",
        },
      });
    }
  },

  setSpeed: (speed) => set({ speed }),

  toggleWaterHold: () => {
    const { plan, sim } = get();
    const result = toggleWaterHoldAction(sim);
    set({
      sim: result.state,
      metrics: calculateMetrics(plan, result.state),
      toast: { id: toastId++, kind: "info", text: result.message },
    });
  },

  dispatchBoat: (agentId) => {
    const { plan, sim } = get();
    const result = dispatchBoatAction(plan, sim, agentId);
    set({
      sim: result.state,
      metrics: calculateMetrics(plan, result.state),
      toast: {
        id: toastId++,
        kind: result.ok ? "success" : "error",
        text: result.message,
      },
    });
  },

  deployBarrier: (roadId) => {
    const { plan, sim } = get();
    const result = deployBarrierAction(plan, sim, roadId);
    set({
      sim: result.state,
      metrics: calculateMetrics(plan, result.state),
      toast: {
        id: toastId++,
        kind: result.ok ? "success" : "error",
        text: result.message,
      },
    });
  },

  toggleRoute: (roadId) => {
    const { plan, sim } = get();
    const result = toggleRouteAction(plan, sim, roadId);
    if (!result.ok) {
      set({ toast: { id: toastId++, kind: "error", text: result.message } });
      return;
    }
    const nextPlan = structuredClone(plan);
    const object = nextPlan.objects.find((entry) => entry.id === roadId);
    if (object) {
      object.status = result.state.roads[roadId]?.blockedBy ? "blocked" : "normal";
    }
    set({
      plan: nextPlan,
      sim: result.state,
      metrics: calculateMetrics(nextPlan, result.state),
      toast: { id: toastId++, kind: "success", text: result.message },
    });
  },

  select: (selection, focus = false) => {
    const { plan, sim } = get();
    if (!selection) {
      set({ selected: null });
      return;
    }
    const target = focusTargetFor(plan, sim, selection);
    set({
      selected: selection,
      focus: focus
        ? { target, nonce: (get().focus?.nonce ?? 0) + 1 }
        : get().focus,
    });
  },

  setFocusTo: (target) =>
    set({ focus: { target, nonce: (get().focus?.nonce ?? 0) + 1 } }),

  clearFocus: () => set({ focus: null }),

  generate: async (prompt) => {
    if (get().isGenerating) return;
    const trimmed = prompt.trim();
    if (trimmed.length < 3) {
      set({
        generationError: "Describe the world in a little more detail.",
      });
      return;
    }
    set({ isGenerating: true, generationError: null, notice: null });
    try {
      const response = await fetch("/api/generate-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error("The scene service returned an unreadable response.");
      }
      if (!response.ok) {
        const error =
          payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "Scene generation failed.";
        throw new Error(error);
      }
      const data = payload as {
        plan?: unknown;
        mode?: GenerationMode;
        notice?: string;
        sourceLabel?: string;
      };
      const parsed = ScenePlanSchema.safeParse(data.plan);
      if (!parsed.success) {
        throw new Error("The scene service returned an invalid plan.");
      }
      const mode = data.mode ?? "fallback";
      get().loadPlan(parsed.data, {
        source: mode === "ai" ? "ai" : mode === "local" ? "local" : "fallback",
        sourceLabel: data.sourceLabel ?? (mode === "ai" ? "AI GENERATED" : "BUILT-IN FALLBACK"),
        mode,
        notice: data.notice ?? "Scene loaded.",
      });
      set((state) => ({
        history: [
          {
            id: historyId++,
            kind: "generate" as const,
            prompt: trimmed,
            summary:
              mode === "ai"
                ? "AI-generated scene validated"
                : mode === "local"
                  ? "Built-in scenario loaded (local mode)"
                  : "Built-in fallback loaded",
            mode,
          },
          ...state.history,
        ].slice(0, 6),
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Scene generation failed.";
      set({
        generationError: message,
        toast: { id: toastId++, kind: "error", text: message },
      });
    } finally {
      set({ isGenerating: false });
    }
  },

  applyEdit: async (prompt) => {
    if (get().isEditing) return;
    const trimmed = prompt.trim();
    const { plan, sim, selected } = get();
    if (trimmed.length < 2) {
      set({ editError: "Describe the change you want to make." });
      return;
    }
    set({ isEditing: true, editError: null, editSuggestions: [], editNotice: null });
    try {
      const response = await fetch("/api/edit-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          plan,
          selectedId: selected?.kind === "object" ? selected.id : undefined,
          tick: sim.tick,
        }),
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error("The edit service returned an unreadable response.");
      }
      if (!response.ok) {
        const errorPayload = payload as {
          error?: unknown;
          suggestions?: unknown;
        };
        const message =
          typeof errorPayload.error === "string"
            ? errorPayload.error
            : "The edit was rejected.";
        const suggestions = Array.isArray(errorPayload.suggestions)
          ? errorPayload.suggestions.filter(
              (entry): entry is string => typeof entry === "string",
            )
          : [];
        set({
          editError: message,
          editSuggestions: suggestions,
          toast: { id: toastId++, kind: "error", text: message },
        });
        return;
      }
      const data = payload as {
        plan?: unknown;
        summary?: string;
        mode?: GenerationMode;
        notice?: string;
      };
      const parsed = ScenePlanSchema.safeParse(data.plan);
      if (!parsed.success) {
        throw new Error("The edit service returned an invalid plan.");
      }
      const summary = data.summary?.trim() || "World edit applied.";
      const nextSim = rebaseSimulation(
        parsed.data,
        sim,
        `Edit applied: ${summary}`,
      );
      const selectionStillExists =
        selected === null ||
        (selected.kind === "object" &&
          parsed.data.objects.some((object) => object.id === selected.id)) ||
        (selected.kind === "agent" &&
          nextSim.agents.some((agent) => agent.id === selected.id));
      set((state) => ({
        plan: parsed.data,
        sim: nextSim,
        metrics: calculateMetrics(parsed.data, nextSim),
        selected: selectionStillExists ? selected : null,
        source: state.source === "ai" ? "ai" : "edited",
        editNotice: summary,
        lastEditSummary: summary,
        notice: data.notice ?? "Edit applied.",
        history: [
          {
            id: historyId++,
            kind: "edit" as const,
            prompt: trimmed,
            summary,
            mode: data.mode ?? "fallback",
          },
          ...state.history,
        ].slice(0, 6),
        toast: { id: toastId++, kind: "success", text: summary },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The edit failed.";
      set({
        editError: message,
        toast: { id: toastId++, kind: "error", text: message },
      });
    } finally {
      set({ isEditing: false });
    }
  },

  loadDemo: (notice) => {
    const plan = getDemoPlan();
    get().loadPlan(plan, {
      source: "builtin",
      sourceLabel: "BUILT-IN SCENARIO",
      mode: "builtin",
      notice:
        notice ??
        "Built-in Rising Tide scenario loaded. Press play, intervene, or describe a new world.",
    });
  },

  setAiConfigured: (configured) => set({ aiConfigured: configured }),

  dismissToast: () => set({ toast: null }),

  clearEditError: () => set({ editError: null, editSuggestions: [] }),
}));

export { DEMO_PROMPT };
