"use client";

import { useWorldOps } from "@/lib/store";
import { humanize } from "@/lib/scene-normalize";
import { getRoadStatus } from "@/lib/metrics";
import type { SimAgent, WorldObject } from "@/lib/types";
import {
  AlertIcon,
  BoatIcon,
  LocateIcon,
  RouteIcon,
  ShieldIcon,
} from "./ui/Icons";

function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

function objectIcon(object: WorldObject) {
  if (object.type === "road" || object.type === "bridge" || object.type === "conveyor") {
    return <RouteIcon size={15} />;
  }
  if (object.type === "rescue_boat") return <BoatIcon size={15} />;
  return <ShieldIcon size={15} />;
}

function RoadControls({ object }: { object: WorldObject }) {
  const plan = useWorldOps((state) => state.plan);
  const sim = useWorldOps((state) => state.sim);
  const deployBarrier = useWorldOps((state) => state.deployBarrier);
  const toggleRoute = useWorldOps((state) => state.toggleRoute);
  const runtime = sim.roads[object.id];
  const status = getRoadStatus(object, runtime);
  const barrier = sim.barriers.find((entry) => entry.roadId === object.id);
  const canAct = sim.status !== "success" && sim.status !== "failed";
  const blocked = Boolean(runtime?.blockedBy);
  const clearance =
    typeof object.metadata?.clearance === "number"
      ? object.metadata.clearance
      : object.type === "bridge"
        ? 0.55
        : null;

  return (
    <>
      <div className="detail-list">
        <div className="detail-row">
          <span className="k">Route status</span>
          <span className={`v ${status === "flooded" || status === "blocked" ? "danger" : status === "protected" ? "teal" : "safe"}`}>
            {status}
          </span>
        </div>
        <div className="detail-row">
          <span className="k">Flood state</span>
          <span className={`v ${status === "flooded" ? "danger" : ""}`}>
            {status === "flooded" ? "Underwater" : status === "protected" ? "Held by sandbags" : "Dry"}
          </span>
        </div>
        {clearance !== null ? (
          <div className="detail-row">
            <span className="k">Clearance</span>
            <span className="v">
              {clearance.toFixed(2)} m {sim.waterLevel > clearance ? "· overtopped" : "· above water"}
            </span>
          </div>
        ) : null}
        <div className="detail-row">
          <span className="k">Barrier</span>
          <span className="v">
            {barrier
              ? `Holding · ${Math.ceil((barrier.ticksRemaining * plan.simulation.tickMs) / 1000)}s`
              : "None"}
          </span>
        </div>
        <div className="detail-row">
          <span className="k">Barriers left</span>
          <span className="v">{sim.resources.barriers}</span>
        </div>
      </div>

      <div className="inspector-actions">
        <button
          type="button"
          className={`btn btn-sm ${blocked ? "btn-teal" : "btn-danger"}`}
          onClick={() => toggleRoute(object.id)}
          disabled={!canAct}
        >
          {blocked ? "Reopen route" : "Close route"}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => deployBarrier(object.id)}
          disabled={!canAct || Boolean(barrier) || sim.resources.barriers <= 0}
          title={
            barrier
              ? "This route already has a sandbag line"
              : "Protect this route from flooding for a limited time"
          }
        >
          <ShieldIcon size={11} />
          Deploy barrier
        </button>
      </div>
      <p className="inspector-note">
        {status === "flooded"
          ? "This route is underwater. A barrier can pump and hold it — but it only buys time."
          : "Closing a route forces residents to re-path on the next tick. Barricades are visible in the world."}
      </p>
    </>
  );
}

