import * as THREE from "three";
import { useEffect, useRef, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, PointerLockControls } from "@react-three/drei";
import { useAtom } from "jotai";
import { charactersAtom, userAtom, socket } from "./SocketManager";
import { BusinessMan } from "./BusinessMan";
import { AnimatedWoman } from "./AnimatedWoman";

// Human-like locomotion: acceleration/deceleration + turn smoothing.
// WASD to move; hold Shift to run. Click canvas to enable mouse-look.
export const Experience = ({
  avatar = null,
  username = "Player",
  hairColor,
  topColor,
  bottomColor,
  navTarget,          
  setNavTarget,
}) => {
  const { scene } = useGLTF("/models/InsightCenter.glb");
  const { camera } = useThree();

  const avatarRef = useRef(); // forwardRef from avatar
  const keys = useRef({ w: false, a: false, s: false, d: false, shift: false });
  // multiplayer atoms
  const [characters, setCharacters] = useAtom(charactersAtom);
  const [user] = useAtom(userAtom);

  const extractId = (obj) =>
    obj && typeof obj === "object"
      ? (obj.id ?? obj.userId ?? obj.socketId ?? obj.uid ?? obj.token ?? null)
      : obj;
  const idsEqual = (a, b) => a != null && b != null && String(a) === String(b);
  // Track live socket id so we can match our server copy robustly
  const [sid, setSid] = useState(null);
  useEffect(() => {
    const onConnect = () => setSid(socket?.id ?? null);
    const onDisconnect = () => setSid(null);
    onConnect();
    socket?.on("connect", onConnect);
    socket?.on("disconnect", onDisconnect);
    return () => {
      socket?.off("connect", onConnect);
      socket?.off("disconnect", onDisconnect);
    };
  }, []);

  // “Who am I?” — consider multiple local ids (userAtom + socket.id)
  const myIds = useMemo(() => {
    const cand = [extractId(user), user?.socketId, user?.id, user?.uid, sid];
    return cand.filter(Boolean).map(String);
  }, [user, sid]);

  const belongsToSelf = (c) => {
    if (!myIds.length) return false;
    const cidList = [c?.id, c?.userId, c?.socketId, c?.uid, c?.token]
      .filter(Boolean)
      .map(String);
    return myIds.some((id) => cidList.includes(id));
  };

  const me = useMemo(
    () => (Array.isArray(characters) ? characters.find(belongsToSelf) : undefined),
    [characters, belongsToSelf]
  );
  const displayName = me?.name ?? user?.name ?? username;
  const avatarType = (me?.avatar ?? avatar)?.toLowerCase?.() ?? null;
  const hairCol = me?.hairColor ?? hairColor;
  const topCol = me?.topColor ?? topColor;
  const bottomCol = me?.bottomColor ?? bottomColor;
  const hasServerChars = Array.isArray(characters) && characters.length > 0;
  const _isGendered = (g) => g === "male" || g === "female";
  const _isRenderable = (c) => _isGendered(c?.avatar?.toLowerCase?.()) && c?.name && c.name !== "Player";
  const remotes = useMemo(
    () =>
      Array.isArray(characters)
        ? characters.filter((c) => !belongsToSelf(c) && _isRenderable(c))
        : [],
    [characters, belongsToSelf]
  );

  // locomotion state
  const vel = useRef(new THREE.Vector3());
  const [anim, setAnim] = useState("idle"); // "idle" | "walk" | "run"
  const lastSync = useRef({ t: 0, x: NaN, y: NaN, z: NaN, q: new THREE.Quaternion() });

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
  const AUTO_STOP_DIST = 0.25; // + how close before stopping (meters)


  useEffect(() => {
    const down = (e) => {
      if (e.code === "KeyW") keys.current.w = true;
      else if (e.code === "KeyA") keys.current.a = true;
      else if (e.code === "KeyS") keys.current.s = true;
      else if (e.code === "KeyD") keys.current.d = true;
      else if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.current.shift = true;
      if (navTarget) setNavTarget?.(null);
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

  // Initial placement: run ONCE for the local avatar to avoid snapping when
  // characters array updates with new objects for the same player.
  const spawnedOnce = useRef(false);
  useEffect(() => {
    if (!avatarRef.current || spawnedOnce.current) return;
    spawnedOnce.current = true;
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
    // send initial spawn to server (and optimistic local update)
    const p = avatarRef.current.position;
    socket?.emit("move", [p.x, 0, p.z]);
    setCharacters((prev) =>
      Array.isArray(prev)
        ? prev.map((c) => (belongsToSelf(c) ? { ...c, position: [p.x, 0, p.z] } : c))
        : prev
    );
  }, [camera, !!me]);

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

    let hasInput = dir.lengthSq() > 0;
    if (hasInput) dir.normalize();

    // + Autopilot: if no manual input and we have a navTarget, move toward it
    let aiDriving = false;
    if (!hasInput && navTarget) {
      const avatarPos = avatarRef.current.position.clone();
      const dest = new THREE.Vector3(navTarget.x ?? 0, 0, navTarget.z ?? 0);
      const toTarget = dest.clone().sub(new THREE.Vector3(avatarPos.x, 0, avatarPos.z));
      const dist = toTarget.length();
      if (dist > AUTO_STOP_DIST) {
        dir.copy(toTarget.normalize());
        hasInput = true;
        aiDriving = true;
      } else {
        // reached — stop and clear
        setNavTarget?.(null);
      }
    }

    // Current avatar forward (for backward-only movement)
    const currForward = LOCAL_FORWARD.clone()
      .applyQuaternion(avatarRef.current.quaternion)
      .normalize();

    // If ONLY 'S' is pressed (no W/A/D and not autopilot), walk backward without changing facing.
    const isBackwardOnly =
      !aiDriving &&
      keys.current.s &&
      !keys.current.w &&
      !keys.current.a &&
      !keys.current.d;
    if (isBackwardOnly) {
      dir.copy(currForward).multiplyScalar(-1); // move straight back relative to avatar orientation
      hasInput = true;
    }

    const targetSpeed = hasInput
      ? (aiDriving ? RUN_SPEED : (keys.current.shift ? RUN_SPEED : WALK_SPEED))
      : 0;

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

    // Smooth facing toward movement direction (skip when pure-backpedal)
    if (hasInput && !isBackwardOnly) {
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

    const now = performance.now();
    if (now - lastSync.current.t > 80) { // ~12.5 fps network updates
      const q = avatarRef.current.quaternion;
      const moved =
        (avatarPos.x !== lastSync.current.x) ||
        (avatarPos.y !== lastSync.current.y) ||
        (avatarPos.z !== lastSync.current.z);
      const rotated = Math.abs(1 - Math.abs(q.dot(lastSync.current.q))) > 1e-3;
      if (moved || rotated) {
        // server API used elsewhere in your code expects "move" with [x,0,z]
        socket?.emit("move", [avatarPos.x, 0, avatarPos.z]);
        // optimistic update so remotes react immediately
        const arrPos = [avatarPos.x, 0, avatarPos.z];
        setCharacters((prev) =>
          Array.isArray(prev)
            ? prev.map((c) =>
                belongsToSelf(c) ? { ...c, position: arrPos } : c
              )
            : prev
        );
        lastSync.current = {
          t: now,
          x: avatarPos.x,
          y: avatarPos.y,
          z: avatarPos.z,
          q: q.clone(),
        };
      } else {
        lastSync.current.t = now;
      }
    }

    // Animation state machine (update only on state change)
    const speedNow = vel.current.length();
    const nextAnim =
      speedNow < 0.05 ? "idle" : keys.current.shift && speedNow > WALK_SPEED * 0.9 ? "run" : "walk";
    if (nextAnim !== anim) setAnim(nextAnim);
  });

  // Local render gate: require gender picked AND non-placeholder name
  const canRenderLocal =
    _isGendered(avatarType) &&
    ((me?.name && me.name !== "Player") || (displayName && displayName !== "Player"));

  return (
    <>
      {/* Lighting */}
      <Environment preset="sunset" />
      <ambientLight intensity={0.4} />

      {/* Mouse-look (click canvas to lock pointer) */}
      {/* <PointerLockControls /> */}

      {/* Scene */}
      <primitive object={scene} position={[-25, 0, 25]} />

      {/* 1) Render remotes (never the local). */}
      {remotes.map((c) => {
        const type = (c.avatar?.toLowerCase?.() ?? "male");
        const key = c.id ?? c.socketId ?? c.userId ?? c.name;
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
      })}

       {/* 2) Render exactly one local avatar ONLY when user is ready */}
      {canRenderLocal && (
        me
          ? (avatarType === "male" ? (
              <BusinessMan
                key={(me.id ?? me.socketId ?? me.userId ?? me.name) + ":local"}
                ref={avatarRef}
                id={me.id}
                username={me.name || displayName}
                isLocal
                anim={anim}
                moveSpeed={vel.current.length()}
                hairColor={me.hairColor ?? hairCol}
                topColor={me.topColor ?? topCol}
                bottomColor={me.bottomColor ?? bottomCol}
              />
            ) : (
              <AnimatedWoman
                key={(me.id ?? me.socketId ?? me.userId ?? me.name) + ":local"}
                ref={avatarRef}
                id={me.id}
                username={me.name || displayName}
                isLocal
                anim={anim}
                moveSpeed={vel.current.length()}
                hairColor={me.hairColor ?? hairCol}
                topColor={me.topColor ?? topCol}
                bottomColor={me.bottomColor ?? bottomCol}
              />
            ))
          : null
      )}
    </>
  );
};

useGLTF.preload("/models/InsightCenter.glb");
