"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import {
  Component,
  Suspense,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ACESFilmicToneMapping,
  Box3,
  Mesh,
  PCFShadowMap,
  SRGBColorSpace,
  Vector3,
  type Camera,
  type Loader,
  type Object3D,
  type PerspectiveCamera as PerspectiveCameraImpl,
} from "three";
import type { HomeAssetPath } from "@/lib/home-assets";
import { homeAssets } from "@/lib/home-assets";
import { cn } from "@/lib/utils";

type CharacterTone = "customer" | "provider";
type Vec3 = [number, number, number];

type HomeCharacterModelCanvasProps = {
  className?: string;
  label: string;
  modelPath: HomeAssetPath;
  tone: CharacterTone;
};

type CharacterFrame = {
  cameraDistance: number;
  cameraPosition: Vec3;
  offset: Vec3;
  scale: number;
  shadowScale: number;
  target: Vec3;
};

type CharacterSceneErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  onError: (error: unknown) => void;
};

type CharacterSceneErrorBoundaryState = {
  hasError: boolean;
};

const CARD_CAMERA_FOV = 28;
const CARD_MODEL_HEIGHT = 3.6;
const CARD_MODEL_VIEW_MARGIN = 1.07;
const CHARACTER_ROTATION_Y: Record<CharacterTone, number> = {
  customer: 0.42,
  provider: -0.42,
};

function configureLocalStudioPreset(loader: Loader) {
  loader.setPath("/models/house/");
  loader.manager.setURLModifier((url) => {
    if (url.endsWith("studio_small_03_1k.hdr")) {
      return homeAssets.models.environment;
    }

    return url;
  });
}

class CharacterSceneErrorBoundary extends Component<
  CharacterSceneErrorBoundaryProps,
  CharacterSceneErrorBoundaryState
