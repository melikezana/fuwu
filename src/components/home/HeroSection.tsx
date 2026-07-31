"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { BadgeCheck, MousePointerClick, ShieldCheck, Sparkles, Star } from "lucide-react";
import { motion, useReducedMotion as useMotionReducedMotion } from "framer-motion";
import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import { HeroSearch } from "@/components/home/HeroSearch";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { SceneFallback } from "@/components/three/SceneFallback";
import { SceneServiceLinks } from "@/components/three/SceneServiceLinks";
import { Container } from "@/components/ui/Container";
import { homeCopy } from "@/lib/constants/home";
import {
  getServiceCategoryTarget,
  sceneServiceTargets,
  type ServiceCategoryMapKey,
  type ServiceCategoryTarget,
} from "@/lib/constants/service-category-map";
import { cn } from "@/lib/utils";

const FuwuHeroScene = dynamic(
  () => import("@/components/three/FuwuHeroScene").then((mod) => mod.FuwuHeroScene),
  {
    loading: () => <SceneFallback />,
    ssr: false,
  },
);

type HeroSectionProps = {
  categories: string[];
  districts: string[];
};

const trustIcons = [ShieldCheck, Star, BadgeCheck] as const;

const sceneNodeClassNames: Partial<Record<ServiceCategoryMapKey, string>> = {
  "climate-appliance-service": "right-[11%] top-[10%]",
  "furniture-assembly": "right-[1%] top-[57%]",
  cleaning: "left-[17%] top-[58%]",
  electrical: "left-[8%] top-[11%]",
  locksmith: "left-[45%] top-[68%]",
  painting: "right-[1%] top-[35%]",
  plumbing: "left-[4%] top-[35%]",
};

const sceneShortLabels: Partial<Record<ServiceCategoryMapKey, string>> = {
  "climate-appliance-service": "Klima",
  "furniture-assembly": "Mobilya",
  cleaning: "Temizlik",
  electrical: "Elektrik",
  locksmith: "Çilingir",
  painting: "Boya",
  plumbing: "Su",
};

const sceneLineCoordinates: Partial<Record<ServiceCategoryMapKey, [number, number, number, number]>> = {
  "climate-appliance-service": [76, 18, 58, 30],
  "furniture-assembly": [87, 62, 64, 52],
  cleaning: [27, 64, 47, 52],
  electrical: [18, 19, 42, 30],
  locksmith: [52, 72, 53, 56],
  painting: [87, 41, 64, 43],
  plumbing: [16, 41, 40, 43],
};

function getFallbackNodeClassName(index: number) {
  const fallbackClassNames = [
    "left-[12%] top-[14%]",
    "left-[8%] top-[36%]",
    "left-[20%] top-[58%]",
    "right-[14%] top-[13%]",
    "right-[2%] top-[36%]",
    "right-[2%] top-[58%]",
    "left-[45%] top-[70%]",
  ];

  return fallbackClassNames[index] ?? "left-[45%] top-[70%]";
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
        "home-scene-node group absolute z-30 hidden min-h-[3.75rem] min-w-0 cursor-pointer items-center gap-2 rounded-full border border-white bg-white/94 p-1.5 pr-4 text-xs font-extrabold text-[var(--brand-navy)] shadow-[0_20px_46px_rgba(10,37,64,0.13)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.035] hover:border-[rgba(255,101,0,0.42)] hover:bg-white hover:shadow-[0_26px_58px_rgba(10,37,64,0.18)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:inline-flex",
        sceneNodeClassNames[target.id] ?? getFallbackNodeClassName(index),
        isActive ? "border-[rgba(255,101,0,0.54)] bg-white shadow-[0_28px_70px_rgba(10,37,64,0.18)]" : "",
      )}
      href={target.href}
      onFocus={() => onActivate(target)}
      onMouseEnter={() => onActivate(target)}
      style={{ animationDelay: `${index * 110}ms` }}
    >
      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-full border border-[rgba(10,37,64,0.08)] bg-white text-[var(--brand-orange)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_26px_rgba(10,37,64,0.13)] transition-transform duration-300 group-hover:scale-110",
          isActive ? "scale-110 ring-4 ring-[rgba(255,101,0,0.14)]" : "",
        )}
      >
        <ServiceIcon className="size-6" name={target.iconName ?? "wrench"} />
      </span>
      <span className="max-w-[7.75rem] truncate">{sceneShortLabels[target.id] ?? target.label}</span>
    </Link>
  );
}

