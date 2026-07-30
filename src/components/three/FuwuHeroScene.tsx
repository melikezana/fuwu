"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Group, MathUtils } from "three";
import { HomeModel, ServiceObjects } from "@/components/three/ServiceObjects";
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
    const idleLift = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.65) * 0.025;

    group.rotation.x = MathUtils.lerp(group.rotation.x, pointer.y * 0.045 - 0.06, 0.055);
    group.rotation.y = MathUtils.lerp(
      group.rotation.y,
      pointer.x * 0.075 - 0.22 + scrollDepth * 0.18,
      0.055,
    );
    group.position.y = MathUtils.lerp(group.position.y, idleLift, 0.05);
    group.position.z = MathUtils.lerp(group.position.z, -scrollDepth * 0.28, 0.05);
  });

  return <group ref={groupRef}>{children}</group>;
}

function HeroSceneContent({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight
        castShadow
        intensity={1.65}
        position={[3.8, 4.2, 5]}
        shadow-mapSize={[512, 512]}
      />
      <pointLight color="#F97316" intensity={0.8} position={[-2.4, 1.7, 2.4]} />
      <SceneRig reducedMotion={reducedMotion}>
        <mesh receiveShadow position={[0, -1.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.75, 64]} />
          <meshStandardMaterial color="#FFF3E8" roughness={0.86} />
        </mesh>
        <HomeModel />
        <ServiceObjects reducedMotion={reducedMotion} />
      </SceneRig>
      <ContactShadows
        blur={2.4}
        far={4}
        opacity={0.28}
        position={[0, -1.12, 0]}
        resolution={256}
        scale={6}
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
      camera={{ fov: 38, position: [0, 1.15, 5.25] }}
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
