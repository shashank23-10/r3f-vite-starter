// Experience.jsx
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, PointerLockControls } from "@react-three/drei";
import { BusinessMan } from "./BusinessMan";
import { AnimatedWoman } from "./AnimatedWoman";

// Human-like locomotion: acceleration/deceleration + turn smoothing.
// WASD to move; hold Shift to run. Click canvas to enable mouse-look.
export const Experience = ({
  avatar = "male",
  username = "Player",
  hairColor,
  topColor,
  bottomColor,
}) => {
  const { scene } = useGLTF("/models/InsightCenter.glb");
  const { camera } = useThree();

  const avatarRef = useRef(); // forwardRef from avatar
  const keys = useRef({ w: false, a: false, s: false, d: false, shift: false });

  // locomotion state
  const vel = useRef(new THREE.Vector3());
  const [anim, setAnim] = useState("idle"); // "idle" | "walk" | "run"

  // Tunables (m/s and smoothing)
  const WALK_SPEED = 1.6;
  const RUN_SPEED = 3.8;
  const ACCEL = 8.0;   // m/s^2 when pressing move keys
  const DECEL = 10.0;  // m/s^2 when releasing
  const TURN_SMOOTH = 12.0; // higher = snappier turn

  useEffect(() => {
    const down = (e) => {
      if (e.code === "KeyW") keys.current.w = true;
      else if (e.code === "KeyA") keys.current.a = true;
      else if (e.code === "KeyS") keys.current.s = true;
      else if (e.code === "KeyD") keys.current.d = true;
      else if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.current.shift = true;
    };
    const up = (e) => {
      if (e.code === "KeyW") keys.current.w = false;
      else if (e.code === "KeyA") keys.current.a = false;
      else if (e.code === "KeyS") keys.current.s = false;
      else if (e.code === "KeyD") keys.current.d = false;
      else if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.current.shift = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Initial placements
  useEffect(() => {
    camera.position.set(0, 1.6, 5);
    camera.lookAt(0, 1.6, 0);
    if (avatarRef.current) {
      avatarRef.current.position.set(0, 0, 0);
    }
  }, [camera]);

  useFrame((_, delta) => {
    if (!avatarRef.current) return;

    // Input → desired direction (relative to camera facing, flattened)
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();

    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

    const dir = new THREE.Vector3();
    if (keys.current.w) dir.add(fwd);
    if (keys.current.s) dir.sub(fwd);
    if (keys.current.a) dir.sub(right);
    if (keys.current.d) dir.add(right);

    const hasInput = dir.lengthSq() > 0;
    if (hasInput) dir.normalize();

    const targetSpeed = hasInput ? (keys.current.shift ? RUN_SPEED : WALK_SPEED) : 0;

    // Smooth velocity toward desired velocity
    const desired = dir.clone().multiplyScalar(targetSpeed);
    const rate = hasInput ? ACCEL : DECEL; // accelerate when input; otherwise decelerate to 0
    const lerpAlpha = 1 - Math.exp(-rate * delta);
    vel.current.lerp(desired, lerpAlpha);

    // Apply motion
    const step = vel.current.clone().multiplyScalar(delta);
    if (step.lengthSq() > 0) {
      avatarRef.current.position.add(step);
      avatarRef.current.position.y = 0; // stay grounded
      camera.position.add(step);        // keep camera offset
    }

    // Smooth facing toward movement direction (if moving)
    if (hasInput) {
      const yaw = Math.atan2(dir.x, dir.z); // face move direction on Y
      const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
      const slerpAlpha = 1 - Math.exp(-TURN_SMOOTH * delta);
      avatarRef.current.quaternion.slerp(targetQuat, slerpAlpha);
    }

    // Animation state machine (update only on state change)
    const speedNow = vel.current.length();
    const nextAnim =
      speedNow < 0.05 ? "idle" : keys.current.shift && speedNow > WALK_SPEED * 0.9 ? "run" : "walk";
    if (nextAnim !== anim) setAnim(nextAnim);
  });

  return (
    <>
      {/* Lighting */}
      <Environment preset="sunset" />
      <ambientLight intensity={0.4} />

      {/* Mouse-look (click canvas to lock pointer) */}
      <PointerLockControls />

      {/* Scene */}
      <primitive object={scene} position={[-25, 0, 25]} />

      {/* Local avatar with external animation control */}
      {avatar === "male" ? (
        <BusinessMan
          ref={avatarRef}
          id="local"
          username={username}
          isLocal
          anim={anim}
          moveSpeed={vel.current.length()}
          position={new THREE.Vector3(0, 0, 0)}
          hairColor={hairColor}
          topColor={topColor}
          bottomColor={bottomColor}
        />
      ) : (
        <AnimatedWoman
          ref={avatarRef}
          id="local"
          username={username}
          isLocal
          anim={anim}
          moveSpeed={vel.current.length()}
          position={new THREE.Vector3(0, 0, 0)}
          hairColor={hairColor}
          topColor={topColor}
          bottomColor={bottomColor}
        />
      )}
    </>
  );
};

useGLTF.preload("/models/InsightCenter.glb");
