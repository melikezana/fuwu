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
import { HomeAssetImage } from "@/components/home/HomeAssetImage";
import { homeAssets } from "@/lib/home-assets";
import {
  ACESFilmicToneMapping,
  Box3,
  Mesh,
  PCFShadowMap,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Loader,
  type Object3D,
  type PerspectiveCamera as PerspectiveCameraImpl,
} from "three";

const HOUSE_MODEL_PATH = homeAssets.models.house;
const LOCAL_CITY_PRESET_PATH = "/models/house/";
const HOUSE_ROTATION_SPEED = 0.035;

type Vec3 = [number, number, number];

type ModelTransform = {
  position: Vec3;
  rotation: Vec3;
  scale: number;
};

type ContactShadowSettings = {
  blur: number;
  far: number;
  opacity: number;
  position: Vec3;
  resolution: number;
  scale: number;
};

type SceneLayout = {
  camera: {
    fov: number;
    position: Vec3;
    target: Vec3;
  };
  contactShadow: ContactShadowSettings;
  controlsTarget: Vec3;
  house: ModelTransform;
  shadowCameraSize: number;
  shadowMapSize: number;
};

const DESKTOP_LAYOUT: SceneLayout = {
  camera: {
    fov: 31,
    position: [2.35, 2.22, 6.95],
    target: [0, 0.22, 0.28],
  },
  contactShadow: {
    blur: 3,
    far: 5.4,
    opacity: 0.34,
    position: [0, -1.04, 0.7],
    resolution: 256,
    scale: 7.8,
  },
  controlsTarget: [0, 0.28, 0.32],
  house: {
    position: [0, -1.02, -0.14],
    rotation: [0, -0.36, 0],
    scale: 2.46,
  },
  shadowCameraSize: 4.25,
  shadowMapSize: 1024,
};

const MOBILE_LAYOUT: SceneLayout = {
  camera: {
    fov: 35,
    position: [1.35, 1.62, 6.35],
    target: [0, 0.2, 0.35],
  },
  contactShadow: {
    blur: 2.45,
    far: 3.8,
    opacity: 0.32,
    position: [0, -0.42, 0.6],
    resolution: 128,
    scale: 5.4,
  },
  controlsTarget: [0, 0.16, 0.4],
  house: {
    position: [0, -0.42, -0.18],
    rotation: [0, -0.28, 0],
    scale: 1.55,
  },
  shadowCameraSize: 3.2,
  shadowMapSize: 512,
};

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
  if (typeof window === "undefined" || typeof window.matchMedia === "undefined") {
    return false;
  }

  return window.matchMedia(query).matches;
}

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined" || typeof window.matchMedia === "undefined") {
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

function HeroSceneFallback({ decorative = false }: { decorative?: boolean }) {
  return (
    <div
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "Fuwu home service scene"}
      className="absolute inset-0 overflow-hidden"
      role={decorative ? undefined : "img"}
    >
      <HomeAssetImage
        alt={decorative ? "" : "Fuwu ev hizmetleri sahnesi"}
        className="absolute inset-[3%] rounded-md"
        height={1024}
        imageClassName="object-contain object-bottom"
        priority
        sizes="(min-width: 1024px) 680px, 92vw"
        src={homeAssets.hero.cutawayHouse}
        width={1024}
      />
    </div>
  );
}

function configureLocalCityPreset(loader: Loader) {
  loader.setPath(LOCAL_CITY_PRESET_PATH);
}

