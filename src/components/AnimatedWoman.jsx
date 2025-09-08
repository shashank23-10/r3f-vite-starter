// AnimatedWoman.jsx
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

export const AnimatedWoman = forwardRef(function AnimatedWoman(
  {
    hairColor = "green",
    topColor = "pink",
    bottomColor = "brown",
    id,
    username = "Player",
    isLocal = false,
    anim = "idle",        // "idle" | "walk" | "run"
    moveSpeed = 0,
    ...props
  },
  ref
) {
  const position = useMemo(() => props.position, []);
  const group = useRef();
  useImperativeHandle(ref, () => group.current, []);

  const { scene, animations, materials } = useGLTF("/models/AnimatedWoman.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes } = useGraph(clone);
  const { actions } = useAnimations(animations, group);
  const [activeName, setActiveName] = useState(null);

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

  useEffect(() => {
    if (!isLocal || !actions) return;
    const name = pickClip(anim);
    if (!name || activeName === name) return;
    actions[activeName]?.fadeOut(0.2);
    actions[name].reset().fadeIn(0.2).play();
    setActiveName(name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim, isLocal, actions]);

  useEffect(() => {
    if (!isLocal || !activeName || !actions) return;
    const action = actions[activeName];
    if (!action) return;

    const lower = activeName.toLowerCase();
    if (lower.includes("idle")) action.timeScale = 1.0;
    else if (lower.includes("walk")) action.timeScale = Math.min(1.25, Math.max(0.6, moveSpeed / 1.6));
    else if (lower.includes("run")) action.timeScale = Math.min(1.4, Math.max(0.7, moveSpeed / 3.8));
    else action.timeScale = 1.0;
  }, [moveSpeed, isLocal, activeName, actions]);

  // Remote players keep simple lerp logic
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
          <group name="Casual_Body" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <skinnedMesh
              name="Casual_Body_1"
              geometry={nodes.Casual_Body_1.geometry}
              material={materials.White}
              skeleton={nodes.Casual_Body_1.skeleton}
            >
              <meshStandardMaterial color={topColor} />
            </skinnedMesh>
            <skinnedMesh
              name="Casual_Body_2"
              geometry={nodes.Casual_Body_2.geometry}
              material={materials.Skin}
              skeleton={nodes.Casual_Body_2.skeleton}
            />
          </group>
          <group name="Casual_Feet" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <skinnedMesh
              name="Casual_Feet_1"
              geometry={nodes.Casual_Feet_1.geometry}
              material={materials.Skin}
              skeleton={nodes.Casual_Feet_1.skeleton}
            />
            <skinnedMesh
              name="Casual_Feet_2"
              geometry={nodes.Casual_Feet_2.geometry}
              material={materials.Grey}
              skeleton={nodes.Casual_Feet_2.skeleton}
            />
          </group>
          <group name="Casual_Head" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <skinnedMesh
              name="Casual_Head_1"
              geometry={nodes.Casual_Head_1.geometry}
              material={materials.Skin}
              skeleton={nodes.Casual_Head_1.skeleton}
            />
            <skinnedMesh
              name="Casual_Head_2"
              geometry={nodes.Casual_Head_2.geometry}
              material={materials.Hair_Blond}
              skeleton={nodes.Casual_Head_2.skeleton}
            >
              <meshStandardMaterial color={hairColor} />
            </skinnedMesh>
            <skinnedMesh
              name="Casual_Head_3"
              geometry={nodes.Casual_Head_3.geometry}
              material={materials.Hair_Brown}
              skeleton={nodes.Casual_Head_3.skeleton}
            />
            <skinnedMesh
              name="Casual_Head_4"
              geometry={nodes.Casual_Head_4.geometry}
              material={materials.Brown}
              skeleton={nodes.Casual_Head_4.skeleton}
            />
          </group>
          <skinnedMesh
            name="Casual_Legs"
            geometry={nodes.Casual_Legs.geometry}
            material={materials.Orange}
            skeleton={nodes.Casual_Legs.skeleton}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={100}
          >
            <meshStandardMaterial color={bottomColor} />
          </skinnedMesh>
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

useGLTF.preload("/models/AnimatedWoman.glb");
