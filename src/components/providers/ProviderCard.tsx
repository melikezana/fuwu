"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock3, Coins, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { ProviderContactLink } from "@/components/providers/ProviderAnalytics";
import { ProviderAvatar } from "@/components/providers/ProviderAvatar";
import { ProviderTrustBadges } from "@/components/providers/ProviderTrustBadges";
import { appRoutes } from "@/lib/constants/navigation";
import { getServiceIconNameForCategory } from "@/lib/constants/services";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
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

  if (!normalizedValue || /\b(null|undefined|nan)\b/i.test(normalizedValue)) {
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
  const hasWhatsApp = Boolean(provider.whatsapp?.trim());
  const hasPhone = Boolean(provider.phone?.trim());
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
        "flex h-full min-w-0 flex-col rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,138,0,0.28)] hover:shadow-[var(--shadow-elevated)] sm:p-5",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <ProviderAvatar provider={provider} variant="card" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                className="block min-w-0 truncate text-lg font-semibold text-[var(--brand-navy)] transition-colors hover:text-[var(--brand-orange)]"
                href={profileHref}
                id={`provider-${provider.id}-title`}
              >
                {provider.name || "İsimsiz Usta"}
              </Link>
              <p className="mt-1 truncate text-xs font-medium text-[var(--muted)]">
                {provider.category}
              </p>
            </div>
            {typeof provider.rating === "number" &&
            Number.isFinite(provider.rating) &&
            provider.rating > 0 ? (
              <div className="flex shrink-0 items-center gap-1 rounded-md border border-yellow-100 bg-yellow-50 px-2 py-1 text-xs font-semibold text-yellow-700">
                <Star className="size-3.5 fill-current" />
                {provider.rating.toFixed(1)}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm">
        <div className="flex min-w-0 flex-wrap gap-2">
          {provider.category ? (
            <Link
              className="inline-flex min-h-8 min-w-0 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 text-xs font-medium text-[var(--brand-navy)] transition-colors hover:border-[rgba(255,138,0,0.36)] hover:bg-[var(--brand-orange-soft)]"
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
              className="inline-flex min-h-8 min-w-0 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 text-xs font-medium text-[var(--brand-navy)] transition-colors hover:border-[rgba(255,138,0,0.36)] hover:bg-[var(--brand-orange-soft)]"
              href={createProviderFilterHref(currentSearchParams, "district", provider.district)}
            >
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{provider.district}</span>
            </Link>
          ) : null}
        </div>

        <ProviderTrustBadges badges={provider.trustBadges} limit={3} />

        <div className="grid grid-cols-2 divide-x divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[#FAFAFA]">
          <div className="flex min-w-0 items-center gap-2 px-3 py-2.5">
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-md border ${availabilityClassName}`}
            >
              <Clock3 className="size-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-[var(--brand-navy)]">
                {provider.availabilityStatus.label}
              </span>
              <span className="mt-0.5 block text-[0.68rem] font-medium text-[var(--muted)]">
                Müsaitlik
              </span>
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2 px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
              <Coins className="size-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-[var(--brand-navy)]">
                {priceRange}
              </span>
              <span className="mt-0.5 block text-[0.68rem] font-medium text-[var(--muted)]">
                {t("providerCard.priceRange")}
              </span>
            </span>
          </div>
        </div>

        <p className="text-xs font-medium text-[var(--muted)]">{provider.responseTime}</p>
      </div>

      {hasWhatsApp || hasPhone ? (
        <div
          className={cn(
            "mt-auto grid gap-2 pt-4",
            hasWhatsApp && hasPhone ? "grid-cols-2" : "grid-cols-1",
          )}
          id={actionsId}
        >
          {hasWhatsApp ? (
            <ProviderContactLink
              className="w-full gap-2 px-3"
              kind="whatsapp"
              provider={provider}
              rel="noopener noreferrer"
              target="_blank"
            >
              <MessageCircle className="size-4 shrink-0" />
              <span>WhatsApp</span>
            </ProviderContactLink>
          ) : null}
          {hasPhone ? (
            <ProviderContactLink
              className="w-full gap-2 px-3"
              kind="phone"
              provider={provider}
            >
              <Phone className="size-4 shrink-0" />
              <span>Telefon</span>
            </ProviderContactLink>
          ) : null}
        </div>
      ) : (
        <p className="mt-auto pt-4 text-sm font-medium text-[var(--muted)]">
          İletişim bilgisi yakında eklenecek.
        </p>
      )}
    </article>
  );
}
