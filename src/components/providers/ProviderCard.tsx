"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  Star,
} from "lucide-react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { ProviderTrustBadges } from "@/components/providers/ProviderTrustBadges";
import { appRoutes } from "@/lib/constants/navigation";
import {
  getProviderPhoneHref,
  getProviderWhatsAppHref,
} from "@/lib/constants/providers";
import { getServiceIconNameForCategory } from "@/lib/constants/services";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  trackPhoneClick,
  trackWhatsappClick,
} from "@/services/analytics";
import type { Provider } from "@/types/provider";

type ProviderCardProps = {
  provider: Provider;
  actionsId?: string;
  className?: string;
};

function createProviderFilterHref(
  searchParams: URLSearchParams,
  filterName: "category" | "district",
  value: string,
) {
  const nextParams = new URLSearchParams(searchParams.toString());
  nextParams.set(filterName, value);
  if (filterName === "category") nextParams.delete("service");
  if (filterName === "district") nextParams.delete("location");
  return `${appRoutes.providers}?${nextParams.toString()}`;
}

function getDisplayPriceRange(value: string | undefined) {
  const normalizedValue = value?.trim() ?? "";

  if (!normalizedValue) {
    return "Fiyat bilgisi yakında";
  }

  if (/\b(null|undefined|nan)\b/i.test(normalizedValue)) {
    return "Fiyat bilgisi yakında";
  }

  return normalizedValue;
}

export function ProviderCard({ provider, actionsId, className }: ProviderCardProps) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const currentSearchParams = new URLSearchParams(searchParams.toString());
  const profileHref = `${appRoutes.providers}/${provider.id}`;
  const priceRange = getDisplayPriceRange(provider.averagePrice);
  
  const analyticsPayload = {
    category: provider.category,
    district: provider.district,
    providerId: provider.id,
    source: provider.source,
  };

  const primaryActionClassName = "inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-1";

  const secondaryActionClassName = "inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--brand-navy)] transition-colors hover:bg-[var(--surface-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-1";
  const availabilityClassName =
    provider.availabilityStatus.tone === "green"
      ? "border-[rgba(23,116,95,0.2)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]"
      : provider.availabilityStatus.tone === "orange"
        ? "border-[rgba(255,138,0,0.24)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"
        : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--muted)]";

  return (
    <article
      aria-labelledby={`provider-${provider.id}-title`}
      className={cn(
        "flex h-full min-w-0 flex-col rounded-lg border border-[var(--border)] bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Link
          className="block min-w-0 truncate text-lg font-semibold text-[var(--brand-navy)] transition-colors hover:text-[var(--brand-orange)]"
          href={profileHref}
          id={`provider-${provider.id}-title`}
        >
          {provider.name || "İsimsiz Usta"}
        </Link>
        {typeof provider.rating === "number" && !isNaN(provider.rating) && provider.rating > 0 ? (
          <div className="flex shrink-0 items-center gap-1 rounded-md border border-yellow-100 bg-yellow-50 px-2 py-1 text-xs font-semibold text-yellow-700">
            <Star className="size-3.5 fill-current" />
            {provider.rating.toFixed(1)}
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 text-sm">
        <div className="flex min-w-0 flex-wrap gap-2">
          {provider.category ? (
            <Link
              className="inline-flex min-h-8 min-w-0 items-center gap-1.5 rounded-md bg-[var(--surface-soft)] px-2.5 text-xs font-semibold text-[var(--brand-navy)] transition-colors hover:bg-[#E5E7EB]"
              href={createProviderFilterHref(currentSearchParams, "category", provider.category)}
            >
              <ServiceIcon
                className="size-3.5 shrink-0 text-[var(--brand-orange)]"
                name={getServiceIconNameForCategory(provider.category)}
              />
              <span className="truncate">{provider.category}</span>
            </Link>
          ) : null}
          {provider.district ? (
            <Link
              className="inline-flex min-h-8 min-w-0 items-center gap-1 rounded-md bg-[var(--surface-soft)] px-2.5 text-xs font-semibold text-[var(--brand-navy)] transition-colors hover:bg-[#E5E7EB]"
              href={createProviderFilterHref(currentSearchParams, "district", provider.district)}
            >
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{provider.district}</span>
            </Link>
          ) : null}
        </div>

        <ProviderTrustBadges badges={provider.trustBadges} limit={3} />

        <div className="grid gap-2 sm:grid-cols-2">
          <div className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs font-bold ${availabilityClassName}`}>
            <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{provider.availabilityStatus.label}</span>
          </div>
          <div className="inline-flex min-h-9 items-center rounded-md bg-[#FAFAFA] px-3 text-xs font-bold text-[var(--brand-navy)] ring-1 ring-[rgba(13,20,36,0.06)]">
            <span className="truncate">{provider.responseTime}</span>
          </div>
        </div>

        <div className="rounded-md bg-[#FAFAFA] px-3 py-2">
          <span className="block text-xs font-semibold uppercase text-[var(--muted)]">
            {t("providerCard.priceRange")}
          </span>
          <span className="mt-0.5 block text-sm font-semibold text-[var(--brand-navy)]">
            {priceRange}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2" id={actionsId}>
        {provider.whatsapp ? (
          <a
            className={primaryActionClassName}
            href={getProviderWhatsAppHref(provider)}
            onClick={() => trackWhatsappClick(analyticsPayload)}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageCircle className="size-4 shrink-0" />
            <span>WhatsApp</span>
          </a>
        ) : null}
        {provider.phone ? (
          <a
            className={secondaryActionClassName}
            href={getProviderPhoneHref(provider)}
            onClick={() => trackPhoneClick(analyticsPayload)}
          >
            <Phone className="size-4 shrink-0" />
            <span>Telefon</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}