function AgentDetails({ agent }: { agent: SimAgent }) {
  const plan = useWorldOps((state) => state.plan);
  const sim = useWorldOps((state) => state.sim);
  const dispatchBoat = useWorldOps((state) => state.dispatchBoat);
  const assignedBoat = sim.boats.find(
    (boat) => boat.targetAgentId === agent.id || boat.passengers.includes(agent.id),
  );
  const targetShelter = plan.objects.find((object) => object.id === agent.targetShelterId);
  const carriedBy = sim.boats.find((boat) => boat.id === agent.carriedBy);
  const canAct = sim.status !== "success" && sim.status !== "failed";
  const canDispatch =
    agent.role === "resident" &&
    agent.status !== "safe" &&
    agent.status !== "rescued" &&
    !assignedBoat &&
    canAct &&
    sim.resources.rescueBoats > 0;

  return (
    <>
      <div className="detail-list">
        <div className="detail-row">
          <span className="k">Role</span>
          <span className="v">{humanize(agent.role)}</span>
        </div>
        <div className="detail-row">
          <span className="k">Status</span>
          <span
            className={`v ${
              agent.status === "in_danger"
                ? "danger"
                : agent.status === "safe"
                  ? "safe"
                  : "teal"
            }`}
          >
            {formatStatus(agent.status)}
          </span>
        </div>
        <div className="detail-row">
          <span className="k">Speed</span>
          <span className="v">{agent.speed.toFixed(2)} u/tick</span>
        </div>
        <div className="detail-row">
          <span className="k">Target</span>
          <span className="v">
            {carriedBy
              ? carriedBy.name
              : targetShelter
                ? targetShelter.name
                : agent.status === "in_danger"
                  ? "No dry route"
                  : "Selecting…"}
          </span>
        </div>
        <div className="detail-row">
          <span className="k">Route left</span>
          <span className="v">{agent.path.length} cells</span>
        </div>
      </div>

      {agent.status === "in_danger" ? (
        <div className="error-box" style={{ marginTop: 9 }}>
          <strong>
            <AlertIcon size={12} /> No safe path
          </strong>
          This resident cannot reach a shelter on foot. Dispatch a skiff before the rescue
          window closes.
        </div>
      ) : null}

      <div className="inspector-actions">
        <button
          type="button"
          className="btn btn-sm btn-teal"
          onClick={() => dispatchBoat(agent.id)}
          disabled={!canDispatch}
          title={
            assignedBoat
              ? `${assignedBoat.name} is already assigned`
              : sim.resources.rescueBoats <= 0
                ? "No rescue skiffs remaining"
                : "Dispatch a rescue skiff"
          }
        >
          <BoatIcon size={12} />
          {assignedBoat ? "Skiff en route" : "Dispatch skiff"}
        </button>
      </div>
      <p className="inspector-note">
        {assignedBoat
          ? `${assignedBoat.name} is ${assignedBoat.phase === "to_rescue" ? "moving to pick them up" : "returning to the coast guard station"}.`
          : agent.role === "resident"
            ? `${sim.resources.rescueBoats} of ${plan.resourceBudget.rescueBoats} skiffs remain. A skiff can recover multiple residents.`
            : "Only residents can be evacuated by skiff."}
      </p>
    </>
  );
}

