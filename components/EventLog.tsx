"use client";

import { useWorldOps } from "@/lib/store";

export default function EventLog() {
  const sim = useWorldOps((state) => state.sim);
  const entries = [...sim.log].reverse().slice(0, 18);

  return (
    <section className="panel log-panel" aria-label="Simulation event log">
      <div className="log-head">
        <div className="kicker">
          <span className="num">Event</span>
          <span className="bar" />
          <span>Log</span>
        </div>
        <span className="log-count">{sim.log.length} {sim.log.length === 1 ? "entry" : "entries"}</span>
      </div>
      <div className="log-list" role="log" aria-live="polite" aria-relevant="additions">
        {entries.length === 0 ? (
          <div className="log-empty">The log is quiet. Start the simulation to see residents decide.</div>
        ) : (
          entries.map((entry) => (
            <div className={`log-row ${entry.kind}`} key={entry.id}>
              <span className="log-tick">T+{String(entry.tick).padStart(3, "0")}</span>
              <span className="log-msg">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
