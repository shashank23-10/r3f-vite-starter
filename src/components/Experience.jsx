// Experience.jsx
import {
  Environment,
  OrbitControls,
  useCursor,
  useGLTF,
} from "@react-three/drei";

import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AnimatedWoman } from "./AnimatedWoman";
import { BusinessMan } from "./BusinessMan";
import { Item } from "./Item";
import { charactersAtom, mapAtom, socket , userAtom } from "./SocketManager";

export const Experience = () => {
  const [characters] = useAtom(charactersAtom);
  const [map] = useAtom(mapAtom);
  const [user] = useAtom(userAtom);
  const [onFloor, setOnFloor] = useState(false);

  useCursor(onFloor);

  const { scene } = useGLTF("/models/InsightCenter.glb");


  // --- WASD keyboard handling ---
  const keys = useRef({ w: false, a: false, s: false, d: false });
  useEffect(() => {
    const down = (e) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "a" || k === "s" || k === "d") keys.current[k] = true;
    };
    const up = (e) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "a" || k === "s" || k === "d") keys.current[k] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Move the local player with WASD relative to camera direction
  const KEYBOARD_SPEED = 2.2; // units/sec (tune to taste)
  useFrame((state, delta) => {
    // If no key pressed, skip
    if (!(keys.current.w || keys.current.a || keys.current.s || keys.current.d)) return;
    const me = characters.find((c) => c.id === user);
    if (!me) return;

    const cam = state.camera;
    // Forward vector (ignore Y)
    const forward = new THREE.Vector3();
    cam.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    // Right vector
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const dir = new THREE.Vector3();
    if (keys.current.w) dir.add(forward);
    if (keys.current.s) dir.sub(forward);
    if (keys.current.a) dir.sub(right);
    if (keys.current.d) dir.add(right);

    if (dir.lengthSq() > 0) {
      dir.normalize().multiplyScalar(KEYBOARD_SPEED * delta);
      const next = new THREE.Vector3(me.position[0], 0, me.position[2]).add(dir);
      socket.emit("move", [next.x, 0, next.z]);
    }
  });

  return (
    <>
      <Environment preset="sunset" />
      <ambientLight intensity={0.4} />

      {/* Main 3D Scene */}
      <primitive object={scene} position={[-25, 0, 25]} />

      {/* Interactive floor plane */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, -0.001, 0]}
        onClick={(e) => socket.emit("move", [e.point.x, 0, e.point.z])}
        onPointerEnter={() => setOnFloor(true)}
        onPointerLeave={() => setOnFloor(false)}
      >
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>

      {/* Scene Items */}
      {map?.items?.map((item, idx) => (
        <Item key={`${item.name}-${idx}`} item={item} />
      ))}

      {/* Characters with usernames */}
      {characters.map((character) =>
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
    </>
  );
};

useGLTF.preload("/models/InsightCenter.glb");
