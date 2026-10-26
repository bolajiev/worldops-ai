"use client";

import { useWorldOps } from "@/lib/store";
import { humanize } from "@/lib/scene-normalize";
import { getRoadStatus } from "@/lib/metrics";
import type { WorldObject } from "@/lib/types";
import { IDLE, statusColor } from "../world/theme";

function statusText(planObject: WorldObject, status: string) {
  if (planObject.type === "road" || planObject.type === "bridge") return status;
  return humanize(planObject.type);
}

export default function LayersPanel() {
  const plan = useWorldOps((state) => state.plan);
  const sim = useWorldOps((state) => state.sim);
  const selected = useWorldOps((state) => state.selected);
  const select = useWorldOps((state) => state.select);
  const roads = plan.objects.filter(
    (object) => object.type === "road" || object.type === "bridge",
  );
  const buildings = plan.objects.filter((object) =>
    ["house", "school", "clinic", "shelter", "factory"].includes(object.type),
  );
  const environment = plan.objects.filter((object) =>
    ["tree", "water", "rescue_boat"].includes(object.type),
  );

  const groups = [
    { label: "Roads", objects: roads },
    { label: "Buildings", objects: buildings },
    { label: "Environment", objects: environment },
  ];

  return (
    <div className="studio-layers">
      <div className="studio-panel-line">
        <span>Scene</span>
        <span className="studio-mono">
          {plan.objects.length} objects · {sim.agents.length} agents
        </span>
      </div>
      <div className="studio-layer-scroll">
        {groups.map((group) => (
          <div className="studio-layer-group" key={group.label}>
            <div className="studio-layer-group-title">
              <span>{group.label}</span>
              <span className="studio-mono">{group.objects.length}</span>
            </div>
            {group.objects.map((object) => {
              const active = selected?.kind === "object" && selected.id === object.id;
              const roadStatus =
                object.type === "road" || object.type === "bridge"
                  ? getRoadStatus(object, sim.roads[object.id])
                  : null;
              const color =
                roadStatus === "flooded" || roadStatus === "blocked"
                  ? "var(--s-danger)"
                  : roadStatus === "protected"
                    ? "var(--s-teal)"
                    : object.type === "shelter"
                      ? "var(--s-safe)"
                      : "var(--s-faint)";
              return (
                <button
                  key={object.id}
                  type="button"
                  className={`studio-layer-row ${active ? "active" : ""}`}
                  onClick={() => select({ kind: "object", id: object.id }, true)}
                  title={object.name}
                >
                  <span className="studio-layer-dot" style={{ background: color }} />
                  <span className="studio-layer-name">{object.name}</span>
                  <span className="studio-layer-meta">
                    {roadStatus ? statusText(object, roadStatus) : humanize(object.type)}
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        <div className="studio-layer-group">
          <div className="studio-layer-group-title">
            <span>Agents</span>
            <span className="studio-mono">{sim.agents.length}</span>
          </div>
          {sim.agents.map((agent) => {
            const active = selected?.kind === "agent" && selected.id === agent.id;
            return (
              <button
                key={agent.id}
                type="button"
                className={`studio-layer-row ${active ? "active" : ""}`}
                onClick={() => select({ kind: "agent", id: agent.id }, true)}
                title={agent.name}
              >
                <span
                  className="studio-layer-dot"
                  style={{
                    background:
                      agent.status === "idle" ? IDLE : statusColor(agent.status),
                  }}
                />
                <span className="studio-layer-name">{agent.name}</span>
                <span className="studio-layer-meta">
                  {agent.status.replace("_", " ")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
