"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import {
  getServiceCategoryTargetById,
  type ServiceCategoryTarget,
} from "@/lib/constants/service-category-map";
import type { Service, ServiceIconName } from "@/lib/constants/services";

type CategoryCardProps = {
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

export function CategoryCard({ service, visual }: CategoryCardProps) {
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
      className="group flex min-h-[13rem] cursor-pointer flex-col rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 shadow-[var(--shadow-subtle)] transition-all duration-200 hover:-translate-y-1 hover:border-[rgba(249,115,22,0.38)] hover:bg-white hover:shadow-[var(--shadow-card)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
      href={target.href}
      key={service.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <span
        className="relative flex size-14 shrink-0 items-center justify-center rounded-lg bg-white shadow-[var(--shadow-subtle)] ring-1 ring-[rgba(20,33,61,0.08)] transition-transform duration-200 group-hover:[transform:perspective(480px)_rotateX(8deg)_rotateY(-10deg)_translateY(-2px)]"
        style={{ color: visual.accent }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-2 rounded-md opacity-[0.12]"
          style={{ backgroundColor: visual.accent }}
        />
        <ServiceIcon className="relative z-10 size-7" name={visual.iconName} />
      </span>
      <span className="mt-5 text-xs font-bold uppercase leading-4 text-[var(--brand-orange-dark)]">
        {service.category}
      </span>
      <h3 className="mt-2 text-xl font-extrabold leading-tight text-[var(--brand-navy)]">
        {service.title}
      </h3>
      <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-[var(--muted)]">
        {service.description}
      </p>
      <span className="mt-auto flex items-center gap-2 pt-5 text-sm font-bold text-[var(--brand-navy)]">
        {target.ctaLabel}
        <ArrowRight
          aria-hidden="true"
          className="size-4 text-[var(--brand-orange)] transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </a>
  );
}
