"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { Group, Mesh, Vector3 } from "three";
import type { ScenePlan, SimAgent, SimulationState } from "@/lib/types";
import { useWorldOps } from "@/lib/store";
import { COLORS, hashString, statusColor } from "./theme";
import SelectionRing from "./SelectionRing";

function useCursor() {
  return {
    onPointerOver: (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "default";
    },
  };
}

function ResidentActor({
  agent,
  selected,
}: {
  agent: SimAgent;
  selected: boolean;
}) {
  const select = useWorldOps((state) => state.select);
  const cursor = useCursor();
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const dangerRing = useRef<Mesh>(null);
  const dangerGem = useRef<Mesh>(null);
  const target = useRef(new Vector3(agent.position[0], 0, agent.position[1]));
  const initial = useMemo(
    () => [agent.position[0], 0, agent.position[1]] as [number, number, number],
    [agent.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const seed = hashString(agent.id);
  const color = statusColor(agent.status);
  const carried = agent.carriedBy !== null;
  const isDanger = agent.status === "in_danger";
  const isMoving = agent.status === "moving";

  target.current.set(agent.position[0], 0, agent.position[1]);

  useFrame(({ clock }, delta) => {
    if (group.current) {
      const factor = 1 - Math.exp(-delta * 8.5);
      group.current.position.lerp(target.current, factor);
    }
    if (body.current) {
      const bob = isMoving ? Math.abs(Math.sin(clock.elapsedTime * 6.2 + seed)) * 0.055 : 0;
      body.current.position.y = bob;
      body.current.rotation.z = isMoving ? Math.sin(clock.elapsedTime * 6.2 + seed) * 0.035 : 0;
    }
    if (dangerRing.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 4.5) * 0.12;
      dangerRing.current.scale.setScalar(scale);
      const material = dangerRing.current.material as { opacity?: number };
      if (material) material.opacity = 0.35 + Math.sin(clock.elapsedTime * 4.5) * 0.18;
    }
    if (dangerGem.current) {
      dangerGem.current.position.y = 1.45 + Math.sin(clock.elapsedTime * 3.2) * 0.08;
      dangerGem.current.rotation.y = clock.elapsedTime * 1.6;
    }
  });

  if (carried) return null;

  const pathPoints: Array<[number, number, number]> = [
    [agent.position[0], 0.16, agent.position[1]],
    ...agent.path.map(([x, z]) => [x, 0.16, z] as [number, number, number]),
  ];

  return (
    <group ref={group} position={initial}>
      <group
        onClick={(event) => {
          event.stopPropagation();
          select({ kind: "agent", id: agent.id });
        }}
        {...cursor}
      >
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.58, 0.58, 1.5, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>

        <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.34, 20]} />
          <meshBasicMaterial color="#061012" transparent opacity={0.28} depthWrite={false} />
        </mesh>

        <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.27, 0.34, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} side={2} />
        </mesh>

        {isDanger ? (
          <mesh ref={dangerRing} position={[0, 0.028, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.38, 0.46, 24]} />
            <meshBasicMaterial color={COLORS.danger} transparent opacity={0.45} depthWrite={false} side={2} />
          </mesh>
        ) : null}

        <group ref={body}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.1, 0.16, 0]} castShadow>
              <cylinderGeometry args={[0.055, 0.05, 0.28, 6]} />
              <meshStandardMaterial color="#3a3a34" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, 0.5, 0]} castShadow>
            <capsuleGeometry args={[0.16, 0.34, 4, 8]} />
            <meshStandardMaterial
              color={
                agent.role === "rescuer"
                  ? "#6fd0c6"
                  : agent.role === "worker"
                    ? "#8fb6c9"
                    : "#e0bd83"
              }
              roughness={0.8}
            />
          </mesh>
          <mesh position={[0, 0.52, 0.08]} castShadow>
            <boxGeometry args={[0.25, 0.26, 0.1]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.83, 0]} castShadow>
            <sphereGeometry args={[0.13, 10, 9]} />
            <meshStandardMaterial color="#c79c74" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.9, -0.015]} castShadow>
            <sphereGeometry args={[0.132, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
            <meshStandardMaterial color="#2e2520" roughness={1} />
          </mesh>
        </group>

        {selected ? <SelectionRing radius={0.47} active y={0.03} /> : null}

        {isDanger ? (
          <mesh ref={dangerGem} position={[0, 1.45, 0]}>
            <octahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial color={COLORS.danger} emissive={COLORS.danger} emissiveIntensity={1.1} />
          </mesh>
        ) : null}

        {selected ? (
          <Html center position={[0, 1.65, 0]} zIndexRange={[20, 0]}>
            <div className={`world-label selected ${isDanger ? "danger" : ""}`}>
              <span className="lab-k">RESIDENT</span>
              {agent.name}
              <span className="lab-sub">{agent.status.replace("_", " ").toUpperCase()}</span>
            </div>
          </Html>
        ) : null}
      </group>

      {selected && agent.path.length > 1 ? (
        <Line
          points={pathPoints}
          color={COLORS.teal}
          lineWidth={1.6}
          dashed
          dashSize={0.28}
          gapSize={0.18}
          transparent
          opacity={0.85}
        />
      ) : null}
    </group>
  );
}

