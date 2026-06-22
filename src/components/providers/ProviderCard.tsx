"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Clock3,
  Coins,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Timer,
  UserRoundSearch,
} from "lucide-react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { ProviderContactLink } from "@/components/providers/ProviderAnalytics";
import { ProviderAvatar } from "@/components/providers/ProviderAvatar";
import { ProviderTrustBadges } from "@/components/providers/ProviderTrustBadges";
import { Button } from "@/components/ui/Button";
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

export function ProviderCard({
  provider,
  actionsId,
  className,
}: ProviderCardProps) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const currentSearchParams = new URLSearchParams(searchParams.toString());
  const profileHref = `${appRoutes.providers}/${provider.id}`;
  const priceRange = getDisplayPriceRange(provider.averagePrice);
  const hasWhatsApp = Boolean(provider.whatsapp?.trim());
  const hasPhone = Boolean(provider.phone?.trim());
  const hasBothContactMethods = hasWhatsApp && hasPhone;
  const hasContactMethod = hasWhatsApp || hasPhone;
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
        "group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[rgba(13,20,36,0.09)] bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(255,138,0,0.34)] hover:shadow-[var(--shadow-premium)] sm:p-6",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--brand-orange),#ffb457,transparent)] opacity-80"
      />

      <div className="flex min-w-0 items-start gap-4">
        <ProviderAvatar provider={provider} variant="card" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <Button
                className="min-w-0 break-words text-left text-xl font-bold leading-6 text-[var(--brand-navy)] transition-colors hover:text-[var(--brand-orange-dark)]"
                href={profileHref}
                id={`provider-${provider.id}-title`}
                title={provider.name || "İsimsiz Usta"}
                variant="plain"
              >
                {provider.name || "İsimsiz Usta"}
              </Button>
            </div>
            {typeof provider.rating === "number" &&
            Number.isFinite(provider.rating) &&
            provider.rating > 0 ? (
              <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700">
                <Star className="size-3.5 fill-current" />
                {provider.rating.toFixed(1)}
              </div>
            ) : null}
          </div>
          {provider.shortDescription?.trim() ? (
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-5 text-[var(--muted)]">
              {provider.shortDescription}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <div className="flex min-w-0 flex-wrap gap-2">
          {provider.category ? (
            <Link
              className="inline-flex min-h-9 min-w-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-navy)] transition-colors hover:border-[rgba(255,138,0,0.4)] hover:bg-[var(--brand-orange-soft)]"
              href={createProviderFilterHref(
                currentSearchParams,
                "category",
                provider.category,
              )}
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
              className="inline-flex min-h-9 min-w-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-navy)] transition-colors hover:border-[rgba(255,138,0,0.4)] hover:bg-[var(--brand-orange-soft)]"
              href={createProviderFilterHref(
                currentSearchParams,
                "district",
                provider.district,
              )}
            >
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{provider.district}</span>
            </Link>
          ) : null}
        </div>

        <ProviderTrustBadges badges={provider.trustBadges} limit={3} />

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--border)] bg-[#FAFAFA] p-3.5">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg border ${availabilityClassName}`}
            >
              <Clock3 className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                Müsaitlik
              </span>
              <span className="mt-1 block break-words text-sm font-bold leading-5 text-[var(--brand-navy)]">
                {provider.availabilityStatus.label}
              </span>
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--border)] bg-[#FAFAFA] p-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--brand-navy)] ring-1 ring-[var(--border)]">
              <Timer className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                Yanıt süresi
              </span>
              <span className="mt-1 block break-words text-sm font-bold leading-5 text-[var(--brand-navy)]">
                {provider.responseTime.replace(/^Ortalama cevap:\s*/i, "")}
              </span>
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[rgba(255,138,0,0.2)] bg-[var(--brand-orange-soft)] p-3.5 sm:col-span-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--brand-orange-dark)] shadow-[var(--shadow-subtle)] ring-1 ring-[rgba(255,138,0,0.16)]">
              <Coins className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--brand-orange-dark)]">
                {t("providerCard.priceRange")}
              </span>
              <span className="mt-1 block break-words text-sm font-bold leading-5 text-[var(--brand-navy)]">
                {priceRange}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div
        className="mt-auto grid grid-cols-2 gap-2 pt-5"
        id={actionsId}
      >
        {hasWhatsApp ? (
          <ProviderContactLink
            className="h-11 min-h-11 w-full gap-2 whitespace-nowrap px-3 text-xs sm:text-sm"
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
            className="h-11 min-h-11 w-full gap-2 whitespace-nowrap px-3 text-xs sm:text-sm"
            kind="phone"
            provider={provider}
          >
            <Phone className="size-4 shrink-0" />
            <span>Telefon</span>
          </ProviderContactLink>
        ) : null}
        <Button
          className={cn(
            "h-11 min-h-11 w-full gap-2 whitespace-nowrap px-3 text-xs sm:text-sm",
            hasBothContactMethods || !hasContactMethod ? "col-span-2" : undefined,
          )}
          href={profileHref}
          variant={hasContactMethod ? "secondary" : "primary"}
        >
          <UserRoundSearch className="size-4 shrink-0" />
          <span>Profili Gör</span>
        </Button>
      </div>
    </article>
  );
}
