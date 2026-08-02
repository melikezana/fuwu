"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, PerspectiveCamera, useGLTF } from "@react-three/drei";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

type CharacterSceneErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  onError: (error: unknown) => void;
};

type CharacterSceneErrorBoundaryState = {
  hasError: boolean;
};

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

function CharacterModelPlaceholder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-0 overflow-hidden rounded-[inherit] bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_60%,#eef3f8_100%)] ring-1 ring-[rgba(10,37,64,0.06)]",
        className,
      )}
    >
      <span className="absolute inset-x-[18%] bottom-[16%] h-px bg-[rgba(10,37,64,0.14)]" />
      <span className="absolute inset-x-[26%] bottom-[30%] h-px bg-[rgba(255,101,0,0.2)]" />
      <span className="absolute inset-x-[20%] top-[26%] h-px bg-[rgba(10,37,64,0.08)]" />
      <span className="absolute inset-[16%] rounded-md border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]" />
    </div>
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

function getModelFrame(scene: Object3D): { offset: Vec3; scale: number } {
  const bounds = new Box3().setFromObject(scene);

  if (bounds.isEmpty()) {
    return {
      offset: [0, 0, 0],
      scale: 1,
    };
  }

  const center = new Vector3();
  const size = new Vector3();

  bounds.getCenter(center);
  bounds.getSize(size);

  return {
    offset: [-center.x, -bounds.min.y, -center.z],
    scale: 3 / Math.max(size.y, 0.001),
  };
}

function CharacterCamera() {
  const cameraRef = useRef<PerspectiveCameraImpl>(null);

  useEffect(() => {
    cameraRef.current?.lookAt(0, 0.12, 0);
  }, []);

  return (
    <PerspectiveCamera
      far={32}
      fov={31}
      makeDefault
      near={0.1}
      position={[0, 1.12, 6.12]}
      ref={cameraRef}
    />
  );
}

function CharacterModel({
  modelPath,
  onReady,
  tone,
}: {
  modelPath: HomeAssetPath;
  onReady: () => void;
  tone: CharacterTone;
}) {
  const { scene } = useGLTF(modelPath);
  const frame = useMemo(() => {
    enableModelShadows(scene);

    return getModelFrame(scene);
  }, [scene]);
  const rotationY = tone === "provider" ? -0.28 : 0.24;
  const positionX = tone === "provider" ? 0.08 : -0.04;

  useEffect(() => {
    onReady();
  }, [onReady]);

  return (
    <group position={[positionX, -1.36, 0]} rotation={[0, rotationY, 0]} scale={frame.scale}>
      <group position={frame.offset}>
        <primitive object={scene} />
      </group>
    </group>
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
      <CharacterCamera />
      <Environment background={false} files={homeAssets.models.environment} />
      <ambientLight color="#fff8ef" intensity={0.42} />
      <hemisphereLight color="#fff7ea" groundColor="#dfe8f2" intensity={0.72} />
      <directionalLight
        castShadow
        color="#fff1dc"
        intensity={2.65}
        position={[3.8, 5.2, 4.6]}
        shadow-bias={-0.00014}
        shadow-camera-bottom={-2.8}
        shadow-camera-far={14}
        shadow-camera-left={-2.8}
        shadow-camera-near={0.2}
        shadow-camera-right={2.8}
        shadow-camera-top={2.8}
        shadow-mapSize={[512, 512]}
        shadow-normalBias={0.02}
      />
      <directionalLight color="#ffffff" intensity={0.48} position={[-3.8, 2.6, 2.8]} />
      <CharacterModel modelPath={modelPath} onReady={onReady} tone={tone} />
      <ContactShadows
        blur={2.5}
        color="#0a2540"
        far={3.2}
        frames={1}
        opacity={0.26}
        position={[0, -1.37, 0.2]}
        resolution={128}
        scale={3.8}
      />
    </>
  );
}

export function HomeCharacterModelCanvas({
  className,
  label,
  modelPath,
  tone,
}: HomeCharacterModelCanvasProps) {
  const [modelLoadFailed, setModelLoadFailed] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const handleModelReady = useCallback(() => setModelReady(true), []);
  const handleSceneError = useCallback((error: unknown) => {
    setModelLoadFailed(true);
    console.error(`[Fuwu homepage] Failed to render ${tone} model`, error);
  }, [tone]);

  return (
    <div
      aria-label={label}
      className={cn("relative h-full min-h-[13.5rem] w-full overflow-hidden", className)}
      role="img"
    >
      {modelReady && !modelLoadFailed ? null : <CharacterModelPlaceholder />}
      {modelLoadFailed ? null : (
        <CharacterSceneErrorBoundary
          fallback={<CharacterModelPlaceholder />}
          onError={handleSceneError}
        >
          <div
            className={cn(
              "absolute inset-0 z-10 transition-opacity duration-500 ease-out",
              modelReady ? "opacity-100" : "opacity-0",
            )}
          >
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
              onCreated={({ gl, invalidate }) => {
                gl.outputColorSpace = SRGBColorSpace;
                gl.shadowMap.enabled = true;
                gl.shadowMap.type = PCFShadowMap;
                gl.toneMapping = ACESFilmicToneMapping;
                gl.toneMappingExposure = 0.98;
                invalidate();
              }}
              performance={{ debounce: 240, min: 0.75 }}
              shadows
            >
              <Suspense fallback={null}>
                <CharacterScene modelPath={modelPath} onReady={handleModelReady} tone={tone} />
              </Suspense>
            </Canvas>
          </div>
        </CharacterSceneErrorBoundary>
      )}
    </div>
  );
}
