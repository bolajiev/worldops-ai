"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import type { ScenePlan } from "@/lib/types";

export default function WorldMarkers({ plan }: { plan: ScenePlan }) {
  const surge = useRef<Group>(null);
  const marker = useRef<Group>(null);
  const { width, depth } = plan.worldBounds;

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
          <meshBasicMaterial color="#8fa6a1" transparent opacity={0.3} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.74, 6]} />
          <meshBasicMaterial color="#98aca6" transparent opacity={0.32} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <coneGeometry args={[0.13, 0.34, 4]} />
          <meshBasicMaterial color="#b8cbc5" transparent opacity={0.45} />
        </mesh>
      </group>

      <group ref={surge} position={[width / 2 + 3.4, 0, 0]}>
        <mesh position={[0, 0.52, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.42, 1.5, 3]} />
          <meshStandardMaterial color="#ff7a5f" emissive="#7d2618" emissiveIntensity={0.35} transparent opacity={0.55} />
        </mesh>
        <mesh position={[1.1, 0.52, 0]}>
          <boxGeometry args={[1.5, 0.09, 0.09]} />
          <meshStandardMaterial color="#ff9b7d" emissive="#7d2618" emissiveIntensity={0.2} transparent opacity={0.55} />
        </mesh>
      </group>
    </>
  );
}
