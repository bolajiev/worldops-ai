"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { BoxGeometry, InstancedMesh, Object3D } from "three";
import type { WorldObject } from "@/lib/types";
import { useWorldOps } from "@/lib/store";
import { getRoadStatus } from "@/lib/metrics";
import { COLORS } from "./theme";

type RoadMeshProps = {
  object: WorldObject;
};

function Roadblock({ x, width }: { x: number; width: number }) {
  return (
    <group position={[x, 0.02, 0]}>
      <mesh position={[0, 0.34, 0]} castShadow>
        <boxGeometry args={[0.26, 0.15, width * 0.72]} />
        <meshStandardMaterial color="#e05d48" roughness={0.6} emissive="#6b1b12" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <boxGeometry args={[0.1, 0.34, width * 0.72]} />
        <meshStandardMaterial color="#e8e0cf" roughness={0.8} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 0.18, side * width * 0.25]} castShadow>
          <boxGeometry args={[0.14, 0.64, 0.14]} />
          <meshStandardMaterial color="#d6cfbf" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.28, 0.12, width * 0.72]} />
        <meshStandardMaterial color="#f4a14e" emissive="#8a4a11" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

export default function RoadMesh({ object }: RoadMeshProps) {
  const selected = useWorldOps((state) => state.selected);
  const sim = useWorldOps((state) => state.sim);
  const select = useWorldOps((state) => state.select);
  const [hovered, setHovered] = useState(false);

  const isBridge = object.type === "bridge";
  const [length, , width] = object.scale ?? [16, 0.12, 4.6];
  const rotation = object.rotation?.[1] ?? 0;
  const runtime = sim.roads[object.id];
  const status = getRoadStatus(object, runtime);
  const isSelected = selected?.kind === "object" && selected.id === object.id;
  const blocked = status === "blocked";
  const flooded = status === "flooded";
  const protectedRoad = status === "protected";
  const barrier = sim.barriers.find((entry) => entry.roadId === object.id);

  const dashCount = Math.max(0, Math.floor(length / 4.4) - 1);
  const dashes = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const mesh = dashes.current;
    if (!mesh) return;
    mesh.count = dashCount;
    for (let index = 0; index < dashCount; index += 1) {
      const x = -length / 2 + 2.2 + index * 4.4;
      dummy.position.set(x, isBridge ? 0.21 : 0.078, 0);
      dummy.scale.set(1.7, 1, 0.1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [dashCount, length, isBridge, dummy]);

  const baseY = isBridge ? 0.14 : 0.035;
  const baseHeight = isBridge ? 0.2 : 0.07;

  return (
    <group
      position={[object.position[0], 0, object.position[2]]}
      rotation={[0, rotation, 0]}
      onClick={(event) => {
        event.stopPropagation();
        select({ kind: "object", id: object.id });
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      <mesh position={[0, baseY, 0]} receiveShadow castShadow>
        <boxGeometry args={[length, baseHeight, width]} />
        <meshStandardMaterial
          color={isBridge ? "#464b42" : hovered ? "#3c4441" : COLORS.asphalt}
          roughness={0.94}
          metalness={0.02}
          emissive={hovered || isSelected ? "#3a2a14" : "#000000"}
          emissiveIntensity={hovered || isSelected ? 0.4 : 0}
        />
      </mesh>

      <mesh position={[0, baseY + baseHeight / 2 + 0.002, width / 2 - 0.28]}>
        <boxGeometry args={[length, 0.012, 0.12]} />
        <meshBasicMaterial color={COLORS.curb} transparent opacity={0.65} />
      </mesh>
      <mesh position={[0, baseY + baseHeight / 2 + 0.002, -width / 2 + 0.28]}>
        <boxGeometry args={[length, 0.012, 0.12]} />
        <meshBasicMaterial color={COLORS.curb} transparent opacity={0.65} />
      </mesh>

      {dashCount > 0 ? (
        <instancedMesh
          ref={dashes}
          args={[geometry, undefined, Math.max(1, dashCount)]}
          receiveShadow
        >
          <meshStandardMaterial
            color={COLORS.marking}
            roughness={0.8}
            emissive="#5c451c"
            emissiveIntensity={0.25}
          />
        </instancedMesh>
      ) : null}

      {isBridge ? (
        <>
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh position={[0, 0.35, side * (width / 2 - 0.15)]} castShadow>
                <boxGeometry args={[length, 0.07, 0.13]} />
                <meshStandardMaterial color="#7d8577" roughness={0.8} />
              </mesh>
              {Array.from({ length: 5 }).map((_, index) => (
                <mesh
                  key={index}
                  position={[-length / 2 + 1 + index * ((length - 2) / 4), 0.27, side * (width / 2 - 0.15)]}
                >
                  <boxGeometry args={[0.1, 0.24, 0.1]} />
                  <meshStandardMaterial color="#687164" roughness={0.9} />
                </mesh>
              ))}
            </group>
          ))}
        </>
      ) : null}

      {flooded ? (
        <>
          <mesh position={[0, baseY + baseHeight / 2 + 0.025, 0]}>
            <boxGeometry args={[length * 0.99, 0.025, width * 0.96]} />
            <meshStandardMaterial
              color="#227f8a"
              transparent
              opacity={0.72}
              roughness={0.16}
              metalness={0.35}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[length / 2 - 0.6, 0.25, width * 0.28]}>
            <boxGeometry args={[0.18, 0.18, 0.18]} />
            <meshStandardMaterial color="#ff6a55" emissive="#ff3d25" emissiveIntensity={0.9} />
          </mesh>
          <mesh position={[-length / 2 + 0.6, 0.25, -width * 0.28]}>
            <boxGeometry args={[0.18, 0.18, 0.18]} />
            <meshStandardMaterial color="#ff6a55" emissive="#ff3d25" emissiveIntensity={0.9} />
          </mesh>
        </>
      ) : null}

      {blocked ? (
        <>
          <Roadblock x={-length / 2 + 1.8} width={width} />
          <Roadblock x={length / 2 - 1.8} width={width} />
        </>
      ) : null}

      {protectedRoad ? (
        <>
          <mesh position={[0, baseY + baseHeight / 2 + 0.01, width / 2 - 0.28]}>
            <boxGeometry args={[length, 0.02, 0.16]} />
            <meshStandardMaterial color="#ffb45c" emissive="#a8681c" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0, baseY + baseHeight / 2 + 0.01, -width / 2 + 0.28]}>
            <boxGeometry args={[length, 0.02, 0.16]} />
            <meshStandardMaterial color="#ffb45c" emissive="#a8681c" emissiveIntensity={0.4} />
          </mesh>
        </>
      ) : null}

      {barrier ? (
        <mesh position={[0, 0.25, 0]} castShadow>
          <boxGeometry args={[0.7, 0.5, width * 0.92]} />
          <meshStandardMaterial color="#c9b17b" roughness={1} />
        </mesh>
      ) : null}

      {isSelected ? (
        <>
          {[
            { pos: [0, baseY + baseHeight / 2 + 0.03, width / 2 + 0.06] as const, size: [length + 0.2, 0.03, 0.07] as const },
            { pos: [0, baseY + baseHeight / 2 + 0.03, -width / 2 - 0.06] as const, size: [length + 0.2, 0.03, 0.07] as const },
            { pos: [length / 2 + 0.06, baseY + baseHeight / 2 + 0.03, 0] as const, size: [0.07, 0.03, width + 0.2] as const },
            { pos: [-length / 2 - 0.06, baseY + baseHeight / 2 + 0.03, 0] as const, size: [0.07, 0.03, width + 0.2] as const },
          ].map((edge, index) => (
            <mesh key={index} position={[...edge.pos]} scale={[...edge.size]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#ffb45c" transparent opacity={0.9} depthWrite={false} />
            </mesh>
          ))}
          <Html center position={[0, 1.1, 0]} zIndexRange={[20, 0]}>
            <div className="world-label selected">
              <span className="lab-k">{isBridge ? "BRIDGE" : "ROAD"}</span>
              {object.name}
              <span className="lab-sub">{status.toUpperCase()}</span>
            </div>
          </Html>
        </>
      ) : null}
    </group>
  );
}
