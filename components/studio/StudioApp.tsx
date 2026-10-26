"use client";

import { useEffect, useState } from "react";
import { useWorldOps } from "@/lib/store";
import WorldCanvas from "../WorldCanvas";
import GuideModal from "../GuideModal";
import Toast from "../Toast";
import PlacementHint from "../PlacementHint";
import StudioHeader from "./StudioHeader";
import WelcomeView from "./WelcomeView";
import AgentPanel from "./AgentPanel";
import LayersPanel from "./LayersPanel";
import ToolRail from "./ToolRail";
import StudioInspector from "./StudioInspector";
import BuildBar from "./BuildBar";
import RunBar from "./RunBar";

export default function StudioApp() {
  const [guideOpen, setGuideOpen] = useState(false);
  const view = useWorldOps((state) => state.view);
  const leftTab = useWorldOps((state) => state.leftTab);
  const selected = useWorldOps((state) => state.selected);
  const placementTool = useWorldOps((state) => state.placementTool);
  const plan = useWorldOps((state) => state.plan);
  const sim = useWorldOps((state) => state.sim);
  const metrics = useWorldOps((state) => state.metrics);
  const setLeftTab = useWorldOps((state) => state.setLeftTab);
  const setAiStatus = useWorldOps((state) => state.setAiStatus);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __worldopsStore?: typeof useWorldOps }).__worldopsStore =
        useWorldOps;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { aiConfigured?: unknown; model?: unknown } | null) => {
        if (cancelled) return;
        if (payload && typeof payload.aiConfigured === "boolean") {
          setAiStatus(
            payload.aiConfigured,
            typeof payload.model === "string" ? payload.model : null,
          );
        } else {
          setAiStatus(null, null);
        }
      })
      .catch(() => {
        if (!cancelled) setAiStatus(null, null);
      });
    return () => {
      cancelled = true;
    };
  }, [setAiStatus]);

  useEffect(() => {
    if (sim.status !== "running") return;
    const interval = window.setInterval(() => {
      useWorldOps.getState().tick();
    }, Math.max(90, plan.simulation.tickMs / useWorldOps.getState().speed));
    return () => window.clearInterval(interval);
  }, [sim.status, plan.simulation.tickMs]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      const state = useWorldOps.getState();
      if (event.code === "Space" && state.view !== "welcome") {
        event.preventDefault();
        if (state.sim.status === "running") state.pause();
        else if (state.sim.status !== "success" && state.sim.status !== "failed") {
          state.start();
        }
      }
      if (event.key === "Escape") {
        if (state.placementTool) state.cancelPlacement();
        else if (state.selected) state.select(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className="studio-root"
      data-view={view}
      data-tick={sim.tick}
      data-safe={metrics.safeResidents}
      data-danger={metrics.inDangerResidents}
      data-status={sim.status}
      data-objects={plan.objects.length}
      data-title={plan.title}
    >
      <StudioHeader onOpenGuide={() => setGuideOpen(true)} />

      <main className="studio-main">
        <div className="studio-stage">
          <WorldCanvas />

          {view === "welcome" ? <WelcomeView /> : null}

          {view === "build" ? (
            <aside className="studio-left" aria-label="Studio panels">
              <div className="studio-left-tabs" role="tablist" aria-label="Agent and layers">
                <button
                  type="button"
                  role="tab"
                  aria-selected={leftTab === "agent"}
                  className={leftTab === "agent" ? "on" : ""}
                  onClick={() => setLeftTab("agent")}
                >
                  Agent
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={leftTab === "layers"}
                  className={leftTab === "layers" ? "on" : ""}
                  onClick={() => setLeftTab("layers")}
                >
                  Layers
                </button>
              </div>
              <div className="studio-left-body">
                {leftTab === "agent" ? <AgentPanel /> : <LayersPanel />}
              </div>
            </aside>
          ) : null}

          {view === "build" ? <ToolRail /> : null}
          {selected && view !== "welcome" ? <StudioInspector /> : null}
          {view === "build" && placementTool ? <PlacementHint /> : null}

          {view === "build" ? <BuildBar /> : null}
          {view === "run" ? <RunBar /> : null}
        </div>
      </main>

      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
      <Toast />
    </div>
  );
}
