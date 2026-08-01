"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, PerspectiveCamera, useGLTF } from "@react-three/drei";
import Image from "next/image";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Group,
  MathUtils,
  Mesh,
  type PerspectiveCamera as PerspectiveCameraImpl,
} from "three";

const HOUSE_MODEL_PATH = "/models/house/fuwu-house.glb";
const HERO_HOUSE_IMAGE_PATH = "/assets/home/hero-house.webp";
const DESKTOP_MODEL_SCALE = 3.6;
const MOBILE_MODEL_SCALE = 2.55;
const MAX_MOUSE_PARALLAX = MathUtils.degToRad(1);

type SceneErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  onError: (error: unknown) => void;
};

type SceneErrorBoundaryState = {
  hasError: boolean;
};

class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function getMediaQueryMatch(query: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(query).matches;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => getMediaQueryMatch(query));

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches);
    }

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
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

function useWebGLAvailable() {
  const [webGLAvailable, setWebGLAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    setWebGLAvailable(detectWebGLAvailable());
  }, []);

  return webGLAvailable;
}

function ModelLoadingSurface() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <span className="absolute inset-x-[18%] bottom-[14%] h-[30%] rounded-[50%] bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF4EA_58%,#EEF3F8_100%)] shadow-[0_34px_82px_rgba(10,37,64,0.12)] ring-1 ring-[rgba(10,37,64,0.05)]" />
      <span className="absolute left-1/2 top-[45%] h-[42%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(circle,rgba(255,255,255,0.92)_0%,rgba(255,244,234,0.48)_46%,rgba(255,255,255,0)_74%)] blur-[2px]" />
    </div>
  );
}

function VerifiedModelFallback() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <span className="absolute inset-x-[12%] bottom-[12%] h-[34%] rounded-[50%] bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF4EA_58%,#EEF3F8_100%)] shadow-[0_36px_86px_rgba(10,37,64,0.14)] ring-1 ring-[rgba(10,37,64,0.06)]" />
      <span className="absolute left-1/2 top-[46%] h-[48%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(circle,rgba(255,255,255,0.96)_0%,rgba(255,244,234,0.68)_42%,rgba(255,255,255,0)_72%)] blur-[2px]" />
      <span className="absolute left-[22%] top-[25%] h-[16%] w-[18%] rounded-full bg-[rgba(255,101,0,0.14)] blur-2xl" />
      <span className="absolute right-[18%] top-[20%] h-[22%] w-[24%] rounded-full bg-[rgba(255,255,255,0.88)] blur-xl" />
    </div>
  );
}

function SceneLoader({ verifiedFallback = false }: { verifiedFallback?: boolean }) {
  const [canUseFallbackImage, setCanUseFallbackImage] = useState(true);

  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute left-1/2 top-1/2 aspect-[1.45] w-[82%] max-w-[760px] -translate-x-1/2 -translate-y-1/2 sm:w-[74%] lg:w-[66%] xl:w-[62%]">
        {verifiedFallback && canUseFallbackImage ? (
          <Image
            alt=""
            className="object-contain drop-shadow-[0_36px_70px_rgba(10,37,64,0.18)]"
            fill
            onError={() => setCanUseFallbackImage(false)}
            priority
            sizes="(min-width: 1280px) 620px, (min-width: 1024px) 40vw, 82vw"
            src={HERO_HOUSE_IMAGE_PATH}
          />
        ) : verifiedFallback ? (
          <VerifiedModelFallback />
        ) : (
          <ModelLoadingSurface />
        )}
      </div>
    </div>
  );
}

function HeroCamera({ isMobile }: { isMobile: boolean }) {
  const cameraRef = useRef<PerspectiveCameraImpl>(null);
  const cameraPosition: [number, number, number] = isMobile
    ? [0, 2.08, 7.9]
    : [0, 2.32, 7.45];
  const cameraTargetY = isMobile ? -0.14 : -0.2;

  useEffect(() => {
    cameraRef.current?.lookAt(0, cameraTargetY, 0);
  }, [cameraTargetY]);

  return (
    <PerspectiveCamera
      far={40}
      fov={isMobile ? 36 : 33}
      makeDefault
      near={0.1}
      position={cameraPosition}
      ref={cameraRef}
    />
  );
}

