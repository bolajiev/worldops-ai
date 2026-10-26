"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import type { ScenePlan, SimulationState } from "@/lib/types";
import { CELL_SIZE } from "@/lib/navigation";

type FloodLayerProps = {
  plan: ScenePlan;
  sim: SimulationState;
};

export default function FloodLayer({ plan, sim }: FloodLayerProps) {
  const mesh = useRef<InstancedMesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const maxCells =
    Math.ceil(plan.worldBounds.width / CELL_SIZE) *
    Math.ceil(plan.worldBounds.depth / CELL_SIZE);

  const floodCells = useMemo(() => sim.floodCells, [sim.floodCells]);
  const waterRatio = Math.max(
    0,
    Math.min(
      1,
      (sim.waterLevel - plan.simulation.waterStart) /
        Math.max(0.001, plan.simulation.waterMax - plan.simulation.waterStart),
    ),
  );

  const transform = useMemo(() => {
    const quaternion = new Quaternion().setFromAxisAngle(
      new Vector3(1, 0, 0),
      -Math.PI / 2,
    );
    const scale = new Vector3(1.92, 1.92, 1);
    return { quaternion, scale };
  }, []);

  useLayoutEffect(() => {
    const instance = mesh.current;
    if (!instance) return;
    instance.count = floodCells.length;
    const matrix = new Matrix4();
    const position = new Vector3();
    floodCells.forEach(([x, z], index) => {
      position.set(x, 0.092, z);
      matrix.compose(position, transform.quaternion, transform.scale);
      instance.setMatrixAt(index, matrix);
    });
    instance.instanceMatrix.needsUpdate = true;
    instance.computeBoundingSphere();
  }, [floodCells, transform]);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.opacity = 0.56 + Math.sin(clock.elapsedTime * 1.3) * 0.035;
    }
    if (mesh.current) {
      mesh.current.position.y = Math.sin(clock.elapsedTime * 0.9) * 0.008;
    }
  });

  const color = useMemo(() => {
    const deep = new Color("#1a6773");
    const shallow = new Color("#39a5b1");
    return shallow.clone().lerp(deep, waterRatio * 0.7);
  }, [waterRatio]);

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, Math.max(1, maxCells)]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        ref={materialRef}
        color={color}
        emissive="#1a7d89"
        emissiveIntensity={0.12}
        transparent
        opacity={0.6}
        roughness={0.18}
        metalness={0.34}
        side={DoubleSide}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
