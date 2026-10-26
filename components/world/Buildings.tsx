"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { ScenePlan, WorldObject } from "@/lib/types";
import { useWorldOps } from "@/lib/store";
import { COLORS, hashString, pickFrom } from "./theme";
import SelectionRing from "./SelectionRing";

type BuildingProps = {
  object: WorldObject;
};

function useObjectSelection(object: WorldObject) {
  const select = useWorldOps((state) => state.select);
  const selected = useWorldOps((state) => state.selected);
  const [hovered, setHovered] = useState(false);
  return {
    hovered,
    setHovered,
    isSelected: selected?.kind === "object" && selected.id === object.id,
    select: () => select({ kind: "object", id: object.id }),
  };
}

function BuildingHitbox({
  size,
  onClick,
  onEnter,
  onLeave,
}: {
  size: [number, number, number];
  onClick: (event: { stopPropagation: () => void }) => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <mesh
      position={[0, size[1] / 2, 0]}
      onClick={onClick}
      onPointerOver={onEnter}
      onPointerOut={onLeave}
    >
      <boxGeometry args={size} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  );
}

function Window({
  position,
  scale = [0.4, 0.44, 0.04],
  warm = true,
}: {
  position: [number, number, number];
  scale?: [number, number, number];
  warm?: boolean;
}) {
  return (
    <mesh position={position} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={warm ? "#f9e5b8" : "#9fc9c4"}
        emissive={warm ? "#ffc57a" : "#5eaba3"}
        emissiveIntensity={warm ? 0.45 : 0.25}
        roughness={0.4}
      />
    </mesh>
  );
}

