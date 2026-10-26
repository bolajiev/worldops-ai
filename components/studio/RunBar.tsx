"use client";

import { useEffect, useState } from "react";
import { useWorldOps } from "@/lib/store";
import { getRoadStatus } from "@/lib/metrics";
import {
  BoatIcon,
  ChevronIcon,
  CloseIcon,
  PauseIcon,
  PlayIcon,
  ResetIcon,
  WaterIcon,
} from "../ui/Icons";

type Drawer = "risk" | "routes" | "events" | null;

const STATUS_LABEL: Record<string, string> = {
  ready: "Ready",
  running: "Live",
  paused: "Paused",
  success: "Evacuation complete",
  failed: "Unresolved",
};

export default function RunBar() {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const plan = useWorldOps((state) => state.plan);
  const sim = useWorldOps((state) => state.sim);
  const metrics = useWorldOps((state) => state.metrics);
  const speed = useWorldOps((state) => state.speed);
  const start = useWorldOps((state) => state.start);
  const pause = useWorldOps((state) => state.pause);
  const reset = useWorldOps((state) => state.reset);
  const setSpeed = useWorldOps((state) => state.setSpeed);
  const toggleWaterHold = useWorldOps((state) => state.toggleWaterHold);
  const dispatchBoat = useWorldOps((state) => state.dispatchBoat);
  const select = useWorldOps((state) => state.select);

  const finished = sim.status === "success" || sim.status === "failed";
  const running = sim.status === "running";
  const atRisk = sim.agents.filter((agent) => agent.status === "in_danger");
  const routes = plan.objects.filter(
    (object) => object.type === "road" || object.type === "bridge",
  );
  const progress = Math.min(
    100,
    (metrics.safeResidents / Math.max(1, metrics.objectiveTarget)) * 100,
  );

  const primary = () => {
    if (finished) {
      reset();
      start();
    } else if (running) pause();
    else start();
  };

  const primaryLabel = finished ? "Run again" : running ? "Pause" : sim.status === "paused" ? "Resume" : "Start";

  useEffect(() => {
    if (finished) setDrawer(null);
  }, [finished]);

  return (
    <>
      {drawer ? (
        <div className="studio-run-drawer">
          <div className="studio-drawer-head">
            <strong>
              {drawer === "risk" ? "Residents at risk" : drawer === "routes" ? "Routes" : "Event log"}
            </strong>
            <button type="button" className="studio-icon" onClick={() => setDrawer(null)} aria-label="Close">
              <CloseIcon size={13} />
            </button>
          </div>
          {drawer === "risk" ? (
            atRisk.length ? (
              <div className="studio-drawer-list">
                {atRisk.map((agent) => {
                  const assigned = sim.boats.some(
                    (boat) => boat.targetAgentId === agent.id || boat.passengers.includes(agent.id),
                  );
                  return (
                    <div className="studio-drawer-row" key={agent.id}>
                      <span className="studio-layer-dot" style={{ background: "var(--s-danger)" }} />
                      <span className="studio-drawer-name">
                        <strong>{agent.name}</strong>
                        <span>No dry route</span>
                      </span>
                      <button
                        type="button"
                        className="studio-btn studio-btn-sm studio-btn-teal"
                        onClick={() => dispatchBoat(agent.id)}
                        disabled={assigned || sim.resources.rescueBoats <= 0 || finished}
                      >
                        <BoatIcon size={11} />
                        {assigned ? "En route" : "Skiff"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="studio-drawer-empty">No residents are in danger.</p>
            )
          ) : null}
          {drawer === "routes" ? (
            <div className="studio-drawer-list">
              {routes.map((route) => {
                const status = getRoadStatus(route, sim.roads[route.id]);
                return (
                  <div className="studio-drawer-row" key={route.id}>
                    <span
                      className="studio-layer-dot"
                      style={{
                        background:
                          status === "flooded" || status === "blocked"
                            ? "var(--s-danger)"
                            : status === "protected"
                              ? "var(--s-teal)"
                              : "var(--s-safe)",
                      }}
                    />
                    <span className="studio-drawer-name">
                      <strong>{route.name}</strong>
                      <span>{status}</span>
                    </span>
                    <button
                      type="button"
                      className="studio-btn studio-btn-sm"
                      onClick={() => {
                        select({ kind: "object", id: route.id }, true);
                        setDrawer(null);
                      }}
                    >
                      Inspect
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
          {drawer === "events" ? (
            <div className="studio-drawer-events">
              {[...sim.log]
                .reverse()
                .slice(0, 10)
                .map((entry) => (
                  <div className={`studio-drawer-event ${entry.kind}`} key={entry.id}>
                    <span className="studio-mono">T+{String(entry.tick).padStart(3, "0")}</span>
                    <span>{entry.message}</span>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="studio-runbar">
        <button type="button" className="studio-primary studio-run-button" onClick={primary}>
          {running ? <PauseIcon size={13} /> : <PlayIcon size={13} />}
          {primaryLabel}
        </button>
        <button
          type="button"
          className="studio-icon"
          onClick={reset}
          title="Reset simulation"
          aria-label="Reset simulation"
        >
          <ResetIcon size={14} />
        </button>
        <div className="studio-speed">
          {[1, 2, 4].map((value) => (
            <button
              key={value}
              type="button"
              className={speed === value ? "on" : ""}
              onClick={() => setSpeed(value as 1 | 2 | 4)}
            >
              {value}×
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`studio-icon ${sim.waterHeld ? "on" : ""}`}
          onClick={toggleWaterHold}
          title={sim.waterHeld ? "Release flood gate" : "Hold flood gate"}
          aria-label={sim.waterHeld ? "Release flood gate" : "Hold flood gate"}
        >
          <WaterIcon size={15} />
        </button>

        <div className="studio-run-objective">
          <div className="studio-run-safe">
            <strong>{metrics.safeResidents}</strong>
            <span>/ {metrics.objectiveTarget} safe</span>
          </div>
          <div className="studio-mini-progress">
            <span
              className={finished && sim.status === "failed" ? "danger" : ""}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          className={`studio-run-metric ${atRisk.length ? "danger" : ""} ${drawer === "risk" ? "open" : ""}`}
          onClick={() => setDrawer(drawer === "risk" ? null : "risk")}
        >
          <strong>{metrics.inDangerResidents}</strong>
          <span>at risk</span>
          <ChevronIcon size={11} />
        </button>
        <button
          type="button"
          className={`studio-run-metric ${drawer === "routes" ? "open" : ""}`}
          onClick={() => setDrawer(drawer === "routes" ? null : "routes")}
        >
          <strong>{metrics.openRoutes}</strong>
          <span>routes</span>
          <ChevronIcon size={11} />
        </button>
        <div className="studio-run-metric">
          <strong>{metrics.boatsRemaining}</strong>
          <span>skiffs</span>
        </div>
        <button
          type="button"
          className={`studio-run-metric ${drawer === "events" ? "open" : ""}`}
          onClick={() => setDrawer(drawer === "events" ? null : "events")}
        >
          <span>Events</span>
          <ChevronIcon size={11} />
        </button>
        <span className={`studio-run-status ${sim.status}`}>
          {STATUS_LABEL[sim.status] ?? sim.status}
          <span className="studio-mono">
            W {metrics.waterLevel.toFixed(2)} m · T+{String(sim.tick).padStart(3, "0")}
          </span>
        </span>
      </div>
    </>
  );
}
