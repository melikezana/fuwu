"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  ACESFilmicToneMapping,
  Box3,
  Group,
  Mesh,
  Object3D,
  SRGBColorSpace,
  Vector3,
  type PerspectiveCamera as PerspectiveCameraImpl,
} from "three";

const HOUSE_MODEL_PATH = "/models/house/fuwu-house.glb";
const PROVIDER_MODEL_PATH = "/models/house/provider.glb";
const CUSTOMER_MODEL_PATH = "/models/house/customer.glb";
// Same HDRI file used by drei's city preset, served locally so CSP never blocks the hero.
const CITY_ENVIRONMENT_PATH = "/models/house/potsdamer_platz_1k.hdr";
const HOUSE_ROTATION_SPEED = 0.09;
const DESKTOP_HOUSE_SCALE = 2.46;
const MOBILE_HOUSE_SCALE = 1.55;
const DESKTOP_PERSON_SCALE = 0.58;
const MOBILE_PERSON_SCALE = 0.34;

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
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }

      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onStoreChange);

      return () => mediaQuery.removeEventListener("change", onStoreChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => getMediaQueryMatch(query), [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
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
  const [webGLAvailable] = useState(() => detectWebGLAvailable());

  return webGLAvailable;
}

function ModelLoadingSurface() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <span className="absolute inset-x-[13%] bottom-[10%] h-[33%] rounded-[50%] bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF4EA_56%,#EEF3F8_100%)] shadow-[0_38px_88px_rgba(10,37,64,0.13)] ring-1 ring-[rgba(10,37,64,0.05)]" />
      <span className="absolute left-1/2 top-[47%] h-[48%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(circle,rgba(255,255,255,0.94)_0%,rgba(255,244,234,0.58)_44%,rgba(255,255,255,0)_73%)] blur-[2px]" />
    </div>
  );
}

function SceneLoader() {
  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute left-1/2 top-1/2 aspect-[1.45] w-[82%] max-w-[760px] -translate-x-1/2 -translate-y-1/2 sm:w-[74%] lg:w-[66%] xl:w-[62%]">
        <ModelLoadingSurface />
      </div>
    </div>
  );
}

function HeroCamera({ isMobile }: { isMobile: boolean }) {
  const cameraRef = useRef<PerspectiveCameraImpl>(null);
  const cameraPosition: [number, number, number] = isMobile
    ? [1.35, 1.62, 6.35]
    : [2.35, 2.22, 6.95];
  const cameraTarget = useMemo<[number, number, number]>(
    () => (isMobile ? [0, 0.2, 0.35] : [0, 0.22, 0.28]),
    [isMobile],
  );

  useEffect(() => {
    cameraRef.current?.lookAt(...cameraTarget);
  }, [cameraTarget]);

  return (
    <PerspectiveCamera
      far={40}
      fov={isMobile ? 35 : 31}
      makeDefault
      near={0.1}
      position={cameraPosition}
      ref={cameraRef}
    />
  );
}