function ShelterMesh({ object }: BuildingProps) {
  const { isSelected, select, hovered, setHovered } = useObjectSelection(object);
  const stage = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const beacon = useRef<MeshStandardMaterial>(null);
  const [sx, sy, sz] = object.scale ?? [4.6, 3, 4.6];
  const rescueOnly = object.metadata?.rescueOnly === true;
  const rotation = object.rotation?.[1] ?? 0;

  useFrame(({ clock }) => {
    const pulse = 0.55 + Math.sin(clock.elapsedTime * 2.6) * 0.45;
    if (beacon.current) beacon.current.emissiveIntensity = 1.2 + pulse * 1.6;
    if (halo.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 2.1) * 0.18;
      halo.current.scale.setScalar(scale);
      const material = halo.current.material as { opacity?: number };
      if (material) material.opacity = 0.12 + pulse * 0.12;
    }
    if (stage.current) {
      stage.current.position.y = Math.sin(clock.elapsedTime * 1.2) * 0.008;
    }
  });

  return (
    <group
      position={[object.position[0], 0, object.position[2]]}
      rotation={[0, rotation, 0]}
      onClick={(event) => {
        event.stopPropagation();
        select();
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
      <BuildingHitbox
        size={[sx + 1, sy + 2.4, sz + 1]}
        onClick={(event) => {
          event.stopPropagation();
          select();
        }}
        onEnter={() => {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onLeave={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      />

      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[sx + 1.6, 0.12, sz + 1.6]} />
        <meshStandardMaterial color="#6f6750" roughness={1} />
      </mesh>

      <mesh ref={stage} position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[sx + 0.9, 0.45, sz + 0.9]} />
        <meshStandardMaterial
          color={rescueOnly ? "#46514a" : "#8e8668"}
          roughness={0.95}
          emissive={hovered ? "#352b18" : "#000000"}
          emissiveIntensity={hovered ? 0.35 : 0}
        />
      </mesh>

      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sxSign, szSign]) => (
        <mesh
          key={`${sxSign}-${szSign}`}
          position={[sxSign * (sx / 2 - 0.25), sy * 0.52, szSign * (sz / 2 - 0.25)]}
          castShadow
        >
          <cylinderGeometry args={[0.11, 0.13, sy * 0.95, 6]} />
          <meshStandardMaterial color="#6c5c42" roughness={0.9} />
        </mesh>
      ))}

      <mesh position={[0, sy * 0.82, 0]} castShadow receiveShadow>
        <coneGeometry args={[Math.max(sx, sz) * 0.78, sy * 0.36, 4]} />
        <meshStandardMaterial
          color={rescueOnly ? "#a36b3f" : "#4b7a67"}
          roughness={0.8}
        />
      </mesh>

      <mesh position={[0, sy * 1.0, 0]} castShadow>
        <boxGeometry args={[sx * 0.92, 0.14, sz * 0.92]} />
        <meshStandardMaterial color={rescueOnly ? "#8b5b36" : "#5d947d"} roughness={0.8} />
      </mesh>

      <mesh position={[0, 0.22, sz / 2 + 0.7]}>
        <boxGeometry args={[1.4, 0.3, 0.8]} />
        <meshStandardMaterial color="#8a7b5f" roughness={1} />
      </mesh>

      <mesh
        position={[sx * 0.25, sy * 0.58, sz / 2 + 0.48]}
        castShadow
      >
        <boxGeometry args={[1, 1.2, 0.08]} />
        <meshStandardMaterial
          color={rescueOnly ? "#c86b45" : "#e4d7b9"}
          roughness={0.8}
        />
      </mesh>

      <mesh position={[sx * 0.25, sy * 0.98, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 2.2, 6]} />
        <meshStandardMaterial color="#d9d2c0" roughness={0.6} />
      </mesh>
      <mesh position={[sx * 0.25 + 0.36, sy * 1.56, 0]}>
        <boxGeometry args={[0.7, 0.34, 0.04]} />
        <meshStandardMaterial color={rescueOnly ? "#e8834e" : COLORS.teal} emissive={rescueOnly ? "#7a2d12" : "#1b6d68"} emissiveIntensity={0.25} />
      </mesh>

      <mesh position={[-sx * 0.32, sy * 1.03, 0]} castShadow>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial
          ref={beacon}
          color="#ffb45c"
          emissive="#ffb45c"
          emissiveIntensity={1.6}
        />
      </mesh>
      <mesh ref={halo} position={[-sx * 0.32, sy * 1.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.24, 0.32, 24]} />
        <meshBasicMaterial color="#ffd18b" transparent opacity={0.2} depthWrite={false} />
      </mesh>

      <mesh position={[sx * 0.08, 0.52, sz * 0.28]} castShadow>
        <boxGeometry args={[0.8, 0.5, 0.8]} />
        <meshStandardMaterial color="#a98f5d" roughness={1} />
      </mesh>
      <mesh position={[sx * 0.08, 0.78, sz * 0.28]} castShadow>
        <boxGeometry args={[0.66, 0.1, 0.66]} />
        <meshStandardMaterial color="#d3bb87" roughness={1} />
      </mesh>

      <SelectionRing radius={Math.max(sx, sz) * 0.72 + 0.5} active={isSelected} y={0.05} />

    </group>
  );
}

