"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

type SelectionRingProps = {
  radius?: number;
  y?: number;
  color?: string;
  active?: boolean;
};

export default function SelectionRing({
  radius = 1,
  y = 0.04,
  color = "#ffb45c",
  active = true,
}: SelectionRingProps) {
  const inner = useRef<Mesh>(null);
  const outer = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (inner.current) {
      const scale = 1 + Math.sin(t * 3.2) * 0.035;
      inner.current.scale.setScalar(scale);
    }
    if (outer.current) {
      const pulse = 1.08 + Math.sin(t * 2.1 + 1) * 0.045;
      outer.current.scale.setScalar(pulse);
      const material = outer.current.material as { opacity?: number };
      if (material) material.opacity = active ? 0.18 : 0;
    }
  });

  if (!active) return null;

  return (
    <group position={[0, y, 0]}>
      <mesh ref={inner} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius, radius + 0.07, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} side={2} />
      </mesh>
      <mesh ref={outer} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius + 0.12, radius + 0.2, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} side={2} />
      </mesh>
    </group>
  );
}
