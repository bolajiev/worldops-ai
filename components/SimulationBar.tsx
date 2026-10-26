"use client";

import { useWorldOps } from "@/lib/store";
import {
  PauseIcon,
  PlayIcon,
  ResetIcon,
  WaterIcon,
} from "./ui/Icons";

const STATUS_LABEL: Record<string, string> = {
  ready: "STAGED",
  running: "LIVE",
  paused: "PAUSED",
  success: "SAFE",
  failed: "CLOSED",
};

export default function SimulationBar() {
  const sim = useWorldOps((state) => state.sim);
  const speed = useWorldOps((state) => state.speed);
  const toggleRun = useWorldOps((state) => state.toggleRun);
  const reset = useWorldOps((state) => state.reset);
  const setSpeed = useWorldOps((state) => state.setSpeed);
  const toggleWaterHold = useWorldOps((state) => state.toggleWaterHold);

  const running = sim.status === "running";
  const finished = sim.status === "success" || sim.status === "failed";

  const playLabel = running
    ? "Pause"
    : sim.status === "paused"
      ? "Resume"
      : "Start sim";

  return (
    <div className="sim-dock" aria-label="Simulation controls">
      <div className="sim-main">
        <button
          type="button"
          className={`play-btn ${running ? "pause" : ""} ${finished ? "replay" : ""}`}
          onClick={finished ? reset : toggleRun}
          aria-label={
            finished
              ? "Run simulation again"
              : running
                ? "Pause simulation"
                : sim.status === "paused"
                  ? "Resume simulation"
                  : "Start simulation"
          }
        >
          {finished ? <ResetIcon size={14} /> : running ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
          {finished ? "Run again" : playLabel}
        </button>
        <button
          type="button"
          className="sim-icon-btn"
          onClick={reset}
          aria-label="Reset simulation"
          title="Reset simulation"
        >
          <ResetIcon size={15} />
        </button>
        <div className="sim-divider" aria-hidden="true" />
        <div className="speed-control" role="group" aria-label="Simulation speed">
          {[1, 2, 4].map((value) => (
            <button
              key={value}
              type="button"
              className={`speed-btn ${speed === value ? "on" : ""}`}
              onClick={() => setSpeed(value as 1 | 2 | 4)}
              aria-pressed={speed === value}
              title={`${value}× simulation speed`}
            >
              {value}×
            </button>
          ))}
        </div>
        <div className="sim-divider" aria-hidden="true" />
        <button
          type="button"
          className={`sim-icon-btn ${sim.waterHeld ? "on" : ""}`}
          onClick={toggleWaterHold}
          aria-label={sim.waterHeld ? "Resume water rise" : "Hold water rise"}
          aria-pressed={sim.waterHeld}
          title={sim.waterHeld ? "Release the flood gate" : "Hold the flood gate"}
        >
          <WaterIcon size={16} />
        </button>
      </div>
      <div className="sim-status">
        <span className={`st ${sim.status}`}>{STATUS_LABEL[sim.status] ?? sim.status}</span>
        <span className="tk">
          T+{String(sim.tick).padStart(4, "0")} / {sim.waterHeld ? "GATE HELD" : "GATE OPEN"}
        </span>
      </div>
    </div>
  );
}