function SceneConnectorLines({ activeServiceId }: { activeServiceId: ServiceCategoryMapKey }) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full overflow-visible sm:block"
      preserveAspectRatio="none"
      viewBox="0 0 100 82"
    >
      {sceneServiceTargets.map((target) => {
        const coordinates = sceneLineCoordinates[target.id];

        if (!coordinates) {
          return null;
        }

        const [x1, y1, x2, y2] = coordinates;
        const isActive = activeServiceId === target.id;

        return (
          <line
            key={target.id}
            stroke={isActive ? "rgba(255,101,0,0.54)" : "rgba(10,37,64,0.16)"}
            strokeLinecap="round"
            strokeWidth={isActive ? 0.34 : 0.22}
            vectorEffect="non-scaling-stroke"
            x1={x1}
            x2={x2}
            y1={y1}
            y2={y2}
          />
        );
      })}
    </svg>
  );
}

function SceneInfoCard({ target }: { target: ServiceCategoryTarget }) {
  return (
    <div className="absolute inset-x-5 bottom-[8%] z-40 rounded-lg border border-[rgba(10,37,64,0.08)] bg-white/96 p-4 text-[var(--brand-navy)] shadow-[0_26px_70px_rgba(10,37,64,0.18)] backdrop-blur-xl sm:inset-x-auto sm:bottom-[13%] sm:right-[22%] sm:w-72">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-extrabold leading-6 text-[var(--brand-navy)]">{target.label}</h3>
          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-[rgba(10,37,64,0.68)]">
            {target.description}
          </p>
        </div>
        <ServiceIcon
          className="size-5 shrink-0 text-[var(--brand-orange)]"
          name={target.iconName ?? "wrench"}
        />
      </div>
      <Link
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--brand-orange)] px-4 text-xs font-extrabold text-white shadow-[var(--shadow-action)] transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
        href={target.href}
      >
        {target.ctaLabel}
      </Link>
    </div>
  );
}

function HeroSceneShowcase() {
  const [activeServiceId, setActiveServiceId] =
    useState<ServiceCategoryMapKey>("locksmith");
  const activeTarget = useMemo(() => getServiceCategoryTarget(activeServiceId), [activeServiceId]);
  const sceneParallaxRef = useRef<HTMLDivElement>(null);
  const reduceMotion = Boolean(useMotionReducedMotion());

  useEffect(() => {
    const parallaxElement = sceneParallaxRef.current;

    if (!parallaxElement || reduceMotion) {
      return;
    }

    const element: HTMLDivElement = parallaxElement;
    const xTo = gsap.quickTo(element, "x", { duration: 0.72, ease: "power3.out" });
    const yTo = gsap.quickTo(element, "y", { duration: 0.72, ease: "power3.out" });
    const rotateTo = gsap.quickTo(element, "rotate", { duration: 0.72, ease: "power3.out" });

    function handlePointerMove(event: PointerEvent) {
      const rect = element.getBoundingClientRect();
      const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
      const relativeY = (event.clientY - rect.top) / rect.height - 0.5;

      xTo(relativeX * 18);
      yTo(relativeY * 12);
      rotateTo(relativeX * 1.2);
    }

    function handlePointerLeave() {
      xTo(0);
      yTo(0);
      rotateTo(0);
      setActiveServiceId("locksmith");
    }

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerleave", handlePointerLeave);
      gsap.set(element, { rotate: 0, x: 0, y: 0 });
    };
  }, [reduceMotion]);

  return (
    <div className="relative mx-auto min-h-[540px] w-full max-w-[980px] overflow-visible sm:min-h-[600px] lg:min-h-[660px] xl:min-h-[700px]">
      <div className="absolute inset-0 origin-center will-change-transform" ref={sceneParallaxRef}>
      <div
        aria-hidden="true"
        className="premium-hero-ambient absolute inset-x-[-2%] bottom-[7%] top-[1%] rounded-[999px] opacity-95"
      />
      <span className="premium-orbit-ring left-[4%] top-[12%] h-[66%] w-[91%]" aria-hidden="true" />
      <span
        className="premium-orbit-ring left-[15%] top-[22%] h-[45%] w-[70%]"
        aria-hidden="true"
        style={{ animationDelay: "900ms" }}
      />
      <div className="absolute inset-x-[5%] bottom-[11%] h-[38%] rounded-[50%] bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFDF9_100%)] shadow-[0_42px_96px_rgba(10,37,64,0.16)] ring-1 ring-[rgba(10,37,64,0.06)]" />

      <SceneConnectorLines activeServiceId={activeServiceId} />

      <div className="absolute inset-x-[6%] bottom-[14%] top-[2%] z-10 overflow-visible sm:inset-x-[8%] lg:inset-x-[7%]">
        <FuwuHeroScene />
      </div>

      {sceneServiceTargets.map((target, index) => (
        <SceneNode
          index={index}
          isActive={activeServiceId === target.id}
          key={target.id}
          onActivate={(nextTarget) => setActiveServiceId(nextTarget.id)}
          target={target}
        />
      ))}

      <SceneInfoCard target={activeTarget} />
      </div>

      <p className="absolute inset-x-0 bottom-1 z-20 flex items-center justify-center gap-2 text-center text-sm font-semibold leading-6 text-[rgba(10,37,64,0.64)]">
        <MousePointerClick aria-hidden="true" className="size-4 text-[var(--brand-navy)]" />
        Keşfetmek için evin bölümlerine tıklayın
      </p>

      <SceneServiceLinks
        className="absolute inset-x-0 -bottom-14 z-20 flex gap-2 overflow-x-auto pb-1 sm:hidden"
        linkClassName="inline-flex min-h-10 shrink-0 items-center rounded-md border border-[rgba(10,37,64,0.1)] bg-white px-3 text-xs font-bold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-all hover:-translate-y-0.5 hover:border-[rgba(255,101,0,0.38)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
      />
    </div>
  );
}

