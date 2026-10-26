"use client";

import { useEffect, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { CameraFocus, ScenePlan } from "@/lib/types";

type CameraRigProps = {
  plan: ScenePlan;
  focus: CameraFocus | null;
  worldNonce: number;
};

export default function CameraRig({ plan, focus, worldNonce }: CameraRigProps) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const { width, depth } = plan.worldBounds;
  const animation = useRef<{
    target: Vector3;
    position: Vector3;
    elapsed: number;
  } | null>(null);

  useEffect(() => {
    camera.position.set(width * 0.78, width * 0.73, depth * 1.34);
    camera.lookAt(0, 0, 5);
    if (controls.current) {
      controls.current.target.set(0, 0, 5);
      controls.current.update();
    }
    animation.current = null;
  }, [worldNonce, width, depth, camera]);

  useEffect(() => {
    if (!focus) return;
    const target = new Vector3(focus.target[0], focus.target[1], focus.target[2]);
    const distance = Math.max(20, Math.min(width * 0.32, 26));
    animation.current = {
      target,
      position: new Vector3(
        target.x + distance * 0.62,
        target.y + distance * 0.58,
        target.z + distance * 0.72,
      ),
      elapsed: 0,
    };
  }, [focus, width]);

  useFrame((_, delta) => {
    const current = controls.current;
    const anim = animation.current;
    if (!current || !anim) return;
    const blend = 1 - Math.exp(-delta * 5);
    current.target.lerp(anim.target, blend);
    camera.position.lerp(anim.position, blend);
    current.update();
    anim.elapsed += delta;
    if (
      anim.elapsed > 2.2 ||
      (camera.position.distanceTo(anim.position) < 0.12 &&
        current.target.distanceTo(anim.target) < 0.03)
    ) {
      animation.current = null;
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.075}
      minDistance={16}
      maxDistance={130}
      minPolarAngle={0.16}
      maxPolarAngle={Math.PI * 0.47}
      screenSpacePanning
      panSpeed={0.75}
      zoomSpeed={0.8}
      onStart={() => {
        animation.current = null;
      }}
    />
  );
}
