// Experience.jsx
import {
  Environment,
  OrbitControls,
  useCursor,
  useGLTF,
} from "@react-three/drei";

import { useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";

import { useAtom } from "jotai";
import { useState } from "react";
import * as THREE from "three";
import { AnimatedWoman } from "./AnimatedWoman";
import { BusinessMan } from "./BusinessMan";
import { Item } from "./Item";
import { charactersAtom, mapAtom, socket, userAtom } from "./SocketManager";

export const Experience = () => {
  const [characters] = useAtom(charactersAtom);
  const [map] = useAtom(mapAtom);
  const [user] = useAtom(userAtom);
  const [onFloor, setOnFloor] = useState(false);

  useCursor(onFloor);

  const { scene } = useGLTF("/models/InsightCenter.glb");

  const worldRef = useRef(null);
  const controlsRef = useRef(null);
  const targetVec = useMemo(() => new THREE.Vector3(0, 1.6, 0), []);

  // --- color guard: fixes invalid hex like "#1a191" ---
  const fixColor = (c) => {
    if (!c) return "#ffffff";
    if (typeof c === "string" && c.startsWith("#")) {
      // accept #rgb (4), #rrggbb (7), #rrggbbaa (9)
      if (c.length === 4 || c.length === 7 || c.length === 9) return c;
      // pad/truncate to 7 (#rrggbb)
      const hex = c.replace("#", "");
      const padded = (hex + "000000").slice(0, 6);
      return `#${padded}`;
    }
    // try CSS color names or fallback
    try {
      new THREE.Color(c);
      return c;
    } catch {
      return "#ffffff";
    }
  };

  // Helper: get latest local player's world position
  const getLocalPlayerPos = () => {
    const me = characters.find((c) => c.id === user);
    return me?.position ?? [0, 0, 0];
  };
  // Shift the world so the local player is always at origin
  useFrame(() => {
    const [px, py, pz] = getLocalPlayerPos();
    if (worldRef.current) {
      worldRef.current.position.set(-px, -py, -pz);
    }
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetVec, 0.2);
      controlsRef.current.update();
    }
  });

  return (
    <>
      <Environment preset="sunset" />
      <ambientLight intensity={0.4} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.1}
        minPolarAngle={THREE.MathUtils.degToRad(50)}
        maxPolarAngle={Math.PI / 2 - 0.1}
        minDistance={2}
        maxDistance={18}
      />

       {/* === World that scrolls past the player === */}
      <group ref={worldRef}>
        {/* Main 3D Scene */}
        <primitive object={scene} position={[-25, 0, 25]} />

        {/* Interactive floor plane (lives in world-space) */}
        <mesh
          rotation-x={-Math.PI / 2}
          position={[0, -0.001, 0]}
          onClick={(e) => {
            // e.point is player-relative because world is shifted; convert back to world coords
            const [px, , pz] = getLocalPlayerPos();
            socket.emit("move", [e.point.x + px, 0, e.point.z + pz]);
          }}
          onPointerEnter={() => setOnFloor(true)}
          onPointerLeave={() => setOnFloor(false)}
        >
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>

        {/* Scene Items (world-space) */}
        {map?.items?.map((item, idx) => (
          <Item key={`${item.name}-${idx}`} item={item} />
        ))}

        {/* Remote players (world-space) */}
        {characters
          .filter((c) => c.id !== user)
          .map((character) =>
            character.avatar === "male" ? (
              <BusinessMan
                key={character.id}
                id={character.id}
                username={character.name || "Player"}
                position={new THREE.Vector3(...character.position)}
                hairColor={character.hairColor}
                topColor={character.topColor}
                bottomColor={character.bottomColor}
              />
            ) : (
              <AnimatedWoman
                key={character.id}
                id={character.id}
                username={character.name || "Player"}
                position={new THREE.Vector3(...character.position)}
                hairColor={character.hairColor}
                topColor={character.topColor}
                bottomColor={character.bottomColor}
              />
            )
          )}
      </group>

      {/* Local player (fixed at origin, outside worldRef) */}
      {characters
        .filter((c) => c.id === user)
        .map((me) =>
          me.avatar === "male" ? (
            <BusinessMan
              key={me.id}
              id={me.id}
              username={me.name || "Player"}
              position={new THREE.Vector3(0, 0, 0)}
              hairColor={me.hairColor}
              topColor={me.topColor}
              bottomColor={me.bottomColor}
              isLocal
            />
          ) : (
            <AnimatedWoman
              key={me.id}
              id={me.id}
              username={me.name || "Player"}
              position={new THREE.Vector3(0, 0, 0)}
              hairColor={me.hairColor}
              topColor={me.topColor}
              bottomColor={me.bottomColor}
              isLocal
            />
          )
        )}
    </>
  );
};

useGLTF.preload("/models/InsightCenter.glb");
