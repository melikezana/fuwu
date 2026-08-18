"use client";

import { Clone, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import Link from "next/link";
import { BadgeCheck, ShieldCheck, Sparkles, Star } from "lucide-react";
import { motion, useReducedMotion as useMotionReducedMotion } from "framer-motion";
import {
  Component,
  Suspense,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Box3, Vector3, type Group, type PerspectiveCamera } from "three";
import { HeroSearch } from "@/components/home/HeroSearch";
import { Container } from "@/components/ui/Container";
import { homeCopy } from "@/lib/constants/home";
import {
  sceneServiceTargets,
  type ServiceCategoryMapKey,
  type ServiceCategoryTarget,
} from "@/lib/constants/service-category-map";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type HeroSectionProps = {
  categories: string[];
  districts: string[];
};

const trustIcons = [ShieldCheck, Star, BadgeCheck] as const;
const houseModelPath = "/models/house/fuwu-house.glb";
const houseModelTargetSize = 4.8;

type OrbitControlsHandle = {
  target: Vector3;
  update: () => void;
};

const sceneNodeClassNames: Partial<Record<ServiceCategoryMapKey, string>> = {
  "climate-appliance-service": "right-[4%] top-[12%] sm:right-[6%] sm:top-[13%]",
  "furniture-assembly": "right-[2%] top-[59%] sm:right-[0%] sm:top-[58%]",
  cleaning: "left-[7%] top-[63%] sm:left-[13%] sm:top-[61%]",
  electrical: "left-[4%] top-[16%] sm:left-[10%] sm:top-[13%]",
  locksmith: "left-[42%] top-[74%] sm:left-[43%] sm:top-[73%]",
  painting: "right-[2%] top-[38%] sm:right-[0%] sm:top-[37%]",
  plumbing: "left-[3%] top-[40%] sm:left-[4%] sm:top-[37%]",
};

const sceneShortLabels: Partial<Record<ServiceCategoryMapKey, string>> = {
  "climate-appliance-service": "Beyaz",
  "furniture-assembly": "Mobilya",
  cleaning: "Temizlik",
  electrical: "Elektrik",
  locksmith: "Çilingir",
  painting: "Boya",
  plumbing: "Tesisat",
};

function getFallbackNodeClassName(index: number) {
  const fallbackClassNames = [
    "left-[8%] top-[14%]",
    "left-[5%] top-[38%]",
    "left-[12%] top-[62%]",
    "right-[12%] top-[13%]",
    "right-[3%] top-[38%]",
    "right-[3%] top-[62%]",
    "left-[42%] top-[74%]",
  ];

  return fallbackClassNames[index] ?? "left-[42%] top-[74%]";
}

function SceneNode({
  index,
  isActive,
  onActivate,
  target,
}: {
  index: number;
  isActive: boolean;
  onActivate: (target: ServiceCategoryTarget) => void;
  target: ServiceCategoryTarget;
}) {
  return (
    <Link
      aria-label={`${target.label} ustalarını gör`}
      className={cn(
        "home-scene-node group absolute z-30 inline-flex min-h-10 max-w-[8.5rem] min-w-0 cursor-pointer items-center gap-2 rounded-full border border-white bg-white/94 px-3 py-2 text-[0.72rem] font-extrabold text-[var(--brand-navy)] shadow-[0_18px_42px_rgba(10,37,64,0.13)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-[3px] hover:border-[rgba(255,101,0,0.42)] hover:bg-white hover:shadow-[0_24px_54px_rgba(10,37,64,0.17)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:min-h-12 sm:max-w-[12rem] sm:px-4 sm:text-xs",
        sceneNodeClassNames[target.id] ?? getFallbackNodeClassName(index),
        isActive ? "border-[rgba(255,101,0,0.54)] bg-white shadow-[0_28px_70px_rgba(10,37,64,0.18)]" : "",
      )}
      data-short-label={sceneShortLabels[target.id] ?? target.label}
      href={target.href}
      onFocus={() => onActivate(target)}
      onMouseEnter={() => onActivate(target)}
      style={{ animationDelay: `${index * 110}ms` }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2.5 shrink-0 rounded-full bg-[var(--brand-orange)] shadow-[0_0_0_5px_rgba(255,101,0,0.13)] transition-transform duration-300 group-hover:scale-110",
          isActive ? "scale-110 shadow-[0_0_0_6px_rgba(255,101,0,0.2)]" : "",
        )}
      />
      <span className="min-w-0 truncate sm:hidden">{sceneShortLabels[target.id] ?? target.label}</span>
      <span className="hidden min-w-0 truncate sm:inline">{target.label}</span>
    </Link>
  );
}