function HouseMesh({ object }: BuildingProps) {
  const { isSelected, select, hovered, setHovered } = useObjectSelection(object);
  const [sx, sy, sz] = object.scale ?? [4.2, 3.4, 4.2];
  const rotation = object.rotation?.[1] ?? 0;
  const wall = pickFrom(COLORS.houseWalls, object.id);
  const roof = pickFrom(COLORS.roofs, `${object.id}-roof`);
  const bodyH = sy * 0.68;
  const bodyY = 0.1 + bodyH / 2;

  return (
    <group
      position={[object.position[0], 0, object.position[2]]}
      rotation={[0, rotation, 0]}
      onClick={(event) => {
        event.stopPropagation();
        select();
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
      <BuildingHitbox
        size={[sx + 0.8, sy + 1.2, sz + 0.8]}
        onClick={(event) => {
          event.stopPropagation();
          select();
        }}
        onEnter={() => {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onLeave={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      />
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[sx * 0.96, 0.1, sz * 0.96]} />
        <meshStandardMaterial color="#5d5644" roughness={1} />
      </mesh>
      <mesh position={[0, bodyY, 0]} castShadow receiveShadow>
        <boxGeometry args={[sx * 0.82, bodyH, sz * 0.82]} />
        <meshStandardMaterial
          color={wall}
          roughness={0.9}
          emissive={hovered ? "#3b2e16" : "#000000"}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[0, bodyY + bodyH / 2 + sy * 0.13, side * sz * 0.24]}
          rotation={[side * 0.46, 0, 0]}
          castShadow
        >
          <boxGeometry args={[sx * 0.95, 0.12, sz * 0.58]} />
          <meshStandardMaterial color={roof} roughness={0.82} />
        </mesh>
      ))}
      <mesh position={[0, bodyY + bodyH / 2 + sy * 0.24, 0]}>
        <boxGeometry args={[sx * 0.98, 0.08, 0.16]} />
        <meshStandardMaterial color="#6f3a2c" roughness={0.8} />
      </mesh>

      <Window position={[sx * 0.23, bodyY + 0.18, sz * 0.412]} />
      <Window position={[-sx * 0.23, bodyY + 0.18, sz * 0.412]} />
      <Window position={[sx * 0.23, bodyY + 0.18, -sz * 0.412]} />
      <Window position={[-sx * 0.23, bodyY + 0.18, -sz * 0.412]} />
      <Window
        position={[sx * 0.412, bodyY + 0.18, 0]}
        scale={[0.04, 0.44, 0.4]}
      />
      <Window
        position={[-sx * 0.412, bodyY + 0.18, 0]}
        scale={[0.04, 0.44, 0.4]}
      />

      <mesh position={[0, 0.48, sz * 0.412]}>
        <boxGeometry args={[0.52, 0.82, 0.06]} />
        <meshStandardMaterial color="#4a3828" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.92, sz * 0.44]}>
        <boxGeometry args={[0.9, 0.08, 0.5]} />
        <meshStandardMaterial color="#7b5b3a" roughness={0.9} />
      </mesh>

      <mesh position={[sx * 0.22, bodyY + bodyH / 2 + 0.45, sz * 0.24]}>
        <boxGeometry args={[0.34, 0.7, 0.34]} />
        <meshStandardMaterial color="#8e8b7c" roughness={0.9} />
      </mesh>

      <SelectionRing radius={Math.max(sx, sz) * 0.68 + 0.35} active={isSelected} />
      {isSelected ? (
        <Html center position={[0, sy + 1.35, 0]} zIndexRange={[20, 0]}>
          <div className="world-label selected">
            <span className="lab-k">HOUSE</span>
            {object.name}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function SchoolMesh({ object }: BuildingProps) {
  const { isSelected, select, hovered, setHovered } = useObjectSelection(object);
  const [sx, sy, sz] = object.scale ?? [8.4, 4.2, 5.4];
  const rotation = object.rotation?.[1] ?? 0;
  const bodyH = sy * 0.82;

  return (
    <group
      position={[object.position[0], 0, object.position[2]]}
      rotation={[0, rotation, 0]}
      onClick={(event) => {
        event.stopPropagation();
        select();
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
      <BuildingHitbox
        size={[sx + 1, sy + 1.3, sz + 1]}
        onClick={(event) => {
          event.stopPropagation();
          select();
        }}
        onEnter={() => {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onLeave={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      />
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[sx + 0.8, 0.12, sz + 0.8]} />
        <meshStandardMaterial color="#665f4b" roughness={1} />
      </mesh>
      <mesh position={[0, 0.1 + bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[sx * 0.9, bodyH, sz * 0.84]} />
        <meshStandardMaterial
          color="#d6cfb8"
          roughness={0.85}
          emissive={hovered ? "#3a2f18" : "#000000"}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>
      <mesh position={[0, 0.1 + bodyH + 0.12, 0]} castShadow>
        <boxGeometry args={[sx * 0.96, 0.18, sz * 0.92]} />
        <meshStandardMaterial color="#5e5847" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.1 + bodyH * 0.52, sz * 0.47]}>
        <boxGeometry args={[sx * 0.7, 0.1, 0.6]} />
        <meshStandardMaterial color="#8a8065" roughness={0.8} />
      </mesh>

      {[-1, 0, 1].map((column) => (
        <Window
          key={`top-${column}`}
          position={[column * sx * 0.24, 0.1 + bodyH * 0.7, sz * 0.425]}
          scale={[0.62, 0.5, 0.04]}
        />
      ))}
      {[-1, 0, 1].map((column) => (
        <Window
          key={`bottom-${column}`}
          position={[column * sx * 0.24, 0.1 + bodyH * 0.32, sz * 0.425]}
          scale={[0.62, 0.5, 0.04]}
        />
      ))}

      <mesh position={[0, 0.62, sz * 0.425]}>
        <boxGeometry args={[1.3, 1.0, 0.08]} />
        <meshStandardMaterial color="#4d4030" roughness={0.9} />
      </mesh>

      <mesh position={[sx * 0.33, 0.1 + bodyH + 0.55, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 2.5, 6]} />
        <meshStandardMaterial color="#d9d2c0" roughness={0.6} />
      </mesh>
      <mesh position={[sx * 0.33 + 0.5, 0.1 + bodyH + 1.55, 0]}>
        <boxGeometry args={[0.95, 0.42, 0.04]} />
        <meshStandardMaterial color="#3a8b84" emissive="#175551" emissiveIntensity={0.2} />
      </mesh>

      <SelectionRing radius={Math.max(sx, sz) * 0.63 + 0.4} active={isSelected} />
      {isSelected ? (
        <Html center position={[0, sy + 1.55, 0]} zIndexRange={[20, 0]}>
          <div className="world-label selected">
            <span className="lab-k">SCHOOL</span>
            {object.name}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function ClinicMesh({ object }: BuildingProps) {
  const { isSelected, select, hovered, setHovered } = useObjectSelection(object);
  const [sx, sy, sz] = object.scale ?? [5.6, 3.8, 5.2];
  const rotation = object.rotation?.[1] ?? 0;
  const bodyH = sy * 0.8;

  return (
    <group
      position={[object.position[0], 0, object.position[2]]}
      rotation={[0, rotation, 0]}
      onClick={(event) => {
        event.stopPropagation();
        select();
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
      <BuildingHitbox
        size={[sx + 0.8, sy + 1.2, sz + 0.8]}
        onClick={(event) => {
          event.stopPropagation();
          select();
        }}
        onEnter={() => {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onLeave={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      />
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[sx + 0.7, 0.12, sz + 0.7]} />
        <meshStandardMaterial color="#6a6758" roughness={1} />
      </mesh>
      <mesh position={[0, 0.1 + bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[sx * 0.9, bodyH, sz * 0.86]} />
        <meshStandardMaterial
          color="#e6e7dc"
          roughness={0.72}
          emissive={hovered ? "#30372c" : "#000000"}
          emissiveIntensity={hovered ? 0.25 : 0}
        />
      </mesh>
      <mesh position={[0, 0.1 + bodyH + 0.1, 0]} castShadow>
        <boxGeometry args={[sx * 0.96, 0.2, sz * 0.93]} />
        <meshStandardMaterial color="#68817c" roughness={0.7} />
      </mesh>

      <mesh position={[0, 0.1 + bodyH * 0.66, sz * 0.433]}>
        <boxGeometry args={[1.25, 0.5, 0.03]} />
        <meshStandardMaterial color="#e8e7dc" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.1 + bodyH * 0.66, sz * 0.45]}>
        <boxGeometry args={[0.7, 0.2, 0.03]} />
        <meshStandardMaterial color="#cf3f35" emissive="#7a1711" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0.1 + bodyH * 0.66, sz * 0.45]}>
        <boxGeometry args={[0.2, 0.7, 0.03]} />
        <meshStandardMaterial color="#cf3f35" emissive="#7a1711" emissiveIntensity={0.35} />
      </mesh>

      {[-1, 1].map((side) => (
        <Window
          key={side}
          position={[side * sx * 0.25, 0.1 + bodyH * 0.35, sz * 0.433]}
          scale={[0.55, 0.42, 0.04]}
          warm={false}
        />
      ))}

      <mesh position={[0, 0.6, sz * 0.433]}>
        <boxGeometry args={[1.1, 0.9, 0.07]} />
        <meshStandardMaterial color="#526c68" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.1 + bodyH + 0.4, 0]}>
        <boxGeometry args={[1.4, 0.08, 1.4]} />
        <meshStandardMaterial color="#8e9c92" roughness={0.8} />
      </mesh>

      <SelectionRing radius={Math.max(sx, sz) * 0.65 + 0.35} active={isSelected} />
      {isSelected ? (
        <Html center position={[0, sy + 1.2, 0]} zIndexRange={[20, 0]}>
          <div className="world-label selected">
            <span className="lab-k">CLINIC</span>
            {object.name}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function FactoryMesh({ object }: BuildingProps) {
  const { isSelected, select, hovered, setHovered } = useObjectSelection(object);
  const [sx, sy, sz] = object.scale ?? [10, 5, 7];
  const rotation = object.rotation?.[1] ?? 0;
  const bodyH = sy * 0.72;

  return (
    <group
      position={[object.position[0], 0, object.position[2]]}
      rotation={[0, rotation, 0]}
      onClick={(event) => {
        event.stopPropagation();
        select();
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
      <BuildingHitbox
        size={[sx + 1, sy + 1.5, sz + 1]}
        onClick={(event) => {
          event.stopPropagation();
          select();
        }}
        onEnter={() => {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onLeave={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      />
      <mesh position={[0, 0.1 + bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[sx * 0.92, bodyH, sz * 0.86]} />
        <meshStandardMaterial
          color="#8b5f4a"
          roughness={0.95}
          emissive={hovered ? "#351810" : "#000000"}
          emissiveIntensity={hovered ? 0.25 : 0}
        />
      </mesh>
      {[-1, 0, 1].map((column) => (
        <mesh
          key={column}
          position={[column * sx * 0.26, 0.1 + bodyH + 0.35, 0]}
          rotation={[0, 0, column * 0.18]}
          castShadow
        >
          <boxGeometry args={[sx * 0.26, 0.18, sz * 0.88]} />
          <meshStandardMaterial color="#59615a" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[-sx * 0.3, 0.1 + bodyH + 1.8, sz * 0.18]}>
        <cylinderGeometry args={[0.32, 0.42, 3.6, 10]} />
        <meshStandardMaterial color="#6b6254" roughness={0.9} />
      </mesh>
      <mesh position={[sx * 0.18, 0.1 + bodyH * 0.55, sz * 0.435]}>
        <boxGeometry args={[sx * 0.38, bodyH * 0.38, 0.04]} />
        <meshStandardMaterial color="#f0b667" emissive="#b56e24" emissiveIntensity={0.25} />
      </mesh>
      <SelectionRing radius={Math.max(sx, sz) * 0.6 + 0.4} active={isSelected} />
      {isSelected ? (
        <Html center position={[0, sy + 1.3, 0]} zIndexRange={[20, 0]}>
          <div className="world-label selected">
            <span className="lab-k">FACTORY</span>
            {object.name}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function MachineMesh({ object }: BuildingProps) {
  const { isSelected, select } = useObjectSelection(object);
  const [sx, sy, sz] = object.scale ?? [2.2, 1.8, 2.2];
  return (
    <group
      position={[object.position[0], 0, object.position[2]]}
      rotation={[0, object.rotation?.[1] ?? 0, 0]}
      onClick={(event) => {
        event.stopPropagation();
        select();
      }}
    >
      <mesh position={[0, 0.18, 0]} receiveShadow castShadow>
        <boxGeometry args={[sx, 0.3, sz]} />
        <meshStandardMaterial color="#545d56" roughness={0.8} />
      </mesh>
      <mesh position={[0, sy * 0.5 + 0.2, 0]} castShadow>
        <cylinderGeometry args={[sx * 0.28, sx * 0.32, sy * 0.7, 12]} />
        <meshStandardMaterial color="#a37a48" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[sx * 0.3, sy * 0.7, 0]} castShadow>
        <boxGeometry args={[0.18, sy * 0.5, 0.18]} />
        <meshStandardMaterial color="#6e7770" metalness={0.4} roughness={0.5} />
      </mesh>
      <SelectionRing radius={Math.max(sx, sz) * 0.6} active={isSelected} />
      {isSelected ? (
        <Html center position={[0, sy + 0.7, 0]} zIndexRange={[20, 0]}>
          <div className="world-label selected">
            <span className="lab-k">MACHINE</span>
            {object.name}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function ConveyorMesh({ object }: BuildingProps) {
  const { isSelected, select } = useObjectSelection(object);
  const [sx, sy, sz] = object.scale ?? [6, 0.6, 1.4];
  return (
    <group
      position={[object.position[0], 0, object.position[2]]}
      rotation={[0, object.rotation?.[1] ?? 0, 0]}
      onClick={(event) => {
        event.stopPropagation();
        select();
      }}
    >
      <mesh position={[0, sy + 0.32, 0]} castShadow receiveShadow>
        <boxGeometry args={[sx, 0.12, sz]} />
        <meshStandardMaterial color="#3f4644" roughness={0.8} metalness={0.2} />
      </mesh>
      {Array.from({ length: Math.max(3, Math.floor(sx / 1.4)) }).map((_, index) => (
        <mesh
          key={index}
          position={[-sx / 2 + 0.7 + index * 1.4, sy + 0.23, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.1, 0.1, sz * 0.9, 8]} />
          <meshStandardMaterial color="#7c847a" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, (sy + 0.3) / 2, side * sz * 0.4]}>
          <boxGeometry args={[sx, sy + 0.3, 0.08]} />
          <meshStandardMaterial color="#4c5550" roughness={0.85} />
        </mesh>
      ))}
      <SelectionRing radius={sx * 0.5} active={isSelected} />
    </group>
  );
}

function TreeMesh({ object }: BuildingProps) {
  const { isSelected, select } = useObjectSelection(object);
  const [sx, sy] = object.scale ?? [1.8, 3.2, 1.8];
  const seed = hashString(object.id);
  const broadleaf = seed % 2 === 0;
  return (
    <group
      position={[object.position[0], 0, object.position[2]]}
      rotation={[0, (seed % 360) * (Math.PI / 180), 0]}
      onClick={(event) => {
        event.stopPropagation();
        select();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      <mesh position={[0, sy * 0.28, 0]} castShadow>
        <cylinderGeometry args={[sx * 0.11, sx * 0.16, sy * 0.55, 6]} />
        <meshStandardMaterial color="#6a5033" roughness={1} />
      </mesh>
      {broadleaf ? (
        <>
          <mesh position={[0, sy * 0.7, 0]} castShadow>
            <sphereGeometry args={[sx * 0.58, 8, 7]} />
            <meshStandardMaterial color="#4e7b4b" roughness={1} />
          </mesh>
          <mesh position={[sx * 0.26, sy * 0.86, 0.1]} castShadow>
            <sphereGeometry args={[sx * 0.38, 7, 6]} />
            <meshStandardMaterial color="#5d8a52" roughness={1} />
          </mesh>
          <mesh position={[-sx * 0.22, sy * 0.88, -0.14]} castShadow>
            <sphereGeometry args={[sx * 0.32, 7, 6]} />
            <meshStandardMaterial color="#426d43" roughness={1} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, sy * 0.66, 0]} castShadow>
            <coneGeometry args={[sx * 0.56, sy * 0.5, 7]} />
            <meshStandardMaterial color="#497349" roughness={1} />
          </mesh>
          <mesh position={[0, sy * 0.9, 0]} castShadow>
            <coneGeometry args={[sx * 0.4, sy * 0.34, 7]} />
            <meshStandardMaterial color="#54814d" roughness={1} />
          </mesh>
        </>
      )}
      <SelectionRing radius={sx * 0.55} active={isSelected} />
      {isSelected ? (
        <Html center position={[0, sy + 0.6, 0]} zIndexRange={[20, 0]}>
          <div className="world-label selected">
            <span className="lab-k">TREE</span>
            {object.name}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function DockMesh({ object }: BuildingProps) {
  const { isSelected, select } = useObjectSelection(object);
  const rotation = object.rotation?.[1] ?? 0;
  return (
    <group
      position={[object.position[0], 0, object.position[2]]}
      rotation={[0, rotation, 0]}
      onClick={(event) => {
        event.stopPropagation();
        select();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.8, 0.22, 2.8]} />
        <meshStandardMaterial color="#8a6c43" roughness={1} />
      </mesh>
      {[
        [-1.9, -0.9],
        [1.9, -0.9],
        [-1.9, 0.9],
        [1.9, 0.9],
      ].map(([x, z], index) => (
        <mesh key={index} position={[x, -0.15, z]}>
          <cylinderGeometry args={[0.11, 0.13, 0.8, 6]} />
          <meshStandardMaterial color="#665035" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 0.38, 1.6]}>
        <boxGeometry args={[1.2, 0.36, 0.35]} />
        <meshStandardMaterial color="#cf7c4b" emissive="#6d2c11" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 0.33, -1.55]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.34, 0.08, 8, 20]} />
        <meshStandardMaterial color="#e7dcc2" roughness={0.7} />
      </mesh>
      <SelectionRing radius={3} active={isSelected} />
    </group>
  );
}

function StaticSandbags({ object }: BuildingProps) {
  const { isSelected, select } = useObjectSelection(object);
  const [sx, , sz] = object.scale ?? [4, 1, 1];
  return (
    <group
      position={[object.position[0], 0, object.position[2]]}
      rotation={[0, object.rotation?.[1] ?? 0, 0]}
      onClick={(event) => {
        event.stopPropagation();
        select();
      }}
    >
      {[0, 1, 2].map((row) =>
        Array.from({ length: Math.max(2, Math.round(sx)) }).map((_, index) => (
          <mesh
            key={`${row}-${index}`}
            position={[
              -sx / 2 + 0.5 + index * (sx / Math.max(2, Math.round(sx))),
              0.18 + row * 0.24,
              (row % 2 === 0 ? -0.06 : 0.06) * sz,
            ]}
            rotation={[0, 0.1 * ((index % 3) - 1), 0]}
            castShadow
          >
            <boxGeometry args={[0.8, 0.22, 0.55]} />
            <meshStandardMaterial color="#c6ad77" roughness={1} />
          </mesh>
        )),
      )}
      <SelectionRing radius={sx * 0.6} active={isSelected} />
    </group>
  );
}

export default function BuildingMesh({
  object,
  plan,
}: {
  object: WorldObject;
  plan: ScenePlan;
}) {
  void plan;
  switch (object.type) {
    case "shelter":
      return <ShelterMesh object={object} />;
    case "school":
      return <SchoolMesh object={object} />;
    case "clinic":
      return <ClinicMesh object={object} />;
    case "factory":
      return <FactoryMesh object={object} />;
    case "house":
      return <HouseMesh object={object} />;
    case "tree":
      return <TreeMesh object={object} />;
    case "machine":
      return <MachineMesh object={object} />;
    case "conveyor":
      return <ConveyorMesh object={object} />;
    case "rescue_boat":
      return <DockMesh object={object} />;
    case "barrier":
      return <StaticSandbags object={object} />;
    default:
      return null;
  }
}
