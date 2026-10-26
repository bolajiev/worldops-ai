"use client";

import { useState } from "react";
import { useWorldOps } from "@/lib/store";
import OutcomePanel from "./OutcomePanel";
import InspectorPanel from "./InspectorPanel";
import EventLog from "./EventLog";

type RailTab = "inspect" | "log";

export default function RightRail() {
  const [tab, setTab] = useState<RailTab>("inspect");
  const logCount = useWorldOps((state) => state.sim.log.length);

  return (
    <aside className="right-rail" aria-label="Outcome and inspection">
      <OutcomePanel />
      <div className="rail-tabs" role="tablist" aria-label="Inspector and events">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "inspect"}
          className={`rail-tab ${tab === "inspect" ? "on" : ""}`}
          onClick={() => setTab("inspect")}
        >
          Inspect
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "log"}
          className={`rail-tab ${tab === "log" ? "on" : ""}`}
          onClick={() => setTab("log")}
        >
          Event log <span>{logCount}</span>
        </button>
      </div>
      <div className="rail-tab-body">
        {tab === "inspect" ? <InspectorPanel /> : <EventLog />}
      </div>
    </aside>
  );
}
