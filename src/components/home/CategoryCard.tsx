"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent } from "react";
import { HomeAssetImage } from "@/components/home/HomeAssetImage";
import {
  getServiceCategoryTargetById,
  type ServiceCategoryTarget,
} from "@/lib/constants/service-category-map";
import type { Service } from "@/lib/constants/services";
import { getHomeCategoryAssetPath } from "@/lib/home-assets";

type CategoryCardProps = {
  providerCount?: number;
  service: Service;
};

function isSpaceActivation(event: KeyboardEvent<HTMLAnchorElement>) {
  return event.key === " " || event.key === "Space" || event.key === "Spacebar";
}

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0;
}

function resolveTarget(service: Service): ServiceCategoryTarget {
  return (
    getServiceCategoryTargetById(service.id) ?? {
      ctaLabel: "Ustaları Gör",
      description: service.description,
      href: service.href,
      iconName: service.iconName,
      id: "all-services",
      label: service.title,
      slug: service.slug,
    }
  );
}

function getCountLabel(providerCount?: number) {
  if (typeof providerCount === "number" && providerCount > 0) {
    return `${providerCount.toLocaleString("tr-TR")} usta`;
  }

  return "Usta ara";
}

export function CategoryCard({ providerCount, service }: CategoryCardProps) {
  const router = useRouter();
  const target = resolveTarget(service);
  const assetPath = getHomeCategoryAssetPath(service.id);

  function handleKeyDown(event: KeyboardEvent<HTMLAnchorElement>) {
    if (isSpaceActivation(event)) {
      event.preventDefault();
      router.push(target.href);
    }
  }

  function handleKeyUp(event: KeyboardEvent<HTMLAnchorElement>) {
    if (isSpaceActivation(event)) {
      event.preventDefault();
      router.push(target.href);
    }
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (isModifiedClick(event)) {
      return;
    }

    event.preventDefault();
    router.push(target.href);
  }

  return (
    <a
      aria-label={`${target.label} kategorisinde ustalari gor`}
      className="group relative flex h-[11.25rem] w-full min-w-[10.75rem] cursor-pointer flex-col overflow-hidden rounded-lg border border-[rgba(10,37,64,0.08)] bg-white px-3.5 pb-3.5 pt-3 shadow-[0_18px_48px_rgba(10,37,64,0.10)] transition-all duration-300 hover:-translate-y-[3px] hover:border-[rgba(255,101,0,0.4)] hover:shadow-[0_28px_70px_rgba(10,37,64,0.16)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 xl:min-w-0"
      href={target.href}
      key={service.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <HomeAssetImage
        alt={`${target.label} kategori gorseli`}
        className="mx-auto h-[6.35rem] w-full max-w-[9rem] shrink-0 rounded-md transition-transform duration-200 group-hover:scale-[1.025]"
        height={512}
        imageClassName="object-contain object-center"
        sizes="(min-width: 1280px) 150px, 176px"
        src={assetPath}
        width={512}
      />
      <span className="mt-auto min-w-0">
        <span className="block min-w-0 text-center text-[clamp(0.76rem,0.72rem+0.18vw,0.86rem)] font-extrabold leading-5 text-[var(--brand-navy)] [overflow-wrap:anywhere] [text-wrap:balance]">
          {target.label}
        </span>
        <span className="mt-1 block min-w-0 text-center text-xs font-semibold leading-4 text-[var(--muted)] [overflow-wrap:anywhere]">
          {getCountLabel(providerCount)}
        </span>
      </span>
    </a>
  );
}
