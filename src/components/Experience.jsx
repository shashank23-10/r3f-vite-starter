// Experience.jsx
import {
  Environment,
  OrbitControls,
  useCursor,
  useGLTF,
} from "@react-three/drei";

import { useAtom } from "jotai";
import { useState } from "react";
import * as THREE from "three";
import { AnimatedWoman } from "./AnimatedWoman";
import { BusinessMan } from "./BusinessMan";
import { Item } from "./Item";
import { charactersAtom, mapAtom, socket } from "./SocketManager";

export const Experience = () => {
  const [characters] = useAtom(charactersAtom);
  const [map] = useAtom(mapAtom);
  const [onFloor, setOnFloor] = useState(false);

  useCursor(onFloor);

  const { scene } = useGLTF("/models/InsightCenter.glb");

  return (
    <>
      <Environment preset="sunset" />
      <ambientLight intensity={0.4} />
      <OrbitControls />

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
