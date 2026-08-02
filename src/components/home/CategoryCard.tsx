"use client";

import Link from "next/link";
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
  const target = resolveTarget(service);
  const assetPath = getHomeCategoryAssetPath(service.id);

  return (
    <Link
      aria-label={`${target.label} kategorisinde ustaları gör`}
      className="group relative flex h-[12.25rem] w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-lg border border-[rgba(10,37,64,0.08)] bg-white px-3 pb-3.5 pt-3 shadow-[0_18px_48px_rgba(10,37,64,0.10)] transition-all duration-300 hover:-translate-y-[3px] hover:border-[rgba(255,101,0,0.4)] hover:shadow-[0_28px_70px_rgba(10,37,64,0.16)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:h-[12.5rem]"
      href={target.href}
      key={service.id}
    >
      <HomeAssetImage
        alt={`${target.label} kategori görseli`}
        className="mx-auto h-[6.625rem] w-full shrink-0 rounded-[16px] bg-[linear-gradient(145deg,#ffffff_0%,#fffaf3_62%,#eef3f8_100%)] p-3 ring-1 ring-[rgba(10,37,64,0.06)] transition-transform duration-200 group-hover:scale-[1.025] sm:h-[7rem]"
        fallbackIconName={service.iconName}
        height={512}
        imageClassName="object-contain object-center"
        sizes="(min-width: 1280px) 150px, 176px"
        src={assetPath}
        width={512}
      />
      <span className="mt-auto min-w-0">
        <span className="block min-w-0 text-center text-[0.82rem] font-extrabold leading-5 text-[var(--brand-navy)] [hyphens:none] [overflow-wrap:normal] [text-wrap:balance] [word-break:normal] sm:text-[0.86rem]">
          {target.label}
        </span>
        <span className="mt-1 block min-w-0 text-center text-xs font-semibold leading-4 text-[var(--muted)] [hyphens:none] [overflow-wrap:normal] [word-break:normal]">
          {getCountLabel(providerCount)}
        </span>
      </span>
    </Link>
  );
}
