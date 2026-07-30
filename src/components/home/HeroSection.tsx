"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Search, ShieldCheck, UserRoundPlus } from "lucide-react";
import { HeroSearch } from "@/components/home/HeroSearch";
import { SceneFallback } from "@/components/three/SceneFallback";
import { SceneServiceLinks } from "@/components/three/SceneServiceLinks";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { appRoutes } from "@/lib/constants/navigation";
import { homeCopy } from "@/lib/constants/home";
import type { Service } from "@/lib/constants/services";

const FuwuHeroScene = dynamic(
  () => import("@/components/three/FuwuHeroScene").then((mod) => mod.FuwuHeroScene),
  {
    loading: () => <SceneFallback />,
    ssr: false,
  },
);

type HomeMetric = {
  label: string;
  value: string;
};

type HeroSectionProps = {
  categories: string[];
  districts: string[];
  metrics: HomeMetric[];
  popularServices: readonly Service[];
};

export function HeroSection({
  categories,
  districts,
  metrics,
  popularServices,
}: HeroSectionProps) {
  return (
    <section className="relative isolate overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#fff7ed_0%,var(--background)_46%,#ffffff_100%)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(rgba(20,33,61,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(20,33,61,.05) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <Container className="grid max-w-[1440px] gap-9 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.04fr)_minmax(320px,0.86fr)] lg:items-center lg:gap-12 xl:py-16">
        <div className="min-w-0">
          <span className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-[rgba(249,115,22,0.28)] bg-white px-3 text-xs font-bold uppercase leading-5 text-[var(--brand-orange-dark)] shadow-[var(--shadow-subtle)]">
            <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{homeCopy.hero.eyebrow}</span>
          </span>

          <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-[1.05] text-[var(--brand-navy)] sm:text-5xl lg:text-6xl xl:text-7xl">
            {homeCopy.hero.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            {homeCopy.hero.description}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button className="h-12 min-h-12 gap-2 rounded-full px-6" href={appRoutes.providers}>
              <Search aria-hidden="true" className="size-4" />
              {homeCopy.hero.primaryCta}
            </Button>
            <Button
              className="h-12 min-h-12 gap-2 rounded-full border border-[rgba(20,33,61,0.12)] bg-white px-6 shadow-[var(--shadow-subtle)] ring-0 hover:bg-[var(--brand-orange-soft)]"
              href={appRoutes.providerApplication}
              variant="secondary"
            >
              <UserRoundPlus aria-hidden="true" className="size-4" />
              {homeCopy.hero.secondaryCta}
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2" aria-label="Fuwu güven göstergeleri">
            {homeCopy.hero.trustSignals.map((signal) => (
              <span
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[rgba(20,33,61,0.09)] bg-white px-3 text-sm font-semibold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)]"
                key={signal}
              >
                <BadgeCheck aria-hidden="true" className="size-4 text-[var(--trust-green)]" />
                {signal}
              </span>
            ))}
          </div>

          <HeroSearch
            categories={categories}
            districts={districts}
            popularServices={popularServices}
          />
        </div>

        <div className="min-w-0">
          <div className="relative mx-auto aspect-[1.04/1] w-full max-w-[560px] overflow-hidden rounded-lg border border-[rgba(20,33,61,0.08)] bg-[linear-gradient(145deg,#ffffff_0%,#fff8ef_48%,#eaf0f7_100%)] shadow-[var(--shadow-premium)]">
            <FuwuHeroScene />
          </div>
          <p className="mx-auto mt-3 max-w-[560px] text-center text-sm font-bold leading-6 text-[var(--brand-navy)]">
            Evin üzerindeki hizmet alanlarına dokun, ilgili ustaları gör.
          </p>
          <SceneServiceLinks
            className="mx-auto mt-3 flex max-w-[560px] gap-2 overflow-x-auto pb-1"
            linkClassName="inline-flex min-h-10 shrink-0 items-center rounded-md border border-[rgba(20,33,61,0.1)] bg-white px-3 text-xs font-bold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-all hover:-translate-y-0.5 hover:border-[rgba(249,115,22,0.38)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
          />
          <div className="mx-auto mt-4 grid max-w-[560px] grid-cols-3 overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-[var(--shadow-subtle)]">
            {metrics.map((metric) => (
              <Link
                className="group min-w-0 border-r border-[var(--border)] px-3 py-3 transition-colors last:border-r-0 hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--brand-orange)] sm:px-4"
                href={appRoutes.providers}
                key={metric.label}
              >
                <span className="block truncate text-xl font-extrabold leading-none text-[var(--brand-navy)] sm:text-2xl">
                  {metric.value}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-xs font-bold leading-4 text-[var(--muted)]">
                  <span className="truncate">{metric.label}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-3 shrink-0 text-[var(--brand-orange)] opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
