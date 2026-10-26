"use client";

import { useWorldOps } from "@/lib/store";

const BAR_COUNT = 9;

export default function FloodHud() {
  const plan = useWorldOps((state) => state.plan);
  const sim = useWorldOps((state) => state.sim);
  const metrics = useWorldOps((state) => state.metrics);

  const { waterStart, waterMax } = plan.simulation;
  const ratio = Math.max(0, Math.min(1, (sim.waterLevel - waterStart) / (waterMax - waterStart)));
  const activeBars = Math.round(ratio * BAR_COUNT);
  const hot = ratio > 0.68;

  const statusLabel =
    sim.waterHeld
      ? "GATE HELD"
      : sim.waterMaxed
        ? "PEAK"
        : sim.status === "running"
          ? "RISING"
          : "STAGED";

  return (
    <div className="stage-hud" aria-label="Flood status">
      <div className="hud-cell">
        <span className="k">Flood level</span>
        <span className="v">
          {metrics.waterLevel.toFixed(2)} <em>m</em>
        </span>
      </div>
      <div className="hud-divider" aria-hidden="true" />
      <div className="water-meter">
        <div className="water-bars" aria-hidden="true">
          {Array.from({ length: BAR_COUNT }).map((_, index) => (
            <span
              key={index}
              className={`water-bar ${index < activeBars ? "on" : ""} ${
                hot && index < activeBars ? "hot" : ""
              }`}
              style={{ height: `${8 + index * 1.9}px` }}
            />
          ))}
        </div>
        <div className="hud-cell">
          <span className="k">{statusLabel}</span>
          <span className="v">
            T+{String(metrics.tick).padStart(4, "0")}
          </span>
        </div>
      </div>
      <div className="hud-divider hide-md" aria-hidden="true" />
      <div className="hud-cell hide-md">
        <span className="k">At risk</span>
        <span className="v" style={{ color: metrics.inDangerResidents ? "var(--danger)" : undefined }}>
          {String(metrics.inDangerResidents).padStart(2, "0")}
        </span>
      </div>
      <div className="hud-divider hide-sm" aria-hidden="true" />
      <div className="surge-label">
        <span className="surge-arrow">←</span>
        <span>Surge from east</span>
      </div>
    </div>
  );
}
