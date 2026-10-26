"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Group } from "three";
import type { ScenePlan } from "@/lib/types";
import { useWorldOps } from "@/lib/store";
import { getRoadStatus } from "@/lib/metrics";

export default function WorldMarkers({ plan }: { plan: ScenePlan }) {
  const surge = useRef<Group>(null);
  const marker = useRef<Group>(null);
  const sim = useWorldOps((state) => state.sim);
  const select = useWorldOps((state) => state.select);
  const { width, depth } = plan.worldBounds;
  const bridge = plan.objects.find((object) => object.type === "bridge");
  const bridgeStatus = bridge ? getRoadStatus(bridge, sim.roads[bridge.id]) : null;
  const bridgeColor =
    bridgeStatus === "flooded" || bridgeStatus === "blocked"
      ? "#ff6a55"
      : bridgeStatus === "protected"
        ? "#ffb45c"
        : "#63d2c9";

  useFrame(({ clock }) => {
    if (surge.current) {
      surge.current.position.x = width / 2 + 3.4 + Math.sin(clock.elapsedTime * 1.1) * 0.22;
    }
    if (marker.current) {
      marker.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.08;
    }
  });

  return (
    <>
      <group ref={marker} position={[0, 0.1, -depth / 2 - 2.4]}>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.62, 32]} />
          <meshBasicMaterial color="#8fa6a1" transparent opacity={0.45} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.74, 6]} />
          <meshBasicMaterial color="#98aca6" transparent opacity={0.55} />
        </mesh>
        <mesh position={[0, 0.9, 0]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.13, 0.34, 4]} />
          <meshBasicMaterial color="#b8cbc5" transparent opacity={0.8} />
        </mesh>
        <Html center position={[0, 1.32, 0]} zIndexRange={[10, 0]}>
          <div className="world-label">
            <span className="lab-k">N</span>
            NORTH
          </div>
        </Html>
      </group>

      {bridge ? (
        <Html center position={[bridge.position[0], 2.4, bridge.position[2]]} zIndexRange={[22, 0]}>
          <button
            type="button"
            className={`world-label clickable ${bridgeStatus === "flooded" || bridgeStatus === "blocked" ? "danger" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              select({ kind: "object", id: bridge.id }, true);
            }}
            title="Inspect the causeway"
          >
            <span className="lab-k" style={{ color: bridgeColor }}>
              CAUSEWAY
            </span>
            {bridgeStatus?.toUpperCase() ?? "OPEN"}
          </button>
        </Html>
      ) : null}

      <group ref={surge} position={[width / 2 + 3.4, 0, 0]}>
        <mesh position={[0, 0.52, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.42, 1.5, 3]} />
          <meshStandardMaterial color="#ff7a5f" emissive="#7d2618" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[1.1, 0.52, 0]}>
          <boxGeometry args={[1.5, 0.09, 0.09]} />
          <meshStandardMaterial color="#ff9b7d" emissive="#7d2618" emissiveIntensity={0.3} />
        </mesh>
        <Html center position={[0, 2.05, 0]} zIndexRange={[10, 0]}>
          <div className="world-label danger">
            <span className="lab-k">SURGE</span>
            FLOOD FROM EAST
          </div>
        </Html>
      </group>
    </>
  );
}