function BoatActor({ boat, selected }: { boat: SimulationState["boats"][number]; selected: boolean }) {
  const select = useWorldOps((state) => state.select);
  const sim = useWorldOps((state) => state.sim);
  const cursor = useCursor();
  const group = useRef<Group>(null);
  const wake = useRef<Mesh>(null);
  const target = useRef(new Vector3(boat.position[0], 0.05, boat.position[1]));
  const initial = useMemo(
    () => [boat.position[0], 0.03, boat.position[1]] as [number, number, number],
    [boat.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  target.current.set(boat.position[0], 0.03, boat.position[1]);
  const targetAgent = sim.agents.find((agent) => agent.id === boat.targetAgentId);

  useFrame(({ clock }, delta) => {
    if (group.current) {
      const factor = 1 - Math.exp(-delta * 6);
      group.current.position.lerp(target.current, factor);
      group.current.rotation.z = Math.sin(clock.elapsedTime * 2.2) * 0.025;
    }
    if (wake.current) {
      const cycle = (clock.elapsedTime * 0.6) % 1;
      wake.current.scale.setScalar(0.6 + cycle * 0.8);
      const material = wake.current.material as { opacity?: number };
      if (material) material.opacity = 0.22 * (1 - cycle);
    }
  });

  const pathPoints: Array<[number, number, number]> = targetAgent
    ? [
        [boat.position[0], 0.15, boat.position[1]],
        [targetAgent.position[0], 0.15, targetAgent.position[1]],
      ]
    : [
        [boat.position[0], 0.15, boat.position[1]],
        [boat.home[0], 0.15, boat.home[1]],
      ];

  return (
    <group ref={group} position={initial}>
      <group
        onClick={(event) => {
          event.stopPropagation();
          select({ kind: "boat", id: boat.id });
        }}
        {...cursor}
      >
        <mesh position={[0, 0.12, 0]} scale={[1.35, 0.34, 0.62]} castShadow>
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color="#e8784e" roughness={0.55} metalness={0.08} />
        </mesh>
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.72, 0.34, 0.55]} />
          <meshStandardMaterial color="#f0e9d7" roughness={0.6} />
        </mesh>
        <mesh position={[0.02, 0.37, 0.28]}>
          <boxGeometry args={[0.46, 0.16, 0.03]} />
          <meshStandardMaterial color="#5fb7b2" emissive="#256d69" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, 0.48, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.3, 5]} />
          <meshStandardMaterial color="#d9d2c0" />
        </mesh>
        <mesh position={[0, 0.63, 0]}>
          <boxGeometry args={[0.1, 0.05, 0.04]} />
          <meshStandardMaterial color="#ffb45c" emissive="#ffb45c" emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[-0.94, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.045, 6, 14]} />
          <meshStandardMaterial color="#f4ebd5" roughness={0.7} />
        </mesh>
        <mesh ref={wake} position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1.06, 28]} />
          <meshBasicMaterial color="#b8f5ec" transparent opacity={0.2} depthWrite={false} side={2} />
        </mesh>

        {boat.passengers.length > 0
          ? boat.passengers.map((_, index) => (
              <mesh key={index} position={[-0.3 + index * 0.32, 0.32, 0]} castShadow>
                <sphereGeometry args={[0.1, 8, 7]} />
                <meshStandardMaterial color="#e0bd83" roughness={0.9} />
              </mesh>
            ))
          : null}

        {selected ? <SelectionRing radius={1.05} color={COLORS.teal} active y={0.02} /> : null}

        {selected ? (
          <Html center position={[0, 1.05, 0]} zIndexRange={[20, 0]}>
            <div className={`world-label ${selected ? "selected" : ""}`}>
              <span className="lab-k">SKIFF</span>
              {boat.name}
              <span className="lab-sub">
                {boat.phase === "to_rescue"
                  ? "RECOVERING"
                  : boat.phase === "returning"
                    ? "RETURNING"
                    : "READY"}
                {boat.passengers.length ? ` · ${boat.passengers.length} ABOARD` : ""}
              </span>
            </div>
          </Html>
        ) : null}
      </group>

      {selected ? (
        <Line
          points={pathPoints}
          color={COLORS.teal}
          lineWidth={1.4}
          dashed
          dashSize={0.3}
          gapSize={0.2}
          transparent
          opacity={0.7}
        />
      ) : null}
    </group>
  );
}

