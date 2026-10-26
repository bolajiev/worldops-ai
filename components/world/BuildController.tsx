"use client";

import { useEffect, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Group, Mesh } from "three";
import { useWorldOps } from "@/lib/store";
import { defaultScale } from "@/lib/builder";

function Ghost({
  type,
  scale,
  rotation,
}: {
  type: string;
  scale: [number, number, number];
  rotation: number;
}) {
  const isFlat = type === "road" || type === "bridge" || type === "water";
  const isResident = type === "resident";
  return (
    <group rotation={[0, rotation, 0]}>
      {isFlat ? (
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[scale[0], 0.05, scale[2]]} />
          <meshStandardMaterial color="#c44e33" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ) : isResident ? (
        <group position={[0, 0.02, 0]}>
          <mesh position={[0, 0.5, 0]}>
            <capsuleGeometry args={[0.17, 0.35, 4, 8]} />
            <meshStandardMaterial color="#c44e33" transparent opacity={0.5} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.86, 0]}>
            <sphereGeometry args={[0.14, 10, 8]} />
            <meshStandardMaterial color="#c44e33" transparent opacity={0.5} depthWrite={false} />
          </mesh>
        </group>
      ) : (
        <mesh position={[0, scale[1] / 2, 0]}>
          <boxGeometry args={[scale[0], scale[1], scale[2]]} />
          <meshStandardMaterial color="#c44e33" transparent opacity={0.34} depthWrite={false} />
        </mesh>
      )}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(scale[0], scale[2]) * 0.62, Math.max(scale[0], scale[2]) * 0.68, 32]} />
        <meshBasicMaterial color="#c44e33" transparent opacity={0.75} depthWrite={false} side={2} />
      </mesh>
    </group>
  );
}

export default function BuildController() {
  const tool = useWorldOps((state) => state.placementTool);
  const plan = useWorldOps((state) => state.plan);
  const placeAt = useWorldOps((state) => state.placeAt);
  const ghost = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const point = useRef<[number, number] | null>(null);

  const moveObject =
    tool?.kind === "move"
      ? plan.objects.find((object) => object.id === tool.id)
      : null;
  const type =
    tool?.kind === "object"
      ? tool.type
      : tool?.kind === "resident"
        ? "resident"
        : moveObject?.type ?? "house";
  const scale =
    tool?.kind === "resident"
      ? ([0.7, 1.7, 0.7] as [number, number, number])
      : moveObject?.scale ??
        defaultScale(type as Parameters<typeof defaultScale>[0]);
  const rotation = moveObject?.rotation?.[1] ?? 0;

  useEffect(() => {
    if (!tool) {
      point.current = null;
      return;
    }
    document.body.style.cursor = "crosshair";
    return () => {
      document.body.style.cursor = "default";
    };
  }, [tool]);

  useFrame(({ clock }) => {
    if (!ghost.current) return;
    if (!tool || !point.current) {
      ghost.current.visible = false;
      return;
    }
    ghost.current.visible = true;
    ghost.current.position.x = point.current[0];
    ghost.current.position.z = point.current[1];
    if (ring.current) {
      ring.current.rotation.z = clock.elapsedTime * 0.4;
    }
  });

  if (!tool) return null;

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.2, 0]}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          point.current = [event.point.x, event.point.z];
        }}
        onPointerOut={() => {
          point.current = null;
        }}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          placeAt(event.point.x, event.point.z);
        }}
      >
        <planeGeometry args={[plan.worldBounds.width + 20, plan.worldBounds.depth + 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <group ref={ghost} visible={false}>
        <Ghost
          type={type}
          scale={[scale[0], scale[1], scale[2]]}
          rotation={rotation}
        />
        <mesh ref={ring} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(scale[0], scale[2]) * 0.78, Math.max(scale[0], scale[2]) * 0.82, 40]} />
          <meshBasicMaterial color="#ff9c7a" transparent opacity={0.3} depthWrite={false} side={2} />
        </mesh>
      </group>
    </>
  );
}
