"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent } from "react";
import { ThreeDIcon } from "@/components/ui/ThreeDIcon";
import {
  getServiceCategoryTargetById,
  type ServiceCategoryTarget,
} from "@/lib/constants/service-category-map";
import type { Service, ServiceIconName } from "@/lib/constants/services";

type CategoryCardProps = {
  providerCount?: number;
  service: Service;
  visual: {
    accent: string;
    iconName: ServiceIconName;
  };
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

export function CategoryCard({ providerCount, service, visual }: CategoryCardProps) {
  const router = useRouter();
  const target = resolveTarget(service);

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
      aria-label={`${target.label} kategorisinde ustaları gör`}
      className="group relative flex min-h-[9.25rem] w-full min-w-[10rem] cursor-pointer flex-col overflow-hidden rounded-lg border border-[rgba(10,37,64,0.08)] bg-white px-4 pb-4 pt-3 shadow-[0_18px_48px_rgba(10,37,64,0.10)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[rgba(255,101,0,0.4)] hover:shadow-[0_28px_70px_rgba(10,37,64,0.16)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 xl:min-w-0"
      href={target.href}
      key={service.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <span
        aria-hidden="true"
        className="absolute -right-8 -top-9 size-24 rounded-full opacity-10"
        style={{ backgroundColor: visual.accent }}
      />
      <ThreeDIcon
        accent={visual.accent}
        className="premium-3d-float mx-auto mt-1 transition-transform duration-200 group-hover:scale-105"
        name={visual.iconName}
        size="sm"
      />
      <span className="mt-auto min-w-0">
        <span className="block truncate text-sm font-extrabold leading-5 text-[var(--brand-navy)]">
          {target.label}
        </span>
        <span className="mt-1 block truncate text-xs font-semibold leading-4 text-[var(--muted)]">
          {getCountLabel(providerCount)}
        </span>
      </span>
    </a>
  );
}
