"use client";

import { useWorldOps } from "@/lib/store";
import { PlayIcon, ResetIcon } from "../ui/Icons";

export default function BuildBar() {
  const metrics = useWorldOps((state) => state.metrics);
  const sim = useWorldOps((state) => state.sim);
  const setView = useWorldOps((state) => state.setView);
  const start = useWorldOps((state) => state.start);
  const reset = useWorldOps((state) => state.reset);

  const finished = sim.status === "success" || sim.status === "failed";
  const label =
    finished ? "Run again" : sim.status === "paused" ? "Resume" : "Run world";

  const run = () => {
    setView("run");
    if (finished) {
      reset();
      start();
    } else if (sim.status === "ready" || sim.status === "paused") {
      start();
    }
  };

  const progress = Math.min(
    100,
    (metrics.safeResidents / Math.max(1, metrics.objectiveTarget)) * 100,
  );

  return (
    <div className="studio-buildbar">
      <button type="button" className="studio-primary studio-run-button" onClick={run}>
        <PlayIcon size={13} />
        {label}
      </button>
      <button
        type="button"
        className="studio-icon studio-build-reset"
        onClick={reset}
        title="Reset simulation"
        aria-label="Reset simulation"
      >
        <ResetIcon size={14} />
      </button>
      <div className="studio-build-objective">
        <div className="studio-build-objective-text">
          <span>Evacuation</span>
          <strong>
            {metrics.safeResidents} <em>/ {metrics.objectiveTarget}</em>
          </strong>
        </div>
        <div className="studio-mini-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
      <button
        type="button"
        className="studio-build-metric"
        onClick={() => setView("run")}
        title="Open Run mode to manage risk"
      >
        <strong style={{ color: metrics.inDangerResidents ? "var(--s-danger)" : undefined }}>
          {metrics.inDangerResidents}
        </strong>
        at risk
      </button>
      <button
        type="button"
        className="studio-build-metric"
        onClick={() => setView("run")}
        title="Open Run mode to inspect routes"
      >
        <strong>{metrics.openRoutes}</strong>
        routes open
      </button>
      <span className="studio-bar-status">
        W {metrics.waterLevel.toFixed(2)} m ·{" "}
        {sim.status === "ready"
          ? "Ready"
          : sim.status === "paused"
            ? "Paused"
            : sim.status === "running"
              ? "Live"
              : sim.status === "success"
                ? "Safe"
                : "Unresolved"}
      </span>
    </div>
  );
}