function HeroModelLoadingFallback() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-[9%] bottom-[13%] top-[4%] z-10 overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(255,246,238,0.54))] shadow-[0_32px_90px_rgba(10,37,64,0.12)]"
    >
      <span className="absolute inset-x-[18%] bottom-[18%] h-[27%] rounded-[50%] bg-white/90 shadow-[0_34px_86px_rgba(10,37,64,0.12)]" />
      <span className="absolute left-1/2 top-[35%] size-16 -translate-x-1/2 rounded-full border border-[rgba(255,101,0,0.22)] bg-white/82 shadow-[0_20px_50px_rgba(255,101,0,0.14)]" />
      <span className="absolute left-1/2 top-[35%] size-16 -translate-x-1/2 animate-ping rounded-full bg-[rgba(255,101,0,0.12)]" />
    </div>
  );
}

function HeroPremiumStaticFallback() {
  return (
    <div
      aria-label="Fuwu ev modeli yedek görseli"
      className="absolute inset-x-[8%] bottom-[12%] top-[3%] z-10 overflow-hidden rounded-[2rem] border border-white bg-[linear-gradient(145deg,#ffffff_0%,#fff8f1_58%,#eef4f8_100%)] shadow-[0_34px_92px_rgba(10,37,64,0.14)]"
      role="img"
    >
      <span className="absolute inset-x-[12%] bottom-[11%] h-[31%] rounded-[50%] bg-white shadow-[0_34px_88px_rgba(10,37,64,0.14)] ring-1 ring-[rgba(10,37,64,0.06)]" />
      <span className="absolute left-1/2 top-[24%] h-[46%] w-[55%] -translate-x-1/2 rounded-lg border border-white/90 bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_72%,#fff4ea_100%)] shadow-[0_28px_74px_rgba(10,37,64,0.13)]" />
      <span className="absolute left-1/2 top-[13%] h-[22%] w-[62%] -translate-x-1/2 skew-x-[-13deg] rounded-t-lg bg-[linear-gradient(135deg,#07182f_0%,#0a2540_76%,#183b63_100%)] shadow-[0_20px_52px_rgba(10,37,64,0.18)]" />
      <span className="absolute left-[59%] top-[8%] h-[14%] w-[7%] rounded-sm bg-[linear-gradient(180deg,#ffffff_0%,#dde5ee_100%)] shadow-[0_10px_24px_rgba(10,37,64,0.12)]" />
      <span className="absolute left-[29%] top-[39%] h-[15%] w-[12%] rounded-md bg-[rgba(255,101,0,0.12)] ring-1 ring-[rgba(255,101,0,0.18)]" />
      <span className="absolute right-[29%] top-[39%] h-[15%] w-[12%] rounded-md bg-[rgba(10,37,64,0.08)] ring-1 ring-[rgba(10,37,64,0.1)]" />
      <span className="absolute left-1/2 bottom-[24%] h-[24%] w-[13%] -translate-x-1/2 rounded-t-md bg-[rgba(10,37,64,0.14)] ring-1 ring-[rgba(10,37,64,0.1)]" />
    </div>
  );
}

type HeroModelErrorBoundaryProps = {
  children: ReactNode;
  onError: () => void;
};

type HeroModelErrorBoundaryState = {
  hasError: boolean;
};

class HeroModelErrorBoundary extends Component<
  HeroModelErrorBoundaryProps,
  HeroModelErrorBoundaryState
