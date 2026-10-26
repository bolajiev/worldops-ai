"use client";

import { Component, Suspense, useEffect, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { useWorldOps } from "@/lib/store";
import Ground from "./world/Ground";
import StaticWater from "./world/StaticWater";
import FloodLayer from "./world/FloodLayer";
import RoadMesh from "./world/RoadMesh";
import BuildingMesh from "./world/Buildings";
import { RescueBoats, Residents, RuntimeBarriers } from "./world/Actors";
import WorldMarkers from "./world/WorldMarkers";
import CameraRig from "./world/CameraRig";

function Scene() {
  const plan = useWorldOps((state) => state.plan);
  const sim = useWorldOps((state) => state.sim);
  const focus = useWorldOps((state) => state.focus);
  const worldNonce = useWorldOps((state) => state.worldNonce);

  const roads = plan.objects.filter(
    (object) => object.type === "road" || object.type === "bridge",
  );
  const buildings = plan.objects.filter((object) =>
    [
      "house",
      "school",
      "clinic",
      "shelter",
      "factory",
      "tree",
      "machine",
      "conveyor",
      "rescue_boat",
      "barrier",
    ].includes(object.type),
  );

  return (
    <>
      <color attach="background" args={["#071416"]} />
      <fog attach="fog" args={["#071416", 88, 190]} />

      <ambientLight intensity={0.32} color="#b8d8d1" />
      <hemisphereLight args={["#d9efe7", "#0f282b", 1.15]} />
      <directionalLight
        position={[36, 48, 20]}
        intensity={2.15}
        color="#ffe2b5"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-56}
        shadow-camera-right={56}
        shadow-camera-top={56}
        shadow-camera-bottom={-56}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
      />
      <directionalLight position={[-34, 26, -30]} intensity={0.55} color="#72d8ce" />
      <pointLight position={[-2, 8, 8]} intensity={16} distance={30} color="#ffb45c" />

      <Ground plan={plan} />
      <StaticWater plan={plan} />
      <FloodLayer plan={plan} sim={sim} />

      {roads.map((object) => (
        <RoadMesh key={object.id} object={object} />
      ))}

      {buildings.map((object) => (
        <BuildingMesh key={object.id} object={object} plan={plan} />
      ))}

      <RuntimeBarriers plan={plan} />
      <Residents />
      <RescueBoats />
      <WorldMarkers plan={plan} />

      <CameraRig plan={plan} focus={focus} worldNonce={worldNonce} />
    </>
  );
}

class CanvasBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    console.error("[worldops] 3D scene failed:", error.message);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function CanvasFallback({ detail }: { detail: string }) {
  return (
    <div className="canvas-wrap">
      <div className="canvas-fallback">
        <span className="kicker">
          <span className="num">3D</span>
          <span className="bar" />
          <span>VIEW OFFLINE</span>
        </span>
        <strong>The 3D view could not start.</strong>
        <p>{detail} The simulation console, prompts, edits and outcome controls still work.</p>
      </div>
    </div>
  );
}

function CanvasReady() {
  const select = useWorldOps((state) => state.select);
  return (
    <div className="canvas-wrap">
      <Canvas
        shadows
        dpr={[1, 1.35]}
        camera={{ fov: 42, near: 0.1, far: 320, position: [50, 46, 60] }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onPointerMissed={() => select(null)}
        onCreated={({ gl, scene, camera }) => {
          gl.toneMappingExposure = 1.04;
          (window as unknown as { __worldops?: unknown }).__worldops = { gl, scene, camera };
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <div className="canvas-vignette" />
    </div>
  );
}

export default function WorldCanvas() {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const probe = document.createElement("canvas");
      const context =
        probe.getContext("webgl2") ??
        probe.getContext("webgl") ??
        probe.getContext("experimental-webgl");
      if (context && "getExtension" in context) {
        const extension = (
          context as WebGLRenderingContext
        ).getExtension("WEBGL_lose_context");
        extension?.loseContext();
      }
      setSupported(Boolean(context));
    } catch {
      setSupported(false);
    }
  }, []);

  if (supported === null) {
    return (
      <div className="canvas-wrap">
        <div className="canvas-loading">
          <span className="spinner-ring" aria-hidden="true" />
          Initializing the 3D world
        </div>
      </div>
    );
  }

  if (!supported) {
    return (
      <CanvasFallback detail="This browser did not provide a WebGL context." />
    );
  }

  return (
    <CanvasBoundary
      fallback={
        <CanvasFallback detail="The renderer stopped before the scene was ready." />
      }
    >
      <CanvasReady />
    </CanvasBoundary>
  );
}
