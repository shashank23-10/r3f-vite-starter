// BusinessMan.jsx
import { useAnimations, useGLTF, Billboard, Text } from "@react-three/drei";
import { useFrame, useGraph } from "@react-three/fiber";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { SkeletonUtils } from "three-stdlib";

const MOVEMENT_SPEED = 0.032;

export const BusinessMan = forwardRef(function BusinessMan(
  {
    hairColor = "green",
    topColor = "pink",
    bottomColor = "brown",
    id,
    username = "Player",
    isLocal = false,
    anim = "idle",        // "idle" | "walk" | "run" (for local control)
    moveSpeed = 0,        // current speed (for timeScale tuning)
    ...props
  },
  ref
) {
  const position = useMemo(() => props.position, []);
  const group = useRef();
  useImperativeHandle(ref, () => group.current, []);

  const { scene, animations, materials } = useGLTF("/models/BusinessMan.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes } = useGraph(clone);
  const { actions } = useAnimations(animations, group);

  const [activeName, setActiveName] = useState(null);

  // Helper to find a clip by fuzzy name
  const pickClip = (want) => {
    const keys = Object.keys(actions || {}).map((k) => k.toLowerCase());
    const originalKeys = Object.keys(actions || {});
    const findFirst = (substrs) => {
      for (let i = 0; i < keys.length; i++) {
        if (substrs.some((s) => keys[i].includes(s))) return originalKeys[i];
      }
      return null;
    };
    if (want === "idle") return findFirst(["idle"]) || originalKeys[0];
    if (want === "walk") return findFirst(["walk"]) || findFirst(["run"]) || originalKeys[0];
    if (want === "run") return findFirst(["run"]) || findFirst(["walk"]) || originalKeys[0];
    return originalKeys[0];
  };

  // Local animation control via prop `anim`
  useEffect(() => {
    if (!isLocal || !actions) return;

    const name = pickClip(anim);
    if (!name) return;
    if (activeName === name) return;

    actions[activeName]?.fadeOut(0.2);
    actions[name].reset().fadeIn(0.2).play();
    setActiveName(name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim, isLocal, actions]);

  // Tune timeScale so walk looks slower than run (approx.)
  useEffect(() => {
    if (!isLocal || !activeName || !actions) return;
    const action = actions[activeName];
    if (!action) return;

    const lower = activeName.toLowerCase();
    if (lower.includes("idle")) action.timeScale = 1.0;
    else if (lower.includes("walk")) {
      // scale around typical walk ~1.6 m/s
      action.timeScale = Math.min(1.25, Math.max(0.6, moveSpeed / 1.6));
    } else if (lower.includes("run")) {
      // scale around typical run ~3.8 m/s
      action.timeScale = Math.min(1.4, Math.max(0.7, moveSpeed / 3.8));
    } else {
      action.timeScale = 1.0;
    }
  }, [moveSpeed, isLocal, activeName, actions]);

  // Remote players keep their original simple lerp logic
  useFrame(() => {
    if (isLocal) return;
    if (!group.current || !props.position) return;

    if (group.current.position.distanceTo(props.position) > 0.1) {
      const direction = group.current.position
        .clone()
        .sub(props.position)
        .normalize()
        .multiplyScalar(MOVEMENT_SPEED);
      group.current.position.sub(direction);
      group.current.lookAt(props.position);
      const name = pickClip("run");
      if (activeName !== name) {
        actions[activeName]?.fadeOut(0.2);
        actions[name]?.reset().fadeIn(0.2).play();
        setActiveName(name);
      }
    } else {
      const name = pickClip("idle");
      if (activeName !== name) {
        actions[activeName]?.fadeOut(0.2);
        actions[name]?.reset().fadeIn(0.2).play();
        setActiveName(name);
      }
    }
  });

  return (
    <group ref={group} {...props} position={position} dispose={null}>
      <group name="Root_Scene">
        <group name="RootNode">
          <group name="CharacterArmature" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <primitive object={nodes.Root} />
          </group>
          <skinnedMesh
            name="Suit_Legs"
            geometry={nodes.Suit_Legs.geometry}
            material={materials.Suit}
            skeleton={nodes.Suit_Legs.skeleton}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={100}
          >
            <meshStandardMaterial color={bottomColor} />
          </skinnedMesh>
          <skinnedMesh
            name="Suit_Feet"
            geometry={nodes.Suit_Feet.geometry}
            material={materials.Black}
            skeleton={nodes.Suit_Feet.skeleton}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={100}
          />
          <group name="Suit_Body" position={[0, 0.007, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <skinnedMesh
              name="Suit_Body_1"
              geometry={nodes.Suit_Body_1.geometry}
              material={materials.Suit}
              skeleton={nodes.Suit_Body_1.skeleton}
            >
              <meshStandardMaterial color={topColor} />
            </skinnedMesh>
            <skinnedMesh
              name="Suit_Body_2"
              geometry={nodes.Suit_Body_2.geometry}
              material={materials.White}
              skeleton={nodes.Suit_Body_2.skeleton}
            />
            <skinnedMesh
              name="Suit_Body_3"
              geometry={nodes.Suit_Body_3.geometry}
              material={materials.Tie}
              skeleton={nodes.Suit_Body_3.skeleton}
            />
            <skinnedMesh
              name="Suit_Body_4"
              geometry={nodes.Suit_Body_4.geometry}
              material={materials.Skin}
              skeleton={nodes.Suit_Body_4.skeleton}
            />
          </group>
          <group name="Suit_Head" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <skinnedMesh
              name="Suit_Head_1"
              geometry={nodes.Suit_Head_1.geometry}
              material={materials.Skin}
              skeleton={nodes.Suit_Head_1.skeleton}
            />
            <skinnedMesh
              name="Suit_Head_2"
              geometry={nodes.Suit_Head_2.geometry}
              material={materials.Hair}
              skeleton={nodes.Suit_Head_2.skeleton}
            >
              <meshStandardMaterial color={hairColor} />
            </skinnedMesh>
            <skinnedMesh
              name="Suit_Head_3"
              geometry={nodes.Suit_Head_3.geometry}
              material={materials.Eyebrows}
              skeleton={nodes.Suit_Head_3.skeleton}
            />
            <skinnedMesh
              name="Suit_Head_4"
              geometry={nodes.Suit_Head_4.geometry}
              material={materials.Eye}
              skeleton={nodes.Suit_Head_4.skeleton}
            />
          </group>
        </group>
      </group>

      {/* Username Billboard */}
      <Billboard position={[0, 2.2, 0]}>
        <Text
          fontSize={0.2}
          color="black"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="white"
        >
          {username}
        </Text>
      </Billboard>
    </group>
  );
});

useGLTF.preload("/models/BusinessMan.glb");
