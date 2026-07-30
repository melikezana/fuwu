"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Group, MathUtils } from "three";
import { HomeModel } from "@/components/three/ServiceObjects";
import { SceneFallback } from "@/components/three/SceneFallback";

function getReducedMotionPreference() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function detectWebGLAvailable() {
  if (typeof document === "undefined") {
    return null;
  }

  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");

    return Boolean(context);
  } catch {
    return false;
  }
}

function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getReducedMotionPreference);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function handleChange() {
      setPrefersReducedMotion(mediaQuery.matches);
    }

    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

function useWebGLAvailable() {
  const [webGLAvailable] = useState<boolean | null>(detectWebGLAvailable);

  return webGLAvailable;
}

function SceneRig({
  children,
  reducedMotion,
}: {
  children: ReactNode;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const scrollDepthRef = useRef(0);
  const pointer = useThree((state) => state.pointer);

  useEffect(() => {
    function updateScrollDepth() {
      scrollDepthRef.current = Math.min(window.scrollY / 900, 1);
    }

    updateScrollDepth();
    window.addEventListener("scroll", updateScrollDepth, { passive: true });

    return () => window.removeEventListener("scroll", updateScrollDepth);
  }, []);

  useFrame(({ clock }) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    const scrollDepth = scrollDepthRef.current;
    const idleLift = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.55) * 0.025;

    group.rotation.x = MathUtils.lerp(group.rotation.x, pointer.y * 0.035 - 0.04, 0.055);
    group.rotation.y = MathUtils.lerp(
      group.rotation.y,
      pointer.x * 0.055 - 0.22 + scrollDepth * 0.13,
      0.055,
    );
    group.position.y = MathUtils.lerp(group.position.y, idleLift, 0.05);
    group.position.z = MathUtils.lerp(group.position.z, -scrollDepth * 0.2, 0.05);
  });

  return <group ref={groupRef}>{children}</group>;
}

function HeroSceneContent({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      <ambientLight intensity={1.45} />
      <directionalLight
        castShadow
        intensity={1.85}
        position={[3.8, 4.5, 5.2]}
        shadow-mapSize={[768, 768]}
      />
      <pointLight color="#FF6500" intensity={0.72} position={[-2.8, 1.8, 2.5]} />
      <pointLight color="#DDEBFA" intensity={0.72} position={[2.4, 2.6, -1.8]} />
      <SceneRig reducedMotion={reducedMotion}>
        <mesh receiveShadow position={[0, -1.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3.25, 96]} />
          <meshStandardMaterial color="#FFF7EF" roughness={0.86} />
        </mesh>
        <mesh receiveShadow position={[0, -1.02, 0.04]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.55, 3.12, 96]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.72} />
        </mesh>
        <HomeModel />
      </SceneRig>
      <ContactShadows
        blur={2.8}
        far={4.8}
        opacity={0.26}
        position={[0, -1.14, 0]}
        resolution={256}
        scale={7}
      />
    </>
  );
}

export function FuwuHeroScene() {
  const reducedMotion = useReducedMotion();
  const webGLAvailable = useWebGLAvailable();

  if (webGLAvailable !== true) {
    return <SceneFallback />;
  }

  return (
    <Canvas
      aria-hidden="true"
      camera={{ fov: 35, position: [0, 1.35, 5.65] }}
      dpr={[1, 1.4]}
      frameloop={reducedMotion ? "demand" : "always"}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
        preserveDrawingBuffer: process.env.NODE_ENV !== "production",
      }}
      shadows
    >
      <HeroSceneContent reducedMotion={reducedMotion} />
    </Canvas>
  );
}