> {
  state: HeroModelErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): HeroModelErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    this.props.onError();

    if (process.env.NODE_ENV !== "production") {
      console.warn("[Fuwu homepage] Hero house model could not be loaded.", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

function FuwuHouseModel({ onReady }: { onReady: () => void }) {
  const { scene } = useGLTF(houseModelPath) as unknown as { scene: Group };
  const model = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<Group>(null);
  const hasAnnouncedReadyRef = useRef(false);
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const canvasSize = useThree((state) => state.size);
  const controls = useThree((state) => state.controls) as OrbitControlsHandle | null;

  /* eslint-disable react-hooks/immutability -- R3F camera/controls are mutable scene objects. */
  useLayoutEffect(() => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
      return;
    }

    const scale = houseModelTargetSize / maxDimension;
    const scaledSize = size.clone().multiplyScalar(scale);
    const aspect = canvasSize.width / Math.max(canvasSize.height, 1);
    const verticalFov = (camera.fov * Math.PI) / 180;
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const verticalDistance = (scaledSize.y * 0.62) / Math.tan(verticalFov / 2);
    const horizontalDistance = (scaledSize.x * 0.62) / Math.tan(horizontalFov / 2);
    const cameraDistance = Math.max(verticalDistance, horizontalDistance, scaledSize.z * 1.35);
    const targetY = scaledSize.y * 0.04;

    model.position.set(-center.x, -center.y, -center.z);
    group.scale.setScalar(scale);
    group.position.set(0, -scaledSize.y * 0.06, 0);
    camera.position.set(scaledSize.x * 0.04, scaledSize.y * 0.16, cameraDistance * 1.08);
    camera.near = Math.max(cameraDistance / 100, 0.01);
    camera.far = cameraDistance * 100;
    camera.lookAt(0, targetY, 0);
    camera.updateProjectionMatrix();
    controls?.target.set(0, targetY, 0);
    controls?.update();

    if (!hasAnnouncedReadyRef.current) {
      hasAnnouncedReadyRef.current = true;
      onReady();
    }
  }, [camera, canvasSize.height, canvasSize.width, controls, model, onReady]);
  /* eslint-enable react-hooks/immutability */

  return (
    <group ref={groupRef}>
      <Clone object={model} />
    </group>
  );
}

function HeroHouseCanvas() {
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">("loading");
  const handleModelReady = useCallback(() => setModelStatus("ready"), []);
  const handleModelError = useCallback(() => setModelStatus("error"), []);

  return (
    <>
      {modelStatus === "loading" ? <HeroModelLoadingFallback /> : null}
      {modelStatus === "error" ? <HeroPremiumStaticFallback /> : null}
      {modelStatus !== "error" ? (
        <Canvas
          camera={{ fov: 30, position: [0, 0.6, 8] }}
          className="absolute inset-0 z-10 h-full w-full"
          dpr={[1, 1.7]}
          fallback={<HeroPremiumStaticFallback />}
          gl={{ alpha: true, antialias: true }}
          shadows
        >
          <ambientLight intensity={1.35} />
          <hemisphereLight args={["#ffffff", "#f8d8bd", 1.15]} />
          <directionalLight castShadow intensity={2.35} position={[3.5, 5, 5.5]} />
          <directionalLight intensity={0.72} position={[-3, 2, -2]} />
          <OrbitControls
            autoRotate={false}
            enableDamping={true}
            enablePan={false}
            enableRotate={true}
            enableZoom={false}
            makeDefault
          />
          <HeroModelErrorBoundary onError={handleModelError}>
            <Suspense fallback={null}>
              <FuwuHouseModel onReady={handleModelReady} />
            </Suspense>
          </HeroModelErrorBoundary>
        </Canvas>
      ) : null}
    </>
  );
}

useGLTF.preload("/models/house/fuwu-house.glb");

function HeroSceneShowcase({ className }: { className?: string }) {
  const [activeServiceId, setActiveServiceId] =
    useState<ServiceCategoryMapKey>("locksmith");

  return (
    <div
      className={cn(
        "relative mx-auto min-h-[390px] w-full max-w-[980px] overflow-visible sm:min-h-[560px] lg:min-h-[660px] xl:min-h-[660px] xl:min-w-[760px]",
        className,
      )}
      data-home-hero-scene
    >
      <div className="absolute inset-0 origin-center" onMouseLeave={() => setActiveServiceId("locksmith")}>
        <div
          aria-hidden="true"
          className="premium-hero-ambient absolute inset-x-[-1%] bottom-[8%] top-[2%] rounded-[999px] opacity-95"
        />
        <span className="premium-orbit-ring left-[4%] top-[12%] h-[66%] w-[91%]" aria-hidden="true" />
        <span
          className="premium-orbit-ring left-[15%] top-[22%] h-[45%] w-[70%]"
          aria-hidden="true"
          style={{ animationDelay: "900ms" }}
        />
        <div className="absolute inset-x-[5%] bottom-[11%] h-[38%] rounded-[50%] bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFDF9_100%)] shadow-[0_42px_96px_rgba(10,37,64,0.16)] ring-1 ring-[rgba(10,37,64,0.06)]" />

        <HeroHouseCanvas />

        {sceneServiceTargets.map((target, index) => (
          <SceneNode
            index={index}
            isActive={activeServiceId === target.id}
            key={target.id}
            onActivate={(nextTarget) => setActiveServiceId(nextTarget.id)}
            target={target}
          />
        ))}
      </div>
    </div>
  );
}

