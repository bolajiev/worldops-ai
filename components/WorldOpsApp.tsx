"use client";

import { useEffect, useState } from "react";
import { useWorldOps } from "@/lib/store";
import Header from "./Header";
import GuideModal from "./GuideModal";
import Toast from "./Toast";
import PlacementHint from "./PlacementHint";
import FloodHud from "./FloodHud";
import SimulationBar from "./SimulationBar";
import CommandDeck from "./CommandDeck";
import RightRail from "./RightRail";
import WorldCanvas from "./WorldCanvas";

export default function WorldOpsApp() {
  const [guideOpen, setGuideOpen] = useState(false);
  const status = useWorldOps((state) => state.sim.status);
  const tickMs = useWorldOps((state) => state.plan.simulation.tickMs);
  const speed = useWorldOps((state) => state.speed);
  const setAiStatus = useWorldOps((state) => state.setAiStatus);
  const plan = useWorldOps((state) => state.plan);
  const metrics = useWorldOps((state) => state.metrics);
  const sim = useWorldOps((state) => state.sim);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (
        window as unknown as { __worldopsStore?: typeof useWorldOps }
      ).__worldopsStore = useWorldOps;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (payload: { aiConfigured?: unknown; model?: unknown } | null) => {
          if (cancelled) return;
          if (payload && typeof payload.aiConfigured === "boolean") {
            setAiStatus(
              payload.aiConfigured,
              typeof payload.model === "string" ? payload.model : null,
            );
          } else {
            setAiStatus(null, null);
          }
        },
      )
      .catch(() => {
        if (!cancelled) setAiStatus(null, null);
      });
    return () => {
      cancelled = true;
    };
  }, [setAiStatus]);

  useEffect(() => {
    if (status !== "running") return;
    const interval = window.setInterval(() => {
      useWorldOps.getState().tick();
    }, Math.max(90, tickMs / speed));
    return () => window.clearInterval(interval);
  }, [status, tickMs, speed]);

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
      if (event.code === "Space") {
        event.preventDefault();
        const state = useWorldOps.getState();
        if (state.sim.status === "running") state.pause();
        else if (state.sim.status !== "success" && state.sim.status !== "failed") {
          state.start();
        }
      }
      if (event.key === "Escape") {
        const state = useWorldOps.getState();
        if (state.placementTool) state.cancelPlacement();
        else state.select(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className="app-shell"
      data-tick={sim.tick}
      data-safe={metrics.safeResidents}
      data-danger={metrics.inDangerResidents}
      data-status={sim.status}
      data-objects={plan.objects.length}
      data-boats={metrics.boatsRemaining}
      data-barriers={metrics.barriersRemaining}
      data-title={plan.title}
    >
      <Header onOpenGuide={() => setGuideOpen(true)} />
      <main className="stage">
        <WorldCanvas />
        <FloodHud />

        <aside className="left-rail" aria-label="World commands">
          <CommandDeck />
          <div className="stage-disclaimer">
            Experimental educational simulation. Not validated for real-world emergency
            response. Outcomes are computed from this app&apos;s own ruleset.
          </div>
        </aside>

        <RightRail />

        <PlacementHint />
        <SimulationBar />
        <Toast />
      </main>
      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