function enableModelShadows(scene: Object3D) {
  scene.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function useGroundedModelOffset(scene: Object3D): Vec3 {
  return useMemo(() => {
    const bounds = new Box3().setFromObject(scene);

    if (bounds.isEmpty()) {
      return [0, 0, 0];
    }

    const center = new Vector3();
    bounds.getCenter(center);

    return [-center.x, -bounds.min.y, -center.z];
  }, [scene]);
}

function RotatingHouseModel({ scene, transform }: { scene: Object3D; transform: ModelTransform }) {
  const groupRef = useRef<Group>(null);
  const offset = useGroundedModelOffset(scene);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * HOUSE_ROTATION_SPEED;
    }
  });

  return (
    <group
      dispose={null}
      position={transform.position}
      ref={groupRef}
      rotation={transform.rotation}
      scale={transform.scale}
    >
      <group position={offset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

function HeroCamera({ layout }: { layout: SceneLayout }) {
  const cameraRef = useRef<PerspectiveCameraImpl>(null);

  useEffect(() => {
    cameraRef.current?.lookAt(...layout.camera.target);
  }, [layout]);

  return (
    <PerspectiveCamera
      far={45}
      fov={layout.camera.fov}
      makeDefault
      near={0.1}
      position={layout.camera.position}
      ref={cameraRef}
    />
  );
}

function PremiumLighting({ layout }: { layout: SceneLayout }) {
  const shadowMapSize = useMemo<[number, number]>(
    () => [layout.shadowMapSize, layout.shadowMapSize],
    [layout],
  );

  return (
    <>
      <Environment
        background={false}
        environmentIntensity={0.5}
        environmentRotation={[0, -0.26, 0]}
        extensions={configureLocalCityPreset}
        preset="city"
      />
      <ambientLight color="#fff8ef" intensity={0.26} />
      <hemisphereLight color="#fff5e7" groundColor="#dfe8f2" intensity={0.48} />
      <directionalLight
        castShadow
        color="#fff2df"
        intensity={2.65}
        position={[4.4, 6.1, 5.4]}
        shadow-bias={-0.00016}
        shadow-camera-bottom={-layout.shadowCameraSize}
        shadow-camera-far={16}
        shadow-camera-left={-layout.shadowCameraSize}
        shadow-camera-near={0.25}
        shadow-camera-right={layout.shadowCameraSize}
        shadow-camera-top={layout.shadowCameraSize}
        shadow-mapSize={shadowMapSize}
        shadow-normalBias={0.025}
      />
      <directionalLight color="#ffffff" intensity={0.5} position={[-4.4, 2.8, 3.2]} />
      <directionalLight color="#ffd7b3" intensity={0.3} position={[0.2, 2.4, -3.6]} />
    </>
  );
}

function HeroModels({ layout, onReady }: { layout: SceneLayout; onReady: () => void }) {
  const hasReportedReadyRef = useRef(false);
  const { scene: houseScene } = useGLTF(HOUSE_MODEL_PATH);

  useEffect(() => {
    enableModelShadows(houseScene);

    if (!hasReportedReadyRef.current) {
      hasReportedReadyRef.current = true;
      onReady();
    }
  }, [houseScene, onReady]);

  return (
    <RotatingHouseModel scene={houseScene} transform={layout.house} />
  );
}

function HeroSceneContent({ layout, onReady }: { layout: SceneLayout; onReady: () => void }) {
  return (
    <>
      <HeroCamera layout={layout} />
      <PremiumLighting layout={layout} />
      <HeroModels layout={layout} onReady={onReady} />
      <ContactShadows
        blur={layout.contactShadow.blur}
        color="#0a2540"
        far={layout.contactShadow.far}
        frames={1}
        opacity={layout.contactShadow.opacity}
        position={layout.contactShadow.position}
        resolution={layout.contactShadow.resolution}
        scale={layout.contactShadow.scale}
      />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.35}
        dampingFactor={0.08}
        enableDamping
        enablePan={false}
        enableRotate={false}
        enableZoom={false}
        target={layout.controlsTarget}
      />
    </>
  );
}

export function FuwuHeroScene() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const webGLAvailable = useWebGLAvailable();
  const layout = isMobile ? MOBILE_LAYOUT : DESKTOP_LAYOUT;
  const [modelLoadFailed, setModelLoadFailed] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const handleModelReady = useCallback(() => setModelReady(true), []);
  const handleSceneError = useCallback((error: unknown) => {
    setModelLoadFailed(true);
    console.error("[Fuwu hero] Failed to render the hero scene", error);
  }, []);

  useEffect(() => {
    if (webGLAvailable === false) {
      console.error("[Fuwu hero] WebGL is unavailable; showing the fallback scene.");
    }
  }, [webGLAvailable]);

  if (webGLAvailable !== true || modelLoadFailed) {
    return (
      <div className="relative h-full min-h-[320px] w-full overflow-visible">
        <HeroSceneFallback />
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-visible">
      <SceneErrorBoundary fallback={<HeroSceneFallback />} onError={handleSceneError}>
        {modelReady ? null : <HeroSceneFallback decorative />}
        <div
          className={[
            "absolute inset-0 z-10 origin-center transition-[opacity,transform] duration-500 ease-out",
            modelReady ? "scale-100 opacity-100" : "scale-[0.985] opacity-0",
          ].join(" ")}
        >
          <Canvas
            aria-hidden="true"
            className="h-full w-full pointer-events-none"
            dpr={[1, 2]}
            frameloop="always"
            gl={{
              alpha: true,
              antialias: true,
              depth: true,
              powerPreference: "high-performance",
              stencil: false,
            }}
            onCreated={({ gl }) => {
              gl.outputColorSpace = SRGBColorSpace;
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = PCFShadowMap;
              gl.toneMapping = ACESFilmicToneMapping;
              gl.toneMappingExposure = 0.96;
            }}
            performance={{ debounce: 240, min: 0.65 }}
            shadows
          >
            <Suspense fallback={null}>
              <HeroSceneContent layout={layout} onReady={handleModelReady} />
            </Suspense>
          </Canvas>
        </div>
      </SceneErrorBoundary>
    </div>
  );
}

useGLTF.preload(HOUSE_MODEL_PATH);