function HeroTrustSignals({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div
      aria-label="Fuwu guven gostergeleri"
      className="relative z-20 grid min-w-0 gap-3 lg:col-span-2 lg:row-start-2 lg:-mt-8 lg:grid-cols-3"
    >
      {homeCopy.hero.trustSignals.map((signal, index) => {
        const Icon = trustIcons[index] ?? BadgeCheck;

        return (
          <motion.div
            className="flex min-h-[72px] min-w-0 items-center gap-3 rounded-lg border border-[rgba(10,37,64,0.08)] bg-white/92 p-4 text-left shadow-[0_16px_42px_rgba(10,37,64,0.08)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_58px_rgba(10,37,64,0.13)] sm:p-[17px]"
            initial={false}
            key={signal}
            transition={{
              delay: reduceMotion ? 0 : index * 0.04,
              duration: reduceMotion ? 0 : 0.22,
              ease: "easeOut",
            }}
            whileHover={reduceMotion ? undefined : { scale: 1.01, y: -2 }}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-orange-soft)] text-[var(--brand-orange)] ring-1 ring-[rgba(255,101,0,0.16)]">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0 text-[0.95rem] font-extrabold leading-[1.35] text-[var(--brand-navy)] [hyphens:none] [overflow-wrap:normal] [text-wrap:balance] [word-break:normal] lg:text-base">
              {signal}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export function HeroSection({ categories, districts }: HeroSectionProps) {
  const { locale } = useI18n();
  const reduceMotion = Boolean(useMotionReducedMotion());

  return (
    <motion.section
      className="relative isolate overflow-hidden border-b border-[rgba(10,37,64,0.08)] bg-[#FFFDF9]"
      initial={false}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(circle at 61% 42%, rgba(255,101,0,0.10), transparent 34%), radial-gradient(circle at 20% 16%, rgba(255,255,255,0.92), transparent 28%), linear-gradient(rgba(10,37,64,.036) 1px, transparent 1px), linear-gradient(90deg, rgba(10,37,64,.03) 1px, transparent 1px)",
          backgroundSize: "auto, auto, 76px 76px, 76px 76px",
        }}
      />
      <Container className="grid max-w-[1440px] gap-x-6 gap-y-6 pb-24 pt-10 sm:pb-20 sm:pt-14 lg:min-h-[720px] lg:grid-cols-[minmax(360px,38fr)_minmax(0,62fr)] lg:grid-rows-[minmax(0,1fr)_auto] lg:items-center lg:pb-12 lg:pt-12 xl:grid-cols-[minmax(380px,38fr)_minmax(760px,62fr)]">
        <motion.div
          className="premium-reveal relative z-20 min-w-0 lg:col-start-1 lg:row-start-1 lg:max-w-[560px] lg:pl-0"
          initial={false}
        >
          <span className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-[rgba(255,101,0,0.22)] bg-white px-3 text-xs font-extrabold leading-5 text-[var(--brand-navy)] shadow-[var(--shadow-subtle)]">
            <Sparkles aria-hidden="true" className="size-4 shrink-0 text-[var(--brand-orange)]" />
            <span className="truncate">{homeCopy.hero.eyebrow}</span>
          </span>

          {locale === "tr" ? (
            <p className="mt-4 text-sm font-bold uppercase tracking-wide text-[var(--brand-orange)]">
              Artık komşuya değil, FUWU&apos;ya sor.
            </p>
          ) : null}

          <h1 className="mt-5 max-w-[35rem] text-[2.625rem] font-extrabold leading-[1.04] text-[var(--brand-navy)] min-[390px]:text-5xl sm:text-6xl lg:text-[4.125rem] lg:leading-[0.99] 2xl:text-[4.5rem]">
            Güven, doğru{" "}
            <span>
              ustayla <span className="text-[var(--brand-orange)]">başlar.</span>
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-[1.05rem] font-medium leading-[1.58] text-[rgba(10,37,64,0.78)] sm:text-lg sm:leading-8">
            {homeCopy.hero.description}
          </p>

          <HeroSearch categories={categories} districts={districts} />

        </motion.div>

        <HeroTrustSignals reduceMotion={reduceMotion} />

        <HeroSceneShowcase className="lg:col-start-2 lg:row-start-1" />
      </Container>
    </motion.section>
  );
}