function enableModelShadows(scene: Object3D) {
  scene.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function useGroundedModelOffset(scene: Object3D): [number, number, number] {
  return useMemo(() => {
    const box = new Box3().setFromObject(scene);

    if (box.isEmpty()) {
      return [0, 0, 0];
    }

    const center = new Vector3();
    box.getCenter(center);

    return [-center.x, -box.min.y, -center.z];
  }, [scene]);
}

function GroundedModel({
  position,
  rotation,
  scale,
  scene,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  scene: Object3D;
}) {
  const offset = useGroundedModelOffset(scene);

  return (
    <group dispose={null} position={position} rotation={rotation} scale={scale}>
      <group position={offset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

function FuwuHouseModel({ isMobile, scene }: { isMobile: boolean; scene: Object3D }) {
  const groupRef = useRef<Group>(null);
  const offset = useGroundedModelOffset(scene);
  const scale = isMobile ? MOBILE_HOUSE_SCALE : DESKTOP_HOUSE_SCALE;
  const position: [number, number, number] = isMobile ? [0, -0.42, -0.18] : [0, -1.02, -0.14];
  const initialRotationY = isMobile ? -0.28 : -0.38;

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * HOUSE_ROTATION_SPEED;
    }
  });

  return (
    <group
      dispose={null}
      position={position}
      ref={groupRef}
      rotation={[0, initialRotationY, 0]}
      scale={scale}
    >
      <group position={offset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

function HeroModels({ isMobile, onReady }: { isMobile: boolean; onReady: () => void }) {
  const hasReportedReadyRef = useRef(false);
  const { scene: houseScene } = useGLTF(HOUSE_MODEL_PATH);
  const { scene: providerScene } = useGLTF(PROVIDER_MODEL_PATH);
  const { scene: customerScene } = useGLTF(CUSTOMER_MODEL_PATH);
  const personScale = isMobile ? MOBILE_PERSON_SCALE : DESKTOP_PERSON_SCALE;
  const providerPosition: [number, number, number] = isMobile
    ? [0.72, -0.42, 1.38]
    : [1.92, -1.02, 2.16];
  const customerPosition: [number, number, number] = isMobile
    ? [-0.34, -0.42, 1.42]
    : [-0.48, -1.02, 2.28];
  const providerRotation: [number, number, number] = [0, isMobile ? -0.18 : -0.32, 0];
  const customerRotation: [number, number, number] = [0, isMobile ? 0.18 : 0.32, 0];

  useEffect(() => {
    enableModelShadows(houseScene);
    enableModelShadows(providerScene);
    enableModelShadows(customerScene);

    if (!hasReportedReadyRef.current) {
      hasReportedReadyRef.current = true;
      onReady();
    }
  }, [customerScene, houseScene, onReady, providerScene]);

  return (
    <>
      <FuwuHouseModel isMobile={isMobile} scene={houseScene} />
      <GroundedModel
        position={customerPosition}
        rotation={customerRotation}
        scale={personScale}
        scene={customerScene}
      />
      <GroundedModel
        position={providerPosition}
        rotation={providerRotation}
        scale={personScale}
        scene={providerScene}
      />
    </>
  );
}

function HeroSceneContent({ isMobile, onReady }: { isMobile: boolean; onReady: () => void }) {
  const shadowMapSize: [number, number] = isMobile ? [512, 512] : [1024, 1024];
  const controlsTarget: [number, number, number] = isMobile ? [0, 0.16, 0.36] : [0, 0.2, 0.28];

  return (
    <>
      <HeroCamera isMobile={isMobile} />
      <Environment files={CITY_ENVIRONMENT_PATH} />
      <ambientLight color="#fff8ef" intensity={0.28} />
      <hemisphereLight color="#fff5e7" groundColor="#dfe8f2" intensity={0.54} />
      <directionalLight
        castShadow
        color="#fff2df"
        intensity={2.9}
        position={[4.4, 6.1, 5.4]}
        shadow-camera-bottom={-4}
        shadow-camera-left={-4}
        shadow-camera-near={0.2}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-mapSize={shadowMapSize}
      />
      <directionalLight color="#ffffff" intensity={0.58} position={[-4.4, 2.8, 3.2]} />
      <pointLight color="#ffd7b3" intensity={0.36} position={[0, 2.4, -3.2]} />
      <HeroModels isMobile={isMobile} onReady={onReady} />
      <ContactShadows
        blur={isMobile ? 2.35 : 3}
        far={isMobile ? 3.8 : 5.4}
        opacity={0.32}
        position={[0, isMobile ? -0.42 : -1.02, 0.66]}
        resolution={isMobile ? 128 : 256}
        scale={isMobile ? 5.5 : 7.6}
      />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.35}
        enablePan={false}
        enableRotate={false}
        enableZoom={false}
        target={controlsTarget}
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
    console.error("[Fuwu hero] Failed to load hero GLB models", error);
  }, []);

  useEffect(() => {
    if (webGLAvailable === false) {
      console.error("[Fuwu hero] Cannot render hero GLB models: WebGL is unavailable.");
    }
  }, [webGLAvailable]);

  if (webGLAvailable !== true) {
    return (
      <div className="relative h-full min-h-[320px] w-full overflow-visible">
        <SceneLoader />
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-visible">
      <SceneErrorBoundary fallback={<SceneLoader />} onError={handleModelError}>
        {modelLoadFailed || !modelReady ? <SceneLoader /> : null}
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
            frameloop="always"
            gl={{
              alpha: true,
              antialias: true,
              powerPreference: "high-performance",
            }}
            onCreated={({ gl }) => {
              gl.outputColorSpace = SRGBColorSpace;
              gl.toneMapping = ACESFilmicToneMapping;
            }}
            shadows
          >
            <Suspense fallback={null}>
              <HeroSceneContent
                isMobile={isMobile}
                onReady={handleModelReady}
              />
            </Suspense>
          </Canvas>
        </div>
      </SceneErrorBoundary>
    </div>
  );
}

useGLTF.preload("/models/house/fuwu-house.glb");
useGLTF.preload("/models/house/provider.glb");
useGLTF.preload("/models/house/customer.glb");