function CriticalRoutes() {
  const plan = useWorldOps((state) => state.plan);
  const sim = useWorldOps((state) => state.sim);
  const select = useWorldOps((state) => state.select);
  const routes = plan.objects
    .filter((object) => object.type === "road" || object.type === "bridge")
    .sort((a, b) => (a.type === "bridge" ? -1 : b.type === "bridge" ? 1 : 0))
    .slice(0, 4);

  return (
    <>
      <div className="at-risk-head">
        <span>Critical routes</span>
        <span>INSPECT</span>
      </div>
      <div className="risk-list">
        {routes.map((route) => {
          const status = getRoadStatus(route, sim.roads[route.id]);
          const color =
            status === "flooded" || status === "blocked"
              ? "var(--danger)"
              : status === "protected"
                ? "var(--accent)"
                : "var(--teal)";
          return (
            <div className="risk-row" key={route.id}>
              <span className="risk-dot" style={{ background: color, boxShadow: "none" }} />
              <span className="risk-name">
                <strong>
                  {route.type === "bridge" ? "⚠ " : ""}
                  {route.name}
                </strong>
                <span style={{ color }}>
                  {status.toUpperCase()}
                  {route.type === "bridge" && status === "open" ? " · CHOKEPOINT" : ""}
                </span>
              </span>
              <button
                type="button"
                className="btn btn-sm btn-icon"
                title={`Inspect ${route.name}`}
                aria-label={`Inspect ${route.name}`}
                onClick={() => select({ kind: "object", id: route.id }, true)}
              >
                <LocateIcon size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function AtRiskList() {
  const sim = useWorldOps((state) => state.sim);
  const select = useWorldOps((state) => state.select);
  const dispatchBoat = useWorldOps((state) => state.dispatchBoat);
  const atRisk = sim.agents.filter((agent) => agent.status === "in_danger");
  const moving = sim.agents.filter((agent) => agent.status === "moving");

  if (atRisk.length > 0) {
    return (
      <>
        <div className="at-risk-head">
          <span>Residents at risk</span>
          <span style={{ color: "var(--danger)" }}>{atRisk.length}</span>
        </div>
        <div className="risk-list">
          {atRisk.map((agent) => {
            const assigned = sim.boats.some(
              (boat) => boat.targetAgentId === agent.id || boat.passengers.includes(agent.id),
            );
            return (
              <div className="risk-row" key={agent.id}>
                <span className="risk-dot" />
                <span className="risk-name">
                  <strong>{agent.name}</strong>
                  <span>NO DRY ROUTE · {assigned ? "SKIFF EN ROUTE" : "STRANDED"}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-icon"
                  title={`Locate ${agent.name}`}
                  aria-label={`Locate ${agent.name}`}
                  onClick={() => select({ kind: "agent", id: agent.id }, true)}
                >
                  <LocateIcon size={13} />
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  title={`Dispatch a skiff to ${agent.name}`}
                  onClick={() => dispatchBoat(agent.id)}
                  disabled={
                    assigned ||
                    sim.resources.rescueBoats <= 0 ||
                    sim.status === "success" ||
                    sim.status === "failed"
                  }
                >
                  <BoatIcon size={11} />
                  Skiff
                </button>
              </div>
            );
          })}
        </div>
        <CriticalRoutes />
      </>
    );
  }

  return (
    <>
      <div className="empty-state">
        <strong>Nobody is selected.</strong>
        <p>
          Click a resident to inspect their route, a road to close it or place sandbags, or a
          shelter to see who is heading there. Drag to orbit, scroll to zoom.
        </p>
      </div>
      {moving.length > 0 ? (
        <div className="at-risk-head">
          <span>Residents moving</span>
          <span>{moving.length}</span>
        </div>
      ) : null}
      <div className="risk-list">
        {moving.slice(0, 4).map((agent) => (
          <div className="risk-row" key={agent.id}>
            <span
              className="risk-dot"
              style={{ background: "var(--accent)", boxShadow: "0 0 8px rgba(255,180,92,.4)" }}
            />
            <span className="risk-name">
              <strong>{agent.name}</strong>
              <span>EN ROUTE TO SAFETY</span>
            </span>
            <button
              type="button"
              className="btn btn-sm btn-icon"
              title={`Follow ${agent.name}`}
              aria-label={`Follow ${agent.name}`}
              onClick={() => select({ kind: "agent", id: agent.id }, true)}
            >
              <LocateIcon size={13} />
            </button>
          </div>
        ))}
      </div>
      <CriticalRoutes />
    </>
  );
}

export default function InspectorPanel() {
  const plan = useWorldOps((state) => state.plan);
  const sim = useWorldOps((state) => state.sim);
  const selected = useWorldOps((state) => state.selected);
  const select = useWorldOps((state) => state.select);

  let body: React.ReactNode = null;
  let title = "Nothing selected";
  let subtitle = "INSPECTOR";
  let icon = <ShieldIcon size={15} />;
  let iconClass = "";

  if (selected) {
    if (selected.kind === "object") {
      const object = plan.objects.find((entry) => entry.id === selected.id);
      if (object) {
        title = object.name;
        subtitle = `${humanize(object.type)} · ${object.id}`;
        icon = objectIcon(object);
        iconClass =
          object.type === "shelter" ? "" : object.type === "road" || object.type === "bridge" ? "amber" : "";
        body = (
          <>
            {object.type === "road" || object.type === "bridge" ? (
              <RoadControls object={object} />
            ) : (
              <>
                <div className="detail-list">
                  <div className="detail-row">
                    <span className="k">Type</span>
                    <span className="v">{humanize(object.type)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="k">Position</span>
                    <span className="v">
                      {object.position[0].toFixed(0)}, {object.position[2].toFixed(0)}
                    </span>
                  </div>
                  {object.type === "shelter" ? (
                    <>
                      <div className="detail-row">
                        <span className="k">Safe here</span>
                        <span className="v safe">
                          {sim.agents.filter(
                            (agent) =>
                              agent.status === "safe" &&
                              agent.targetShelterId === object.id,
                          ).length}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="k">Heading here</span>
                        <span className="v teal">
                          {sim.agents.filter(
                            (agent) =>
                              agent.targetShelterId === object.id &&
                              (agent.status === "moving" || agent.status === "idle"),
                          ).length}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="k">Role</span>
                        <span className="v">
                          {object.metadata?.rescueOnly ? "Skiff recovery point" : "Evacuation shelter"}
                        </span>
                      </div>
                    </>
                  ) : object.type === "water" ? (
                    <div className="detail-row">
                      <span className="k">Passability</span>
                      <span className="v danger">Impassable · bridge required</span>
                    </div>
                  ) : object.type === "house" ? (
                    <div className="detail-row">
                      <span className="k">Residents</span>
                      <span className="v">
                        {plan.agents.filter((agent) => agent.homeId === object.id).length}
                      </span>
                    </div>
                  ) : object.type === "rescue_boat" ? (
                    <div className="detail-row">
                      <span className="k">Use</span>
                      <span className="v">Skiff dock</span>
                    </div>
                  ) : null}
                  {object.metadata
                    ? Object.entries(object.metadata)
                        .filter(([key]) => key !== "editor")
                        .slice(0, 2)
                        .map(([key, value]) => (
                          <div className="detail-row" key={key}>
                            <span className="k">{humanize(key)}</span>
                            <span className="v">{String(value)}</span>
                          </div>
                        ))
                    : null}
                </div>
                <div className="inspector-actions">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => select(selected, true)}
                  >
                    <LocateIcon size={12} />
                    Locate
                  </button>
                  {object.type === "shelter" ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-teal"
                      onClick={() => {
                        const nearby = sim.agents.find(
                          (agent) =>
                            agent.role === "resident" &&
                            agent.status !== "safe" &&
                            agent.status !== "rescued",
                        );
                        if (nearby) select({ kind: "agent", id: nearby.id }, true);
                      }}
                    >
                      Find evacuee
                    </button>
                  ) : null}
                </div>
                <p className="inspector-note">
                  Click another object in the scene to inspect it. Selecting a road unlocks
                  route and barrier controls.
                </p>
              </>
            )}
          </>
        );
      }
    } else if (selected.kind === "agent") {
      const agent = sim.agents.find((entry) => entry.id === selected.id);
      if (agent) {
        title = agent.name;
        subtitle = `${humanize(agent.role)} · ${agent.id}`;
        icon = <BoatIcon size={15} />;
        iconClass = agent.status === "in_danger" ? "danger" : "amber";
        body = <AgentDetails agent={agent} />;
      }
    } else if (selected.kind === "boat") {
      const boat = sim.boats.find((entry) => entry.id === selected.id);
      if (boat) {
        const target = sim.agents.find((agent) => agent.id === boat.targetAgentId);
        title = boat.name;
        subtitle = `RESCUE SKIFF · ${boat.id}`;
        icon = <BoatIcon size={15} />;
        body = (
          <>
            <div className="detail-list">
              <div className="detail-row">
                <span className="k">Phase</span>
                <span className="v teal">{boat.phase.replace("_", " ")}</span>
              </div>
              <div className="detail-row">
                <span className="k">Target</span>
                <span className="v">{target?.name ?? "Rescue dock"}</span>
              </div>
              <div className="detail-row">
                <span className="k">On board</span>
                <span className="v">{boat.passengers.length}</span>
              </div>
            </div>
            <div className="inspector-actions">
              <button type="button" className="btn btn-sm" onClick={() => select(selected, true)}>
                <LocateIcon size={12} />
                Locate
              </button>
            </div>
            <p className="inspector-note">
              Skiffs are limited. A dispatched skiff moves to the rescue target, then returns
              to the coast guard station.
            </p>
          </>
        );
      }
    } else if (selected.kind === "barrier") {
      const barrier = sim.barriers.find((entry) => entry.id === selected.id);
      if (barrier) {
        const road = plan.objects.find((object) => object.id === barrier.roadId);
        title = "Sandbag barrier";
        subtitle = `TEMPORARY LEVEE · ${barrier.id}`;
        icon = <ShieldIcon size={15} />;
        body = (
          <div className="detail-list">
            <div className="detail-row">
              <span className="k">Route</span>
              <span className="v">{road?.name ?? barrier.roadId}</span>
            </div>
            <div className="detail-row">
              <span className="k">Holding for</span>
              <span className="v">
                {Math.ceil((barrier.ticksRemaining * plan.simulation.tickMs) / 1000)}s
              </span>
            </div>
          </div>
        );
      }
    }
  }

  return (
    <section className="panel panel-pad" aria-label="Inspector">
      <div className="panel-head">
        <div className="kicker">
          <span className="num">FIELD</span>
          <span className="bar" />
          <span>INSPECTOR</span>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-icon"
          title="Clear selection"
          aria-label="Clear selection"
          onClick={() => select(null)}
          disabled={!selected}
          style={{ opacity: selected ? 1 : 0.35 }}
        >
          ×
        </button>
      </div>

      {body ? (
        <>
          <div className="inspector-title">
            <div className={`inspector-icon ${iconClass}`}>{icon}</div>
            <div style={{ minWidth: 0 }}>
              <h3 title={title}>{title}</h3>
              <div className="sub">{subtitle}</div>
            </div>
          </div>
          {body}
        </>
      ) : (
        <>
          <div className="inspector-title">
            <div className="inspector-icon amber">
              <LocateIcon size={15} />
            </div>
            <div>
              <h3>{title}</h3>
              <div className="sub">CLICK ANYTHING IN THE WORLD</div>
            </div>
          </div>
          <AtRiskList />
        </>
      )}
    </section>
  );
}
