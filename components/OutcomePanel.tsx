"use client";

import { useWorldOps } from "@/lib/store";

const STATUS_LABEL: Record<string, string> = {
  ready: "Awaiting start",
  running: "In progress",
  paused: "Paused",
  success: "Evacuation complete",
  failed: "Rescue window closed",
};

export default function OutcomePanel() {
  const plan = useWorldOps((state) => state.plan);
  const sim = useWorldOps((state) => state.sim);
  const metrics = useWorldOps((state) => state.metrics);

  const target = Math.max(1, metrics.objectiveTarget);
  const progress = Math.max(0, Math.min(100, (metrics.safeResidents / target) * 100));
  const allSafe = metrics.safeResidents >= target;
  const objective =
    plan.objectives.find((entry) => entry.kind === "evacuate_residents") ?? plan.objectives[0];
  const fillClass = allSafe ? "" : metrics.inDangerResidents > 0 ? "danger" : "warn";
  const statusClass = sim.status;

  return (
    <section className="panel panel-pad" aria-label="Mission outcome">
      <div className="panel-head">
        <div className="kicker">
          <span className="num">MISSION</span>
          <span className="bar" />
          <span>LIVE OUTCOME</span>
        </div>
        <span className={`status-pill ${statusClass}`}>
          <span className="status-dot" />
          {STATUS_LABEL[sim.status] ?? sim.status}
        </span>
      </div>

      <div className="outcome-hero">
        <div>
          <div className="outcome-number">
            <strong>{String(metrics.safeResidents).padStart(2, "0")}</strong>
            <span>/ {String(target).padStart(2, "0")}</span>
          </div>
          <div className="outcome-label">Residents safe</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="outcome-label" style={{ marginTop: 0 }}>
            Objective
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: allSafe ? "var(--safe)" : "var(--accent)",
              marginTop: 4,
            }}
          >
            {allSafe ? "COMPLETE" : `${Math.round(progress)}%`}
          </div>
        </div>
      </div>

      <div className="progress-track" aria-hidden="true">
        <div className={`progress-fill ${fillClass}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="progress-meta">
        <span>EVACUATION PROGRESS</span>
        <span>
          {metrics.inDangerResidents
            ? `${metrics.inDangerResidents} IN DANGER`
            : metrics.movingResidents
              ? `${metrics.movingResidents} MOVING`
              : allSafe
                ? "ALL CLEAR"
                : "STANDBY"}
        </span>
      </div>

      <p className="objective-copy">{objective?.description}</p>

      <div className="metric-grid">
        <div className="metric-cell safe">
          <div className="label">Safe</div>
          <div className="value">
            {String(metrics.safeResidents).padStart(2, "0")}
            <small>/ {metrics.totalResidents}</small>
          </div>
        </div>
        <div className={`metric-cell ${metrics.inDangerResidents > 0 ? "danger" : ""}`}>
          <div className="label">In danger</div>
          <div className="value">
            {String(metrics.inDangerResidents).padStart(2, "0")}
          </div>
        </div>
        <div className="metric-cell teal">
          <div className="label">Skiffs left</div>
          <div className="value">
            {String(metrics.boatsRemaining).padStart(2, "0")}
            <small>boats</small>
          </div>
        </div>
        <div className="metric-cell">
          <div className="label">Routes open</div>
          <div className="value">
            {String(metrics.openRoutes).padStart(2, "0")}
            <small>/ {metrics.totalRoutes}</small>
          </div>
        </div>
      </div>

      <div className="stat-strip">
        <div className="stat">
          <span className="k">Boat rescues</span>
          <span className="v">{metrics.rescuedResidents}</span>
        </div>
        <div className="stat">
          <span className="k">Barriers</span>
          <span className="v">{metrics.barriersRemaining} left</span>
        </div>
        <div className="stat">
          <span className="k">Routes flooded</span>
          <span className="v">{metrics.floodedRoutes}</span>
        </div>
        <div className="stat">
          <span className="k">Rescued / safe</span>
          <span className="v">
            {metrics.rescuedResidents} / {metrics.safeResidents}
          </span>
        </div>
      </div>

      <div className="outcome-foot">
        <span>CALCULATED FROM LIVE STATE</span>
        <span title="Experimental educational simulation; not validated for real-world emergency response.">
          NOT FOR REAL EMERGENCY USE
        </span>
      </div>
    </section>
  );
}