function FuwuHouseModel({
  isMobile,
  onReady,
  reducedMotion,
}: {
  isMobile: boolean;
  onReady: () => void;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const introStartRef = useRef<number | null>(null);
  const hasReportedReadyRef = useRef(false);
  const pointer = useThree((state) => state.pointer);
  const { scene } = useGLTF(HOUSE_MODEL_PATH);
  const modelScale = isMobile ? MOBILE_MODEL_SCALE : DESKTOP_MODEL_SCALE;
  const basePositionY = isMobile ? -0.18 : -0.22;
  const baseRotationY = isMobile ? -0.2 : -0.24;

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    if (!hasReportedReadyRef.current) {
      hasReportedReadyRef.current = true;
      onReady();
    }
  }, [onReady, scene]);

  useFrame(({ clock }) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    if (reducedMotion) {
      group.position.y = basePositionY;
      group.rotation.x = -0.035;
      group.rotation.y = baseRotationY;
      group.scale.setScalar(modelScale);
      return;
    }

    if (introStartRef.current === null) {
      introStartRef.current = clock.elapsedTime;
    }

    const introElapsed = Math.min((clock.elapsedTime - introStartRef.current) / 0.48, 1);
    const introEase = 1 - Math.pow(1 - introElapsed, 3);
    const idleLift = Math.sin(clock.elapsedTime * 0.58) * (isMobile ? 0.014 : 0.026);
    const pointerX = MathUtils.clamp(pointer.x, -1, 1);
    const pointerY = MathUtils.clamp(pointer.y, -1, 1);

    group.position.y = MathUtils.lerp(group.position.y, basePositionY + idleLift, 0.075);
    group.rotation.x = MathUtils.lerp(
      group.rotation.x,
      -0.035 + pointerY * MAX_MOUSE_PARALLAX * 0.55,
      0.08,
    );
    group.rotation.y = MathUtils.lerp(
      group.rotation.y,
      baseRotationY + pointerX * MAX_MOUSE_PARALLAX,
      0.08,
    );
    group.scale.setScalar(modelScale * (0.955 + introEase * 0.045));
  });

  return (
    <group
      dispose={null}
      position={[0, basePositionY, 0]}
      ref={groupRef}
      rotation={[-0.035, baseRotationY, 0]}
      scale={modelScale * 0.955}
    >
      <primitive object={scene} />
    </group>
  );
}

function HeroSceneContent({
  isMobile,
  onReady,
  reducedMotion,
}: {
  isMobile: boolean;
  onReady: () => void;
  reducedMotion: boolean;
}) {
  const shadowMapSize: [number, number] = isMobile ? [512, 512] : [1024, 1024];

  return (
    <>
      <HeroCamera isMobile={isMobile} />
      <ambientLight color="#fff8ef" intensity={0.38} />
      <hemisphereLight color="#fff5e7" groundColor="#dfe8f2" intensity={0.64} />
      <directionalLight
        castShadow
        color="#fff2df"
        intensity={3.15}
        position={[4.2, 5.6, 5.2]}
        shadow-camera-bottom={-4}
        shadow-camera-left={-4}
        shadow-camera-near={0.2}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-mapSize={shadowMapSize}
      />
      <directionalLight color="#ffffff" intensity={0.72} position={[-3.8, 2.6, 3.4]} />
      <pointLight color="#ffd7b3" intensity={0.46} position={[0, 2.4, -3.2]} />
      <FuwuHouseModel isMobile={isMobile} onReady={onReady} reducedMotion={reducedMotion} />
      <ContactShadows
        blur={isMobile ? 2.2 : 2.8}
        far={isMobile ? 3.4 : 4.8}
        opacity={0.24}
        position={[0, isMobile ? -0.8 : -1.06, 0]}
        resolution={isMobile ? 128 : 256}
        scale={isMobile ? 5.6 : 7.4}
      />
    </>
  );
}

export function FuwuHeroScene() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const webGLAvailable = useWebGLAvailable();
  const [modelLoadFailed, setModelLoadFailed] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const handleModelReady = useCallback(() => setModelReady(true), []);
  const handleModelError = useCallback((error: unknown) => {
    setModelLoadFailed(true);
    console.error(`[Fuwu hero] Failed to load GLB model from ${HOUSE_MODEL_PATH}`, error);
  }, []);

  useEffect(() => {
    if (webGLAvailable === false) {
      console.error(`[Fuwu hero] Cannot render GLB model from ${HOUSE_MODEL_PATH}: WebGL is unavailable.`);
    }
  }, [webGLAvailable]);

  if (webGLAvailable !== true) {
    return (
      <div className="relative h-full min-h-[320px] w-full overflow-visible">
        <SceneLoader verifiedFallback={webGLAvailable === false} />
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-visible">
      <SceneErrorBoundary fallback={<SceneLoader verifiedFallback />} onError={handleModelError}>
        {modelLoadFailed || !modelReady ? <SceneLoader verifiedFallback={modelLoadFailed} /> : null}
        <div
          className={[
            "absolute inset-0 z-10 origin-center",
            reducedMotion ? "" : "transition-[opacity,transform] duration-500 ease-out",
            modelReady ? "scale-100 opacity-100" : "scale-[0.985] opacity-0",
          ].join(" ")}
        >
          <Canvas
            aria-hidden="true"
            className="h-full w-full"
            dpr={isMobile ? [0.75, 1] : [1, 2]}
            frameloop={reducedMotion ? "demand" : "always"}
            gl={{
              alpha: true,
              antialias: true,
              powerPreference: "high-performance",
            }}
            shadows
          >
            <Suspense fallback={null}>
              <HeroSceneContent
                isMobile={isMobile}
                onReady={handleModelReady}
                reducedMotion={reducedMotion}
              />
            </Suspense>
          </Canvas>
        </div>
      </SceneErrorBoundary>
    </div>
  );
}

useGLTF.preload("/models/house/fuwu-house.glb");
