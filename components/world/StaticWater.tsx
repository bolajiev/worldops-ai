"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { ScenePlan, WorldObject } from "@/lib/types";
import { useWorldOps } from "@/lib/store";
import { COLORS } from "./theme";

type WaterObjectProps = {
  object: WorldObject;
  selected: boolean;
};

function WaterObject({ object, selected }: WaterObjectProps) {
  const material = useRef<MeshStandardMaterial>(null);
  const highlight = useRef<Mesh>(null);
  const select = useWorldOps((state) => state.select);
  const [sx, , sz] = object.scale ?? [8, 0.08, 8];
  const rotation = object.rotation?.[1] ?? 0;

  useFrame(({ clock }) => {
    if (material.current) {
      material.current.emissiveIntensity = 0.12 + Math.sin(clock.elapsedTime * 0.8) * 0.04;
    }
    if (highlight.current) {
      const mat = highlight.current.material as { opacity?: number };
      if (mat) mat.opacity = 0.1 + Math.sin(clock.elapsedTime * 1.1) * 0.035;
    }
  });

  return (
    <group
      position={[object.position[0], 0, object.position[2]]}
      rotation={[0, rotation, 0]}
      onClick={(event) => {
        event.stopPropagation();
        select({ kind: "object", id: object.id });
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      <mesh position={[0, 0.025, 0]} receiveShadow>
        <boxGeometry args={[sx + 1.1, 0.08, sz + 1.1]} />
        <meshStandardMaterial color="#31463b" roughness={1} />
      </mesh>
      <mesh position={[0, 0.065, 0]} ref={highlight}>
        <boxGeometry args={[sx + 0.2, 0.02, sz + 0.2]} />
        <meshBasicMaterial
          color="#7de6dc"
          transparent
          opacity={0.09}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.072, 0]}>
        <boxGeometry args={[sx, 0.035, sz]} />
        <meshStandardMaterial
          ref={material}
          color={COLORS.waterDeep}
          emissive="#1b8290"
          emissiveIntensity={0.12}
          roughness={0.12}
          metalness={0.45}
          transparent
          opacity={0.88}
        />
      </mesh>

      {Array.from({ length: 4 }).map((_, index) => {
        const offset = (index - 1.5) * (sz / 5);
        return (
          <mesh key={index} position={[0.1, 0.094, offset]}>
            <boxGeometry args={[sx * 0.68, 0.006, 0.055]} />
            <meshBasicMaterial color="#9ff1e6" transparent opacity={0.22} depthWrite={false} />
          </mesh>
        );
      })}

      {selected ? (
        <>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[sx + 0.35, 0.02, sz + 0.35]} />
            <meshBasicMaterial color="#ffb45c" wireframe transparent opacity={0.8} />
          </mesh>
          <Html center position={[0, 0.8, 0]} zIndexRange={[20, 0]}>
            <div className="world-label selected">
              <span className="lab-k">WATER</span>
              {object.name}
            </div>
          </Html>
        </>
      ) : null}
    </group>
  );
}

export default function StaticWater({ plan }: { plan: ScenePlan }) {
  const selected = useWorldOps((state) => state.selected);
  const waters = plan.objects.filter((object) => object.type === "water");
  return (
    <>
      {waters.map((object) => (
        <WaterObject
          key={object.id}
          object={object}
          selected={selected?.kind === "object" && selected.id === object.id}
        />
      ))}
    </>
  );
}