function RuntimeBarrier({
  barrier,
  plan,
}: {
  barrier: SimulationState["barriers"][number];
  plan: ScenePlan;
}) {
  const select = useWorldOps((state) => state.select);
  const selected = useWorldOps((state) => state.selected);
  const road = plan.objects.find((object) => object.id === barrier.roadId);
  const rotation = road?.rotation?.[1] ?? 0;
  const width = road?.scale?.[2] ?? 4.4;
  const isSelected = selected?.kind === "barrier" && selected.id === barrier.id;

  return (
    <group
      position={[barrier.position[0], 0, barrier.position[1]]}
      rotation={[0, rotation, 0]}
      onClick={(event) => {
        event.stopPropagation();
        select({ kind: "barrier", id: barrier.id });
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      {[0, 1, 2].map((row) =>
        Array.from({ length: 5 }).map((_, index) => (
          <mesh
            key={`${row}-${index}`}
            position={[
              (row % 2 === 0 ? -0.12 : 0.12) + row * 0.06,
              0.14 + row * 0.22,
              -width / 2 + 0.55 + index * ((width - 1.1) / 4),
            ]}
            rotation={[0, 0.12 * ((index % 3) - 1), 0]}
            castShadow
          >
            <boxGeometry args={[0.75, 0.22, 0.55]} />
            <meshStandardMaterial color={row === 2 ? "#d7c08b" : "#c2a873"} roughness={1} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.84, 0]}>
        <boxGeometry args={[0.9, 0.04, 0.34]} />
        <meshStandardMaterial color="#ffb45c" emissive="#a6661b" emissiveIntensity={0.35} />
      </mesh>
      {isSelected ? (
        <Html center position={[0, 1.35, 0]} zIndexRange={[20, 0]}>
          <div className="world-label selected">
            <span className="lab-k">BARRIER</span>
            {Math.ceil((barrier.ticksRemaining * plan.simulation.tickMs) / 1000)}s protection
          </div>
        </Html>
      ) : null}
    </group>
  );
}

export function Residents() {
  const agents = useWorldOps((state) => state.sim.agents);
  const selected = useWorldOps((state) => state.selected);
  return (
    <>
      {agents.map((agent) => (
        <ResidentActor
          key={agent.id}
          agent={agent}
          selected={selected?.kind === "agent" && selected.id === agent.id}
        />
      ))}
    </>
  );
}

export function RescueBoats() {
  const boats = useWorldOps((state) => state.sim.boats);
  const selected = useWorldOps((state) => state.selected);
  return (
    <>
      {boats.map((boat) => (
        <BoatActor
          key={boat.id}
          boat={boat}
          selected={selected?.kind === "boat" && selected.id === boat.id}
        />
      ))}
    </>
  );
}

export function RuntimeBarriers({ plan }: { plan: ScenePlan }) {
  const barriers = useWorldOps((state) => state.sim.barriers);
  return (
    <>
      {barriers.map((barrier) => (
        <RuntimeBarrier key={barrier.id} barrier={barrier} plan={plan} />
      ))}
    </>
  );
}

