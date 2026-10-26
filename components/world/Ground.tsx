"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import type { ScenePlan } from "@/lib/types";
import { COLORS, hashString } from "./theme";

type GroundProps = {
  plan: ScenePlan;
};

type Patch = {
  x: number;
  z: number;
  rx: number;
  rz: number;
  rotation: number;
  color: string;
};

export default function Ground({ plan }: GroundProps) {
  const ring = useRef<Mesh>(null);
  const { width, depth } = plan.worldBounds;

  const patches = useMemo<Patch[]>(() => {
    const palette = [COLORS.grassLight, COLORS.grassDark, "#65794f", "#546b47"];
    return Array.from({ length: 18 }, (_, index) => {
      const seed = hashString(`patch-${index}`);
      const x = ((seed % 1000) / 1000 - 0.5) * (width - 10);
      const z = (((seed >>> 10) % 1000) / 1000 - 0.5) * (depth - 8);
      return {
        x,
        z,
        rx: 2.4 + (seed % 5),
        rz: 1.8 + ((seed >>> 4) % 4),
        rotation: ((seed >>> 7) % 360) * (Math.PI / 180),
        color: palette[index % palette.length],
      };
    });
  }, [width, depth]);

  useFrame(({ clock }) => {
    if (ring.current) {
      const material = ring.current.material as { opacity?: number };
      if (material) material.opacity = 0.05 + Math.sin(clock.elapsedTime * 0.6) * 0.012;
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]} receiveShadow>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial
          color={COLORS.oceanDeep}
          roughness={0.26}
          metalness={0.42}
        />
      </mesh>

      {[58, 68, 78, 92].map((radius, index) => (
        <mesh
          key={radius}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.59, 0]}
        >
          <ringGeometry args={[radius, radius + 0.22, 96]} />
          <meshBasicMaterial
            color={index % 2 === 0 ? "#2c8d8f" : "#3a6e6b"}
            transparent
            opacity={0.14 - index * 0.022}
            depthWrite={false}
          />
        </mesh>
      ))}

      <mesh position={[0, -0.33, 0]} receiveShadow castShadow>
        <boxGeometry args={[width + 4.5, 0.5, depth + 4.5]} />
        <meshStandardMaterial color={COLORS.sand} roughness={1} />
      </mesh>

      <mesh position={[0, -0.18, 0]} receiveShadow>
        <boxGeometry args={[width + 1.2, 0.34, depth + 1.2]} />
        <meshStandardMaterial color={COLORS.sandLight} roughness={1} />
      </mesh>

      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[width, 0.3, depth]} />
        <meshStandardMaterial color={COLORS.grass} roughness={1} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <planeGeometry args={[width - 0.6, depth - 0.6]} />
        <meshStandardMaterial color={COLORS.grass} roughness={1} />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[width / 2 - 2.2, 0.006, 0]}
        scale={[4.6, 1, depth * 0.42]}
      >
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color={COLORS.sandLight} roughness={1} />
      </mesh>

      {patches.map((patch, index) => (
        <mesh
          key={index}
          rotation={[-Math.PI / 2, 0, patch.rotation]}
          position={[patch.x, 0.007, patch.z]}
          scale={[patch.rx, patch.rz, 1]}
          receiveShadow
        >
          <circleGeometry args={[1, 20]} />
          <meshStandardMaterial color={patch.color} roughness={1} />
        </mesh>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-2, 0.008, 9]}>
        <circleGeometry args={[8.5, 32]} />
        <meshStandardMaterial color="#7f7b61" roughness={1} />
      </mesh>

      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[Math.max(width, depth) * 0.5, Math.max(width, depth) * 0.5 + 0.16, 96]} />
        <meshBasicMaterial color="#6d9389" transparent opacity={0.06} depthWrite={false} />
      </mesh>
    </group>
  );
}
