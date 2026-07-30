"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { BadgeCheck, MousePointerClick, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useMemo, useState } from "react";
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
  "climate-appliance-service": "right-[14%] top-[13%]",
  "furniture-assembly": "right-[2%] top-[58%]",
  cleaning: "left-[20%] top-[58%]",
  electrical: "left-[12%] top-[14%]",
  locksmith: "left-[45%] top-[70%]",
  painting: "right-[2%] top-[36%]",
  plumbing: "left-[8%] top-[36%]",
};

const sceneLineCoordinates: Partial<Record<ServiceCategoryMapKey, [number, number, number, number]>> = {
  "climate-appliance-service": [73, 21, 57, 32],
  "furniture-assembly": [84, 62, 63, 52],
  cleaning: [28, 63, 47, 52],
  electrical: [21, 21, 43, 31],
  locksmith: [51, 73, 53, 56],
  painting: [84, 41, 63, 42],
  plumbing: [18, 41, 40, 42],
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
        "group absolute z-20 hidden min-h-12 min-w-0 cursor-pointer items-center gap-2 rounded-full border border-white/80 bg-white/88 p-1.5 pr-3 text-xs font-extrabold text-[var(--brand-navy)] shadow-[0_14px_36px_rgba(10,37,64,0.12)] backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-[rgba(255,101,0,0.38)] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:inline-flex",
        sceneNodeClassNames[target.id] ?? getFallbackNodeClassName(index),
        isActive ? "border-[rgba(255,101,0,0.52)] bg-white shadow-[var(--shadow-elevated)]" : "",
      )}
      href={target.href}
      onFocus={() => onActivate(target)}
      onMouseEnter={() => onActivate(target)}
      style={{ animationDelay: `${index * 110}ms` }}
    >
      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-full border border-[rgba(10,37,64,0.08)] bg-white text-[var(--brand-orange)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_22px_rgba(10,37,64,0.12)] transition-transform duration-200 group-hover:scale-105",
          isActive ? "scale-110 ring-4 ring-[rgba(255,101,0,0.14)]" : "",
        )}
      >
        <ServiceIcon className="size-6" name={target.iconName ?? "wrench"} />
      </span>
      <span className="max-w-[9.75rem] truncate">{target.label}</span>
    </Link>
  );
}

function SceneConnectorLines({ activeServiceId }: { activeServiceId: ServiceCategoryMapKey }) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full overflow-visible sm:block"
      preserveAspectRatio="none"
      viewBox="0 0 100 78"
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
    <div className="absolute inset-x-4 bottom-4 z-30 rounded-lg border border-white/10 bg-[var(--brand-navy-deep)] p-4 text-white shadow-[0_22px_54px_rgba(7,24,47,0.24)] sm:inset-x-auto sm:bottom-[16%] sm:right-[20%] sm:w-64">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-extrabold leading-6 text-white">{target.label}</h3>
          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-white/76">
            {target.description}
          </p>
        </div>
        <ServiceIcon
          className="size-5 shrink-0 text-[var(--brand-orange)]"
          name={target.iconName ?? "wrench"}
        />
      </div>
      <Link
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--brand-orange)] px-4 text-xs font-extrabold text-white shadow-[var(--shadow-action)] transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 focus:ring-offset-[var(--brand-navy-deep)]"
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

  return (
    <div
      className="relative mx-auto min-h-[420px] w-full max-w-[880px] overflow-visible lg:min-h-[500px] xl:min-h-[560px]"
      onMouseLeave={() => setActiveServiceId("locksmith")}
    >
      <div
        aria-hidden="true"
        className="premium-hero-ambient absolute inset-x-[2%] bottom-[8%] top-[4%] rounded-[999px] opacity-95"
      />
      <span className="premium-orbit-ring left-[8%] top-[16%] h-[62%] w-[86%]" aria-hidden="true" />
      <span
        className="premium-orbit-ring left-[18%] top-[24%] h-[42%] w-[64%]"
        aria-hidden="true"
        style={{ animationDelay: "900ms" }}
      />
      <div className="absolute inset-x-[8%] bottom-[12%] h-[36%] rounded-[50%] bg-[linear-gradient(180deg,#ffffff_0%,#eef3fa_100%)] shadow-[0_34px_80px_rgba(10,37,64,0.16)] ring-1 ring-[rgba(10,37,64,0.06)]" />

      <SceneConnectorLines activeServiceId={activeServiceId} />

      <div className="absolute inset-x-[12%] bottom-[17%] top-[10%] z-10 overflow-visible sm:inset-x-[16%] sm:top-[6%]">
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

      <p className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 text-center text-sm font-semibold leading-6 text-[var(--muted)]">
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
  return (
    <section className="relative isolate overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_54%,#ffffff_100%)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(10,37,64,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(10,37,64,.04) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <Container className="grid max-w-[1536px] gap-8 pb-20 pt-10 sm:pb-16 sm:pt-14 lg:grid-cols-[minmax(400px,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-6 xl:pt-16">
        <div className="relative z-20 min-w-0 lg:pl-8">
          <span className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-[rgba(255,101,0,0.22)] bg-white px-3 text-xs font-extrabold leading-5 text-[var(--brand-navy)] shadow-[var(--shadow-subtle)]">
            <Sparkles aria-hidden="true" className="size-4 shrink-0 text-[var(--brand-orange)]" />
            <span className="truncate">{homeCopy.hero.eyebrow}</span>
          </span>

          <h1 className="mt-5 max-w-[43rem] text-5xl font-extrabold leading-[0.98] text-[var(--brand-navy)] sm:text-6xl lg:text-[4.1rem] xl:text-[4.55rem]">
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
                <div
                  className="flex min-h-[58px] min-w-0 items-center gap-3 rounded-lg border border-[rgba(10,37,64,0.08)] bg-white/86 px-4 py-3 shadow-[var(--shadow-subtle)] backdrop-blur-sm"
                  key={signal}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand-orange-soft)] text-[var(--brand-orange)] ring-1 ring-[rgba(255,101,0,0.16)]">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 text-sm font-extrabold leading-5 text-[var(--brand-navy)]">
                    {signal}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <HeroSceneShowcase />
      </Container>
    </section>
  );
}