> {
  state: CharacterSceneErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): CharacterSceneErrorBoundaryState {
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

function isPerspectiveCamera(camera: Camera): camera is PerspectiveCameraImpl {
  return (camera as PerspectiveCameraImpl).isPerspectiveCamera === true;
}

function enableModelShadows(scene: Object3D) {
  scene.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function fitCameraToObject(scene: Object3D, aspect: number): CharacterFrame {
  const bounds = new Box3().setFromObject(scene);

  if (bounds.isEmpty()) {
    return {
      cameraDistance: 6,
      cameraPosition: [0, 1.7, 6],
      offset: [0, 0, 0],
      scale: 1,
      shadowScale: 3.5,
      target: [0, 1.55, 0],
    };
  }

  const center = new Vector3();
  const size = new Vector3();

  bounds.getCenter(center);
  bounds.getSize(size);

  const safeAspect = Math.max(aspect, 0.45);
  const scale = CARD_MODEL_HEIGHT / Math.max(size.y, 0.001);
  const normalizedSize = size.clone().multiplyScalar(scale);
  const verticalFov = (CARD_CAMERA_FOV * Math.PI) / 180;
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * safeAspect);
  const rotationSafeWidth = Math.hypot(normalizedSize.x, normalizedSize.z);
  const verticalDistance = normalizedSize.y / (2 * Math.tan(verticalFov / 2));
  const horizontalDistance = rotationSafeWidth / (2 * Math.tan(horizontalFov / 2));
  const cameraDistance = Math.max(verticalDistance, horizontalDistance) * CARD_MODEL_VIEW_MARGIN;
  const targetY = normalizedSize.y * 0.5;

  return {
    cameraDistance,
    cameraPosition: [0.06, targetY + normalizedSize.y * 0.025, cameraDistance],
    offset: [-center.x, -bounds.min.y, -center.z],
    scale,
    shadowScale: Math.max(rotationSafeWidth, normalizedSize.z, 2.35) * 1.22,
    target: [0, targetY, 0],
  };
}

function useCharacterFrame(scene: Object3D): CharacterFrame {
  const { size } = useThree();
  const aspect = size.height > 0 ? size.width / size.height : 1;

  return useMemo(() => {
    enableModelShadows(scene);

    return fitCameraToObject(scene, aspect);
  }, [aspect, scene]);
}

function FramedCharacterModel({
  modelPath,
  onReady,
  tone,
}: {
  modelPath: HomeAssetPath;
  onReady: () => void;
  tone: CharacterTone;
}) {
  const { scene } = useGLTF(modelPath);
  const { camera, invalidate } = useThree();
  const frame = useCharacterFrame(scene);
  const rotationY = CHARACTER_ROTATION_Y[tone];

  useLayoutEffect(() => {
    if (!isPerspectiveCamera(camera)) {
      return;
    }

    camera.fov = CARD_CAMERA_FOV;
    camera.near = Math.max(0.01, frame.cameraDistance / 100);
    camera.far = frame.cameraDistance + frame.shadowScale * 5;
    camera.position.set(...frame.cameraPosition);
    camera.lookAt(...frame.target);
    camera.updateProjectionMatrix();
    invalidate();
    onReady();
  }, [camera, frame, invalidate, onReady]);

  return (
    <>
      <group dispose={null} rotation={[0, rotationY, 0]} scale={frame.scale}>
        <group position={frame.offset}>
          <primitive object={scene} />
        </group>
      </group>
      <ContactShadows
        blur={2.8}
        color="#0a2540"
        far={frame.shadowScale}
        frames={1}
        opacity={0.18}
        position={[0, -0.015, 0]}
        resolution={160}
        scale={frame.shadowScale * 1.08}
      />
      <OrbitControls
        autoRotate={false}
        enableDamping={false}
        enablePan={false}
        enableRotate={false}
        enableZoom={false}
        target={frame.target}
      />
    </>
  );
}

function CharacterScene({
  modelPath,
  onReady,
  tone,
}: {
  modelPath: HomeAssetPath;
  onReady: () => void;
  tone: CharacterTone;
}) {
  return (
    <>
      <PerspectiveCamera far={32} fov={CARD_CAMERA_FOV} makeDefault near={0.1} position={[0, 1.7, 6]} />
      <Environment background={false} extensions={configureLocalStudioPreset} preset="studio" />
      <ambientLight color="#fff8ef" intensity={0.34} />
      <hemisphereLight color="#fff7ea" groundColor="#dfe8f2" intensity={0.46} />
      <directionalLight
        castShadow
        color="#fff1dc"
        intensity={2.15}
        position={[3.4, 4.8, 4.4]}
        shadow-bias={-0.00014}
        shadow-camera-bottom={-3.4}
        shadow-camera-far={14}
        shadow-camera-left={-3.4}
        shadow-camera-near={0.2}
        shadow-camera-right={3.4}
        shadow-camera-top={3.4}
        shadow-mapSize={[512, 512]}
        shadow-normalBias={0.02}
      />
      <directionalLight color="#ffffff" intensity={0.42} position={[-3.8, 2.6, 2.8]} />
      <FramedCharacterModel modelPath={modelPath} onReady={onReady} tone={tone} />
    </>
  );
}

export function HomeCharacterModelCanvas({
  className,
  label,
  modelPath,
  tone,
}: HomeCharacterModelCanvasProps) {
  const [modelReady, setModelReady] = useState(false);
  const handleModelReady = useCallback(() => setModelReady(true), []);
  const handleSceneError = useCallback((error: unknown) => {
    setModelReady(true);
    console.error(`[Fuwu homepage] Failed to render ${tone} model`, error);
  }, [tone]);

  return (
    <div
      aria-label={label}
      className={cn(
        "home-character-visual h-full w-full",
        modelReady ? "home-character-visual-ready" : "",
        className,
      )}
      role="img"
    >
      <CharacterSceneErrorBoundary fallback={null} onError={handleSceneError}>
        <Canvas
          aria-hidden="true"
          className="h-full w-full pointer-events-none"
          dpr={[1, 1.5]}
          frameloop="demand"
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
            gl.toneMappingExposure = 0.98;
          }}
          performance={{ debounce: 240, min: 0.75 }}
          shadows
        >
          <Suspense fallback={null}>
            <CharacterScene modelPath={modelPath} onReady={handleModelReady} tone={tone} />
          </Suspense>
        </Canvas>
      </CharacterSceneErrorBoundary>
    </div>
  );
}

useGLTF.preload(homeAssets.models.provider);
useGLTF.preload(homeAssets.models.customer);