export function HeroSection({ categories, districts }: HeroSectionProps) {
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
      <Container className="grid max-w-[1536px] gap-8 pb-24 pt-12 sm:pb-20 sm:pt-14 lg:min-h-[660px] lg:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-4 lg:pb-12 lg:pt-12 xl:gap-6">
        <motion.div
          className="premium-reveal relative z-20 min-w-0 lg:pl-8 xl:pl-10"
          initial={false}
        >
          <span className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-[rgba(255,101,0,0.22)] bg-white px-3 text-xs font-extrabold leading-5 text-[var(--brand-navy)] shadow-[var(--shadow-subtle)]">
            <Sparkles aria-hidden="true" className="size-4 shrink-0 text-[var(--brand-orange)]" />
            <span className="truncate">{homeCopy.hero.eyebrow}</span>
          </span>

          <h1 className="mt-5 max-w-[36rem] text-5xl font-extrabold leading-[0.98] text-[var(--brand-navy)] sm:text-6xl lg:text-[4rem] xl:text-[4.35rem]">
            Güven, doğru{" "}
            <span className="whitespace-nowrap">
              ustayla <span className="text-[var(--brand-orange)]">başlar.</span>
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base font-medium leading-7 text-[rgba(10,37,64,0.78)] sm:text-lg sm:leading-8">
            {homeCopy.hero.description}
          </p>

          <HeroSearch categories={categories} districts={districts} />

          <div
            className="mt-4 grid gap-3 sm:grid-cols-3"
            aria-label="Fuwu güven göstergeleri"
          >
            {homeCopy.hero.trustSignals.map((signal, index) => {
              const Icon = trustIcons[index] ?? BadgeCheck;

              return (
                <motion.div
                  className="flex min-h-[64px] min-w-0 items-center gap-3 rounded-lg border border-[rgba(10,37,64,0.08)] bg-white/92 px-4 py-3 shadow-[0_16px_42px_rgba(10,37,64,0.08)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_58px_rgba(10,37,64,0.13)]"
                  initial={false}
                  key={signal}
                  transition={{ delay: reduceMotion ? 0 : index * 0.04, duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
                  whileHover={reduceMotion ? undefined : { scale: 1.018, y: -4 }}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand-orange-soft)] text-[var(--brand-orange)] ring-1 ring-[rgba(255,101,0,0.16)]">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 text-sm font-extrabold leading-5 text-[var(--brand-navy)]">
                    {signal}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <HeroSceneShowcase />
      </Container>
    </motion.section>
  );
}
