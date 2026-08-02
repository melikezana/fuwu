"use client";

import Link from "next/link";
import { BadgeCheck, MousePointerClick, ShieldCheck, Sparkles, Star } from "lucide-react";
import { motion, useReducedMotion as useMotionReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { HomeAssetImage } from "@/components/home/HomeAssetImage";
import { HeroSearch } from "@/components/home/HeroSearch";
import { SceneServiceLinks } from "@/components/home/SceneServiceLinks";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { Container } from "@/components/ui/Container";
import { homeCopy } from "@/lib/constants/home";
import {
  getServiceCategoryTarget,
  sceneServiceTargets,
  type ServiceCategoryMapKey,
  type ServiceCategoryTarget,
} from "@/lib/constants/service-category-map";
import { homeAssets } from "@/lib/home-assets";
import { cn } from "@/lib/utils";

type HeroSectionProps = {
  categories: string[];
  districts: string[];
};

const trustIcons = [ShieldCheck, Star, BadgeCheck] as const;

const sceneNodeClassNames: Partial<Record<ServiceCategoryMapKey, string>> = {
  "climate-appliance-service": "right-[6%] top-[13%]",
  "furniture-assembly": "right-[0%] top-[58%]",
  cleaning: "left-[13%] top-[61%]",
  electrical: "left-[10%] top-[13%]",
  locksmith: "left-[43%] top-[73%]",
  painting: "right-[0%] top-[37%]",
  plumbing: "left-[4%] top-[37%]",
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
  "climate-appliance-service": [76, 19, 60, 31],
  "furniture-assembly": [88, 63, 65, 55],
  cleaning: [25, 66, 45, 56],
  electrical: [20, 20, 42, 31],
  locksmith: [52, 77, 53, 59],
  painting: [88, 43, 65, 45],
  plumbing: [17, 43, 39, 45],
};

const heroVisualAssets = [
  {
    className: "left-[9%] top-[18%] h-[28%] w-[26%]",
    src: homeAssets.categories.electrical,
  },
  {
    className: "right-[10%] top-[14%] h-[29%] w-[27%]",
    src: homeAssets.categories.ac,
  },
  {
    className: "left-[13%] bottom-[17%] h-[31%] w-[29%]",
    src: homeAssets.categories.cleaning,
  },
  {
    className: "right-[8%] bottom-[15%] h-[31%] w-[30%]",
    src: homeAssets.categories.plumbing,
  },
  {
    className: "left-[38%] top-[26%] h-[28%] w-[25%]",
    src: homeAssets.categories.locksmith,
  },
  {
    className: "left-[38%] bottom-[10%] h-[28%] w-[26%]",
    src: homeAssets.categories.painting,
  },
] as const;

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
        "home-scene-node group absolute z-30 hidden min-h-[3.4rem] max-w-[11rem] min-w-0 cursor-pointer items-center gap-2 rounded-full border border-white bg-white/94 p-1.5 pr-3 text-xs font-extrabold text-[var(--brand-navy)] shadow-[0_18px_42px_rgba(10,37,64,0.13)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-[3px] hover:border-[rgba(255,101,0,0.42)] hover:bg-white hover:shadow-[0_24px_54px_rgba(10,37,64,0.17)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:inline-flex",
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
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-full border border-[rgba(10,37,64,0.08)] bg-white text-[var(--brand-orange)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_26px_rgba(10,37,64,0.13)] transition-transform duration-300 group-hover:scale-105",
          isActive ? "scale-105 ring-4 ring-[rgba(255,101,0,0.14)]" : "",
        )}
      >
        <ServiceIcon className="size-6" name={target.iconName ?? "wrench"} />
      </span>
      <span className="max-w-[8rem] truncate">{target.label}</span>
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
    <div className="absolute inset-x-5 bottom-[7%] z-40 rounded-lg border border-white/10 bg-[rgba(10,37,64,0.92)] p-4 text-white shadow-[0_26px_70px_rgba(10,37,64,0.24)] backdrop-blur-xl sm:inset-x-auto sm:bottom-[10%] sm:right-[23%] sm:w-[17rem]">
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
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--brand-orange)] px-4 text-xs font-extrabold text-white shadow-[var(--shadow-action)] transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
        href={target.href}
      >
        {target.ctaLabel}
      </Link>
    </div>
  );
}

function HeroStaticHomeVisual() {
  return (
    <div
      aria-label="Fuwu hizmet kategorileri görseli"
      className="relative h-full min-h-[320px] w-full select-none overflow-hidden"
      role="img"
    >
      <span className="absolute inset-x-[10%] bottom-[8%] h-[30%] rounded-[50%] bg-white shadow-[0_34px_88px_rgba(10,37,64,0.14)] ring-1 ring-[rgba(10,37,64,0.06)]" />
      <span className="absolute left-1/2 top-[14%] h-[65%] w-[64%] -translate-x-1/2 rounded-[1.75rem] border border-white bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_60%,#fff4ea_100%)] shadow-[0_34px_88px_rgba(10,37,64,0.13)] ring-1 ring-[rgba(10,37,64,0.06)]" />
      <span className="absolute left-1/2 top-[5%] h-[18%] w-[70%] -translate-x-1/2 skew-x-[-15deg] rounded-t-[1.75rem] bg-[linear-gradient(135deg,#07182f_0%,#0a2540_72%,#183b63_100%)] shadow-[0_20px_52px_rgba(10,37,64,0.18)]" />
      <span className="absolute left-[58%] top-[1%] h-[15%] w-[7%] rounded-sm bg-[linear-gradient(180deg,#ffffff_0%,#dde5ee_100%)] shadow-[0_10px_24px_rgba(10,37,64,0.12)]" />
      {heroVisualAssets.map((asset) => (
        <span className={cn("absolute z-20", asset.className)} key={asset.className}>
          <HomeAssetImage
            alt=""
            className="h-full w-full rounded-md"
            height={512}
            imageClassName="object-contain object-center"
            priority
            sizes="(min-width: 1024px) 180px, 28vw"
            src={asset.src}
            width={512}
          />
        </span>
      ))}
    </div>
  );
}

function HeroSceneShowcase({ className }: { className?: string }) {
  const [activeServiceId, setActiveServiceId] =
    useState<ServiceCategoryMapKey>("locksmith");
  const activeTarget = useMemo(() => getServiceCategoryTarget(activeServiceId), [activeServiceId]);

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

      <SceneConnectorLines activeServiceId={activeServiceId} />

      <div className="absolute inset-x-[4%] bottom-[13%] top-[2%] z-10 overflow-visible sm:inset-x-[7%] lg:inset-x-[5%]">
        <HeroStaticHomeVisual />
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
        linkClassName="inline-flex min-h-11 shrink-0 items-center rounded-md border border-[rgba(10,37,64,0.1)] bg-white px-3 text-xs font-bold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-all hover:-translate-y-0.5 hover:border-[rgba(255,101,0,0.38)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
      />
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
