import * as THREE from "three";
import { useEffect, useRef, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, PointerLockControls } from "@react-three/drei";
import { useAtom } from "jotai";
import { charactersAtom, userAtom } from "./SocketManager";
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
  // multiplayer atoms
  const [characters] = useAtom(charactersAtom);
  const [user] = useAtom(userAtom);

  const extractId = (obj) =>
    obj && typeof obj === "object"
      ? (obj.id ?? obj.userId ?? obj.socketId ?? obj.uid ?? obj.token ?? null)
      : obj;
  const idsEqual = (a, b) => a != null && b != null && String(a) === String(b);
  const nameEqual = (a, b) =>
    a && b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  const belongsToSelf = (c) => {
    const myId = extractId(user);
    const cidList = [c?.id, c?.userId, c?.socketId, c?.uid, c?.token];
    // 1) any id matches → it’s me
    if (myId && cidList.some((cid) => idsEqual(cid, myId))) return true;
    // 2) explicit flag from server
    if (c?.isLocal === true) return true;
    // 3) last resort: name match against known local names
    const localName = user?.name ?? username;
    return nameEqual(c?.name, localName);
  };

  const me = useMemo(() => {
    if (!Array.isArray(characters)) return undefined;
    const byId = characters.find(belongsToSelf);
    return byId ?? (characters.length === 1 ? characters[0] : undefined);
  }, [characters, user, username]);
  const displayName = me?.name ?? user?.name ?? username;
  const avatarType = (me?.avatar ?? avatar)?.toLowerCase?.() ?? "male";
  const hairCol = me?.hairColor ?? hairColor;
  const topCol = me?.topColor ?? topColor;
  const bottomCol = me?.bottomColor ?? bottomColor;
  const hasServerChars = Array.isArray(characters) && characters.length > 0;

  // locomotion state
  const vel = useRef(new THREE.Vector3());
  const [anim, setAnim] = useState("idle"); // "idle" | "walk" | "run"

  // Tunables (m/s and smoothing)
  const WALK_SPEED = 1.6;
  const RUN_SPEED = 3.8;
  const ACCEL = 8.0;   // m/s^2 when pressing move keys
  const DECEL = 10.0;  // m/s^2 when releasing
  const TURN_SMOOTH = 12.0; // higher = snappier turn
  const CAM_HEIGHT = 1.8;
  const CAM_DISTANCE = 3.5;
  const CAM_SMOOTH = 10.0; // higher = snappier follow
  const LOCAL_FORWARD = new THREE.Vector3(0, 0, 1); // model's local forward


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

  // Initial placements (place cam behind avatar using its true forward)
  useEffect(() => {
    if (!avatarRef.current) return;
    // Start from server position if available
    const startPos = Array.isArray(me?.position) ? me.position : [0, 0, 0];
    avatarRef.current.position.set(startPos[0], 0, startPos[2]);
    const forward = LOCAL_FORWARD.clone()
      .applyQuaternion(avatarRef.current.quaternion)
      .normalize();
    const camPos = avatarRef.current.position
      .clone()
      .add(new THREE.Vector3(0, CAM_HEIGHT, 0))
      .add(forward.clone().multiplyScalar(-CAM_DISTANCE)); // behind
    camera.position.copy(camPos);
    const lookTarget = avatarRef.current.position
      .clone()
      .add(new THREE.Vector3(0, CAM_HEIGHT * 0.85, 0))
      .add(forward.clone().multiplyScalar(3)); // ahead
    camera.lookAt(lookTarget);
  }, [camera, me]);

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
    }

    // Smooth facing toward movement direction (if moving)
    if (hasInput) {
      const yaw = Math.atan2(dir.x, dir.z); // face move direction on Y
      const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
      const slerpAlpha = 1 - Math.exp(-TURN_SMOOTH * delta);
      avatarRef.current.quaternion.slerp(targetQuat, slerpAlpha);
    }

    // --- Third-person camera follow (behind avatar, looking forward) ---
    const avatarPos = avatarRef.current.position;
    // Avatar forward (use model's local forward axis)
    const avatarForward = LOCAL_FORWARD.clone()
      .applyQuaternion(avatarRef.current.quaternion)
      .normalize();
    const camTargetPos = avatarPos
      .clone()
      .add(new THREE.Vector3(0, CAM_HEIGHT, 0))
      .add(avatarForward.clone().multiplyScalar(-CAM_DISTANCE));
    const camLerp = 1 - Math.exp(-CAM_SMOOTH * delta);
    camera.position.lerp(camTargetPos, camLerp);
    const lookTarget = avatarPos
      .clone()
      .add(new THREE.Vector3(0, CAM_HEIGHT * 0.85, 0))
      .add(avatarForward.clone().multiplyScalar(3)); // ahead
    camera.lookAt(lookTarget);

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
      {/* <PointerLockControls /> */}

      {/* Scene */}
      <primitive object={scene} position={[-25, 0, 25]} />

      {/* Use the server list: one of them is the local avatar, others are remotes. */}
      {hasServerChars
        ? characters.map((c) => {
            const isMe = me ? c === me : (belongsToSelf(c) || characters.length === 1);
            const type = (c.avatar?.toLowerCase?.() ?? "male");
            const key = c.id ?? c.socketId ?? c.userId ?? c.name;
            if (isMe) {
              return type === "male" ? (
                <BusinessMan
                  key={key}
                  ref={avatarRef}
                  id={c.id}
                  username={c.name || displayName}
                  isLocal
                  anim={anim}
                 moveSpeed={vel.current.length()}
                  hairColor={c.hairColor ?? hairCol}
                  topColor={c.topColor ?? topCol}
                  bottomColor={c.bottomColor ?? bottomCol}
                />
              ) : (
                <AnimatedWoman
                  key={key}
                  ref={avatarRef}
                  id={c.id}
                  username={c.name || displayName}
                  isLocal
                  anim={anim}
                  moveSpeed={vel.current.length()}
                  hairColor={c.hairColor ?? hairCol}
                  topColor={c.topColor ?? topCol}
                  bottomColor={c.bottomColor ?? bottomCol}
                />
              );
            }
            // remote
            return type === "male" ? (
              <BusinessMan
                key={key}
                id={c.id}
                username={c.name || "Player"}
                position={new THREE.Vector3(...(c.position || [0, 0, 0]))}
                hairColor={c.hairColor}
                topColor={c.topColor}
                bottomColor={c.bottomColor}
              />
            ) : (
              <AnimatedWoman
                key={key}
                id={c.id}
                username={c.name || "Player"}
                position={new THREE.Vector3(...(c.position || [0, 0, 0]))}
                hairColor={c.hairColor}
               topColor={c.topColor}
                bottomColor={c.bottomColor}
              />
            );
          })
        : (
          // Fallback when server hasn't sent anything yet.
          (avatarType === "male" ? (
            <BusinessMan
              key={`${extractId(user) || "local"}:${displayName}`}
              ref={avatarRef}
              id={extractId(user) || "local"}
              username={displayName}
             isLocal
              anim={anim}
              moveSpeed={vel.current.length()}
              hairColor={hairCol}
              topColor={topCol}
              bottomColor={bottomCol}
            />
          ) : (
            <AnimatedWoman
              key={`${extractId(user) || "local"}:${displayName}`}
              ref={avatarRef}
              id={extractId(user) || "local"}
              username={displayName}
              isLocal
              anim={anim}
              moveSpeed={vel.current.length()}
              hairColor={hairCol}
              topColor={topCol}
              bottomColor={bottomCol}
            />
          ))
        )}
    </>
  );
};

useGLTF.preload("/models/InsightCenter.glb");
