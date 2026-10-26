"use client";

import { useWorldOps } from "@/lib/store";
import { humanize } from "@/lib/scene-normalize";
import { getRoadStatus } from "@/lib/metrics";
import {
  BoatIcon,
  CloseIcon,
  LocateIcon,
  ShieldIcon,
} from "../ui/Icons";

function statusColor(status: string, danger = false): string {
  if (danger || status === "in_danger" || status === "flooded" || status === "blocked") {
    return "var(--s-danger)";
  }
  if (status === "safe" || status === "rescued" || status === "open") {
    return "var(--s-safe)";
  }
  if (status === "moving") return "var(--s-gold)";
  return "var(--s-teal)";
}

export default function StudioInspector() {
  const plan = useWorldOps((state) => state.plan);
  const sim = useWorldOps((state) => state.sim);
  const selected = useWorldOps((state) => state.selected);
  const view = useWorldOps((state) => state.view);
  const select = useWorldOps((state) => state.select);
  const setPlacementTool = useWorldOps((state) => state.setPlacementTool);
  const rotateSelected = useWorldOps((state) => state.rotateSelected);
  const duplicateSelected = useWorldOps((state) => state.duplicateSelected);
  const deleteSelected = useWorldOps((state) => state.deleteSelected);
  const dispatchBoat = useWorldOps((state) => state.dispatchBoat);
  const deployBarrier = useWorldOps((state) => state.deployBarrier);
  const toggleRoute = useWorldOps((state) => state.toggleRoute);

  if (!selected) return null;

  const canAct = sim.status !== "success" && sim.status !== "failed";
  const close = () => select(null);

  if (selected.kind === "object") {
    const object = plan.objects.find((entry) => entry.id === selected.id);
    if (!object) return null;
    const isRoute = object.type === "road" || object.type === "bridge";
    const roadStatus = isRoute ? getRoadStatus(object, sim.roads[object.id]) : null;
    const routeRuntime = sim.roads[object.id];
    const barrier = sim.barriers.find((entry) => entry.roadId === object.id);
    const isShelter = object.type === "shelter";
    const safeHere = sim.agents.filter(
      (agent) => agent.status === "safe" && agent.targetShelterId === object.id,
    ).length;
    const inbound = sim.agents.filter(
      (agent) =>
        agent.targetShelterId === object.id &&
        (agent.status === "moving" || agent.status === "idle"),
    ).length;

    return (
      <aside className="studio-inspector" aria-label="Inspector">
        <div className="studio-inspector-head">
          <div>
            <div className="studio-inspector-kicker">
              {isRoute ? "Route" : humanize(object.type)}
            </div>
            <h2>{object.name}</h2>
            <div className="studio-inspector-id">{object.id}</div>
          </div>
          <button type="button" className="studio-icon" onClick={close} aria-label="Close inspector">
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="studio-inspector-body">
          {isRoute ? (
            <>
              <div className="studio-prop-row">
                <span>Status</span>
                <strong style={{ color: statusColor(roadStatus ?? "open") }}>
                  {roadStatus}
                </strong>
              </div>
              {typeof object.metadata?.clearance === "number" ? (
                <div className="studio-prop-row">
                  <span>Clearance</span>
                  <strong>{object.metadata.clearance.toFixed(2)} m</strong>
                </div>
              ) : null}
              <div className="studio-prop-row">
                <span>Barrier</span>
                <strong>{barrier ? "Holding" : "None"}</strong>
              </div>
              <div className="studio-action-row">
                <button
                  type="button"
                  className={`studio-btn ${routeRuntime?.blockedBy ? "studio-btn-teal" : "studio-btn-danger"}`}
                  onClick={() => toggleRoute(object.id)}
                  disabled={!canAct}
                >
                  {routeRuntime?.blockedBy ? "Reopen" : "Close route"}
                </button>
                <button
                  type="button"
                  className="studio-btn"
                  onClick={() => deployBarrier(object.id)}
                  disabled={!canAct || Boolean(barrier) || sim.resources.barriers <= 0}
                >
                  <ShieldIcon size={12} />
                  Barrier
                </button>
              </div>
              <p className="studio-note">
                {roadStatus === "flooded"
                  ? "Underwater. A barrier can hold it briefly if it is still passable."
                  : "Select another road in the scene, Routes drawer or Layers list."}
              </p>
            </>
          ) : isShelter ? (
            <>
              <div className="studio-prop-row">
                <span>Safe here</span>
                <strong style={{ color: "var(--s-safe)" }}>{safeHere}</strong>
              </div>
              <div className="studio-prop-row">
                <span>Inbound</span>
                <strong style={{ color: "var(--s-teal)" }}>{inbound}</strong>
              </div>
              <div className="studio-prop-row">
                <span>Position</span>
                <strong>
                  {object.position[0].toFixed(0)}, {object.position[2].toFixed(0)}
                </strong>
              </div>
            </>
          ) : object.type === "water" ? (
            <p className="studio-note">Permanent water. Bridges are the only crossing.</p>
          ) : object.type === "house" ? (
            <div className="studio-prop-row">
              <span>Residents</span>
              <strong>{plan.agents.filter((agent) => agent.homeId === object.id).length}</strong>
            </div>
          ) : (
            <div className="studio-prop-row">
              <span>Type</span>
              <strong>{humanize(object.type)}</strong>
            </div>
          )}

          <div className="studio-object-tools">
            <button type="button" className="studio-tool" onClick={() => select(selected, true)} title="Focus">
              <LocateIcon size={13} />
              <span>Find</span>
            </button>
            {view === "build" ? (
              <>
                <button
                  type="button"
                  className="studio-tool"
                  onClick={() => setPlacementTool({ kind: "move", id: object.id })}
                  title="Move"
                >
                  Move
                </button>
                <button type="button" className="studio-tool" onClick={rotateSelected} title="Rotate 45°">
                  Rotate
                </button>
                <button type="button" className="studio-tool" onClick={duplicateSelected} title="Duplicate">
                  Copy
                </button>
                <button
                  type="button"
                  className="studio-tool studio-tool-danger"
                  onClick={deleteSelected}
                  title="Delete"
                >
                  Delete
                </button>
              </>
            ) : null}
          </div>
        </div>
      </aside>
    );
  }

  if (selected.kind === "agent") {
    const agent = sim.agents.find((entry) => entry.id === selected.id);
    if (!agent) return null;
    const assignedBoat = sim.boats.find(
      (boat) => boat.targetAgentId === agent.id || boat.passengers.includes(agent.id),
    );
    const target = plan.objects.find((object) => object.id === agent.targetShelterId);
    const canDispatch =
      agent.role === "resident" &&
      agent.status !== "safe" &&
      agent.status !== "rescued" &&
      !assignedBoat &&
      canAct &&
      sim.resources.rescueBoats > 0;

    return (
      <aside className="studio-inspector" aria-label="Inspector">
        <div className="studio-inspector-head">
          <div>
            <div className="studio-inspector-kicker">Resident</div>
            <h2>{agent.name}</h2>
            <div className="studio-inspector-id" style={{ color: statusColor(agent.status) }}>
              {agent.status.replace("_", " ")}
            </div>
          </div>
          <button type="button" className="studio-icon" onClick={close} aria-label="Close inspector">
            <CloseIcon size={14} />
          </button>
        </div>
        <div className="studio-inspector-body">
          <div className="studio-prop-row">
            <span>Target</span>
            <strong>{assignedBoat ? assignedBoat.name : target?.name ?? "No route"}</strong>
          </div>
          <div className="studio-prop-row">
            <span>Speed</span>
            <strong>{agent.speed.toFixed(2)} u/tick</strong>
          </div>
          <div className="studio-prop-row">
            <span>Route</span>
            <strong>{agent.path.length} cells left</strong>
          </div>
          {agent.status === "in_danger" ? (
            <p className="studio-note studio-note-danger">
              No dry route. A rescue skiff is needed before the flood peaks.
            </p>
          ) : null}
          <div className="studio-action-row">
            <button
              type="button"
              className="studio-btn studio-btn-teal"
              onClick={() => dispatchBoat(agent.id)}
              disabled={!canDispatch}
            >
              <BoatIcon size={12} />
              {assignedBoat ? "Skiff en route" : "Dispatch skiff"}
            </button>
            <button type="button" className="studio-btn" onClick={() => select(selected, true)}>
              <LocateIcon size={12} />
              Find
            </button>
          </div>
        </div>
      </aside>
    );
  }

  if (selected.kind === "boat") {
    const boat = sim.boats.find((entry) => entry.id === selected.id);
    if (!boat) return null;
    const target = sim.agents.find((agent) => agent.id === boat.targetAgentId);
    return (
      <aside className="studio-inspector" aria-label="Inspector">
        <div className="studio-inspector-head">
          <div>
            <div className="studio-inspector-kicker">Rescue skiff</div>
            <h2>{boat.name}</h2>
            <div className="studio-inspector-id">{boat.phase.replace("_", " ")}</div>
          </div>
          <button type="button" className="studio-icon" onClick={close} aria-label="Close inspector">
            <CloseIcon size={14} />
          </button>
        </div>
        <div className="studio-inspector-body">
          <div className="studio-prop-row">
            <span>Target</span>
            <strong>{target?.name ?? "Rescue dock"}</strong>
          </div>
          <div className="studio-prop-row">
            <span>On board</span>
            <strong>{boat.passengers.length}</strong>
          </div>
          <div className="studio-action-row">
            <button type="button" className="studio-btn" onClick={() => select(selected, true)}>
              <LocateIcon size={12} /> Find
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return null;
}
