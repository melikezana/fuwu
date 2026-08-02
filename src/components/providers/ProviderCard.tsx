"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Clock3,
  Coins,
  Eye,
  MapPin,
  Star,
  Timer,
  UserRoundSearch,
  X,
} from "lucide-react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { ProviderAvatar } from "@/components/providers/ProviderAvatar";
import { ProviderTrustBadges } from "@/components/providers/ProviderTrustBadges";
import { Button } from "@/components/ui/Button";
import { ThreeDIcon } from "@/components/ui/ThreeDIcon";
import { appRoutes } from "@/lib/constants/navigation";
import {
  getServiceFilterValue,
  getServiceIconNameForCategory,
} from "@/lib/constants/services";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Provider } from "@/types/provider";

type ProviderCardProps = {
  provider: Provider;
  actionsId?: string;
  className?: string;
  featured?: boolean;
  galleryPreviewUrl?: string;
};

function createProviderFilterHref(
  searchParams: URLSearchParams,
  filterName: "category" | "district",
  value: string,
) {
  const nextParams = new URLSearchParams(searchParams.toString());
  nextParams.set(filterName, filterName === "category" ? getServiceFilterValue(value) : value);
  if (filterName === "category") nextParams.delete("service");
  if (filterName === "district") nextParams.delete("location");
  return `${appRoutes.providers}?${nextParams.toString()}`;
}

function getDisplayPriceRange(value: string | undefined) {
  const normalizedValue = value?.trim() ?? "";
  const normalizedLowerValue = normalizedValue.toLocaleLowerCase("tr");

  if (
    !normalizedValue ||
    /\b(null|undefined|nan)\b/i.test(normalizedValue) ||
    normalizedLowerValue.includes("fiyat bilgisi") ||
    normalizedLowerValue === "yakında"
  ) {
    return "Bilgi yok";
  }

  return normalizedValue;
}

function getDisplayAvailabilityLabel(value: string | undefined) {
  const normalizedValue = value?.trim() ?? "";

  if (!normalizedValue) {
    return "Bilgi yok";
  }

  return normalizedValue === "Müsait" ? "Şu anda müsait" : normalizedValue;
}

function getDisplayResponseTime(value: string | undefined) {
  const normalizedValue = value?.replace(/^Ortalama cevap:\s*/i, "").trim() ?? "";
  const normalizedLowerValue = normalizedValue.toLocaleLowerCase("tr");

  if (
    !normalizedValue ||
    /\b(null|undefined|nan)\b/i.test(normalizedValue) ||
    normalizedLowerValue === "yeni usta"
  ) {
    return "Bilgi yok";
  }

  const minutesMatch = normalizedValue.match(/^(\d+)\s*dk\.?$/i);

  if (minutesMatch) {
    return `${minutesMatch[1]} dakika`;
  }

  return normalizedValue;
}

function createProviderRequestHref(provider: Provider) {
  const params = new URLSearchParams();

  if (provider.category) {
    params.set("service", provider.category);
  }

  if (provider.district) {
    params.set("district", provider.district);
  }

  const queryString = params.toString();

  return queryString ? `${appRoutes.request}?${queryString}` : appRoutes.request;
}

function ProviderObjectButton({
  isOpen,
  onClick,
  serviceIconName,
}: {
  isOpen: boolean;
  onClick: () => void;
  serviceIconName: ReturnType<typeof getServiceIconNameForCategory>;
}) {
  return (
    <button
      aria-expanded={isOpen}
      aria-label="Meslek detaylarını aç"
      className="group inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-[14px] border border-[rgba(10,37,64,0.08)] bg-white/92 shadow-[var(--shadow-subtle)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,101,0,0.36)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
      onClick={onClick}
      type="button"
    >
      <ThreeDIcon
        accent="var(--brand-orange)"
        className="scale-[0.62] transition-transform duration-200 group-hover:scale-[0.7]"
        name={serviceIconName}
        size="sm"
      />
    </button>
  );
}

function ProviderQuickView({
  onClose,
  priceRange,
  profileHref,
  provider,
  requestHref,
}: {
  onClose: () => void;
  priceRange: string;
  profileHref: string;
  provider: Provider;
  requestHref: string;
}) {
  const hasRating = Number.isFinite(provider.rating) && provider.rating > 0;
  const hasPrice = priceRange !== "Bilgi yok";
  const availabilityLabel = getDisplayAvailabilityLabel(provider.availabilityStatus.label);

  return (
    <div className="mt-4 rounded-lg border border-[rgba(10,37,64,0.1)] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-4 shadow-[var(--shadow-subtle)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase leading-4 text-[var(--brand-orange-dark)]">
            Hızlı Detay
          </p>
          <h3 className="mt-1 truncate text-lg font-extrabold leading-6 text-[var(--brand-navy)]">
            {provider.name || "İsimsiz Usta"}
          </h3>
          <p className="mt-1 text-sm font-semibold leading-5 text-[var(--muted)]">
            {[provider.category, provider.district].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          aria-label="Hızlı detayı kapat"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {hasRating ? (
          <div className="rounded-md bg-white px-3 py-2 ring-1 ring-[var(--border)]">
            <dt className="text-xs font-bold uppercase text-[var(--muted)]">Puan</dt>
            <dd className="mt-1 font-extrabold text-[var(--brand-navy)]">
              {provider.rating.toFixed(1)} / 5 · {provider.reviewCount} yorum
            </dd>
          </div>
        ) : null}
        {hasPrice ? (
          <div className="rounded-md bg-white px-3 py-2 ring-1 ring-[var(--border)]">
            <dt className="text-xs font-bold uppercase text-[var(--muted)]">Fiyat</dt>
            <dd className="mt-1 line-clamp-2 font-extrabold text-[var(--brand-navy)]">{priceRange}</dd>
          </div>
        ) : null}
        <div className="rounded-md bg-white px-3 py-2 ring-1 ring-[var(--border)]">
          <dt className="text-xs font-bold uppercase text-[var(--muted)]">Müsaitlik</dt>
          <dd className="mt-1 line-clamp-2 font-extrabold text-[var(--brand-navy)]">
            {availabilityLabel}
          </dd>
        </div>
        {provider.serviceAreas.length > 0 ? (
          <div className="rounded-md bg-white px-3 py-2 ring-1 ring-[var(--border)]">
            <dt className="text-xs font-bold uppercase text-[var(--muted)]">Hizmet Bölgesi</dt>
            <dd className="mt-1 line-clamp-2 font-extrabold text-[var(--brand-navy)]">
              {provider.serviceAreas.join(", ")}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button className="h-10 min-h-10 gap-2 px-3 text-xs" href={profileHref}>
          <Eye aria-hidden="true" className="size-4" />
          Profili İncele
        </Button>
        <Button className="h-10 min-h-10 gap-2 px-3 text-xs" href={requestHref} variant="secondary">
          Teklif İste
        </Button>
      </div>
    </div>
  );
}

export function ProviderCard({
  provider,
  actionsId,
  className,
  featured = false,
  galleryPreviewUrl,
}: ProviderCardProps) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const currentSearchParams = new URLSearchParams(searchParams.toString());
  const profileHref = `${appRoutes.providers}/${provider.id}`;
  const requestHref = createProviderRequestHref(provider);
  const priceRange = getDisplayPriceRange(provider.averagePrice);
  const availabilityLabel = getDisplayAvailabilityLabel(provider.availabilityStatus.label);
  const responseTimeLabel = getDisplayResponseTime(provider.responseTime);
  const descriptionText = provider.shortDescription?.trim() || provider.description?.trim() || "";
  const cardGalleryPreviewUrl = galleryPreviewUrl ?? provider.galleryPreviewUrl;
  const serviceIconName = getServiceIconNameForCategory(provider.category);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const availabilityClassName =
    provider.availabilityStatus.tone === "green"
      ? "border-[rgba(23,116,95,0.2)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]"
      : provider.availabilityStatus.tone === "orange"
        ? "border-[rgba(255,138,0,0.24)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"
        : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--muted)]";

  if (featured) {
    const heroImageUrl = provider.profileImageUrl ?? cardGalleryPreviewUrl ?? null;

    return (
      <article
        aria-labelledby={`provider-${provider.id}-title`}
        className={cn(
          "premium-card-hover group relative flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-[rgba(13,20,36,0.09)] bg-white shadow-[var(--shadow-card)] transition-all duration-300 hover:border-[rgba(255,138,0,0.34)] hover:shadow-[var(--shadow-premium)]",
          className,
        )}
      >
        <div className="relative">
          <ProviderAvatar
            className="ring-0"
            previewUrl={heroImageUrl ?? undefined}
            provider={provider}
            variant="hero"
          />
          <div className="absolute left-3 top-3">
            <ProviderObjectButton
              isOpen={isQuickViewOpen}
              onClick={() => setIsQuickViewOpen((currentValue) => !currentValue)}
              serviceIconName={serviceIconName}
            />
          </div>
          {typeof provider.rating === "number" &&
          Number.isFinite(provider.rating) &&
          provider.rating > 0 ? (
            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-2.5 py-1.5 text-xs font-bold text-amber-700 shadow-[var(--shadow-subtle)] backdrop-blur-sm">
              <Star className="size-3.5 fill-current" />
              {provider.rating.toFixed(1)}
            </div>
          ) : null}
          <div
            className={`absolute bottom-3 left-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shadow-[var(--shadow-subtle)] ${availabilityClassName}`}
          >
            <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{availabilityLabel}</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <Button
            className="min-w-0 break-words text-left text-lg font-bold leading-6 text-[var(--brand-navy)] transition-colors hover:text-[var(--brand-orange-dark)]"
            href={profileHref}
            id={`provider-${provider.id}-title`}
            title={provider.name || "İsimsiz Usta"}
            variant="plain"
          >
            {provider.name || "İsimsiz Usta"}
          </Button>

          <div className="mt-3 flex min-w-0 flex-wrap gap-2">
            {provider.category ? (
              <Link
                className="inline-flex min-h-8 min-w-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-navy)] transition-colors hover:border-[rgba(255,138,0,0.4)] hover:bg-[var(--brand-orange-soft)]"
                href={createProviderFilterHref(
                  currentSearchParams,
                  "category",
                  provider.category,
                )}
              >
                <ServiceIcon
                  className="size-3.5 shrink-0 text-[var(--brand-orange)]"
                  name={serviceIconName}
                />
                <span className="truncate">{provider.category}</span>
              </Link>
            ) : null}
            {provider.district ? (
              <Link
                className="inline-flex min-h-8 min-w-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-navy)] transition-colors hover:border-[rgba(255,138,0,0.4)] hover:bg-[var(--brand-orange-soft)]"
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

          <div className="mt-4 flex min-w-0 items-center gap-2 rounded-xl border border-[rgba(255,138,0,0.2)] bg-[var(--brand-orange-soft)] px-3 py-2.5 text-sm font-bold text-[var(--brand-navy)]">
            <Coins className="size-4 shrink-0 text-[var(--brand-orange-dark)]" aria-hidden />
            <span className="truncate" title={priceRange}>
              {priceRange}
            </span>
          </div>

          {isQuickViewOpen ? (
            <ProviderQuickView
              onClose={() => setIsQuickViewOpen(false)}
              priceRange={priceRange}
              profileHref={profileHref}
              provider={provider}
              requestHref={requestHref}
            />
          ) : null}

          <div className="mt-auto pt-4" id={actionsId}>
            <Button
              className="h-11 min-h-11 w-full gap-2 whitespace-nowrap px-3 text-xs sm:text-sm"
              href={profileHref}
              variant="primary"
            >
              <UserRoundSearch className="size-4 shrink-0" />
              <span>Profili Gör</span>
            </Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      aria-labelledby={`provider-${provider.id}-title`}
      className={cn(
        "group relative flex h-full min-h-[390px] min-w-0 max-w-full flex-col overflow-hidden rounded-[22px] border border-[rgba(10,37,64,0.09)] bg-white p-5 shadow-[0_20px_54px_rgba(10,37,64,0.09)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-[rgba(255,101,0,0.38)] hover:shadow-[0_28px_80px_rgba(10,37,64,0.15)] sm:min-h-[420px] sm:rounded-[24px] sm:p-[22px] [hyphens:none] [overflow-wrap:normal] [text-rendering:optimizeLegibility] [word-break:normal] [-webkit-font-smoothing:antialiased]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--brand-orange),#ffb457,transparent)] opacity-80"
      />

      <div className="flex min-w-0 items-start gap-4">
        <ProviderAvatar
          className="h-[72px] w-[72px] rounded-[20px] sm:h-20 sm:w-20 sm:rounded-[22px]"
          provider={provider}
          variant="card"
        />
        <div className="min-w-0 flex-1">
          <div className="min-w-0">
            <Button
              className="line-clamp-2 max-w-full min-w-0 rounded-md text-left text-[1.25rem] font-extrabold leading-[1.18] text-[var(--brand-navy)] transition-colors hover:text-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 [hyphens:none] [overflow-wrap:normal] [text-wrap:balance] [word-break:normal]"
              href={profileHref}
              id={`provider-${provider.id}-title`}
              title={provider.name || "İsimsiz Usta"}
              variant="plain"
            >
              {provider.name || "İsimsiz Usta"}
            </Button>
            {typeof provider.rating === "number" &&
            Number.isFinite(provider.rating) &&
            provider.rating > 0 ? (
              <div className="mt-2 flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700">
                <Star className="size-3.5 fill-current" />
                {provider.rating.toFixed(1)}
              </div>
            ) : null}
          </div>
        </div>
        <ProviderObjectButton
          isOpen={isQuickViewOpen}
          onClick={() => setIsQuickViewOpen((currentValue) => !currentValue)}
          serviceIconName={serviceIconName}
        />
      </div>

      <div className="mt-5 grid min-w-0 gap-4 text-sm">
        <div className="flex min-w-0 flex-wrap gap-2">
          {provider.category ? (
            <Link
              className="inline-flex min-h-9 max-w-full min-w-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-[0.82rem] font-semibold leading-4 text-[var(--brand-navy)] transition-colors hover:border-[rgba(255,138,0,0.4)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 [hyphens:none] [overflow-wrap:normal] [word-break:normal]"
              href={createProviderFilterHref(
                currentSearchParams,
                "category",
                provider.category,
              )}
            >
              <ServiceIcon
                className="size-3.5 shrink-0 text-[var(--brand-orange)]"
                name={serviceIconName}
              />
              <span className="min-w-0 whitespace-normal sm:whitespace-nowrap">{provider.category}</span>
            </Link>
          ) : null}
          {provider.district ? (
            <Link
              className="inline-flex min-h-9 max-w-full min-w-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-[0.82rem] font-semibold leading-4 text-[var(--brand-navy)] transition-colors hover:border-[rgba(255,138,0,0.4)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 [hyphens:none] [overflow-wrap:normal] [word-break:normal]"
              href={createProviderFilterHref(
                currentSearchParams,
                "district",
                provider.district,
              )}
            >
              <MapPin className="size-3 shrink-0" />
              <span className="min-w-0 whitespace-normal sm:whitespace-nowrap">{provider.district}</span>
            </Link>
          ) : null}
        </div>

        {descriptionText ? (
          <p
            className="line-clamp-3 min-w-0 text-[0.94rem] font-medium leading-6 text-[var(--muted)] [hyphens:none] [overflow-wrap:normal] [text-wrap:pretty] [word-break:normal]"
            title={descriptionText}
          >
            {descriptionText}
          </p>
        ) : null}

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={`inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold leading-4 [hyphens:none] [overflow-wrap:normal] [word-break:normal] ${availabilityClassName}`}
          >
            <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 whitespace-normal sm:whitespace-nowrap">
              {availabilityLabel}
            </span>
          </span>
          <ProviderTrustBadges badges={provider.trustBadges} className="contents" limit={2} />
        </div>

        <dl className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3">
          <div className="flex min-h-[92px] min-w-0 flex-col overflow-hidden rounded-[15px] border border-[var(--border)] bg-[var(--surface-soft)] p-3.5">
            <dt className="flex min-w-0 items-center gap-1.5 text-[0.72rem] font-semibold leading-4 tracking-[0.02em] text-[var(--muted)]">
              <Clock3 className="size-4 shrink-0 text-[var(--brand-orange)]" aria-hidden="true" />
              <span className="min-w-0">
                Müsaitlik
              </span>
            </dt>
            <dd
              className="mt-2 line-clamp-2 min-w-0 text-sm font-extrabold leading-[1.3] text-[var(--brand-navy)] [hyphens:none] [overflow-wrap:normal] [word-break:normal]"
              title={availabilityLabel}
            >
              {availabilityLabel}
            </dd>
          </div>
          <div className="flex min-h-[92px] min-w-0 flex-col overflow-hidden rounded-[15px] border border-[var(--border)] bg-[var(--surface-soft)] p-3.5">
            <dt className="flex min-w-0 items-center gap-1.5 text-[0.72rem] font-semibold leading-4 tracking-[0.02em] text-[var(--muted)]">
              <Timer className="size-4 shrink-0 text-[var(--brand-navy)]" aria-hidden="true" />
              <span className="min-w-0">Yanıt süresi</span>
            </dt>
            <dd
              className="mt-2 line-clamp-2 min-w-0 text-sm font-extrabold leading-[1.3] text-[var(--brand-navy)] [hyphens:none] [overflow-wrap:normal] [word-break:normal]"
              title={responseTimeLabel}
            >
              {responseTimeLabel}
            </dd>
          </div>
          <div className="col-span-2 flex min-h-[92px] min-w-0 flex-col overflow-hidden rounded-[15px] border border-[rgba(255,138,0,0.22)] bg-[var(--brand-orange-soft)] p-3.5 sm:col-span-1">
            <dt className="flex min-w-0 items-center gap-1.5 text-[0.72rem] font-semibold leading-4 tracking-[0.02em] text-[var(--brand-orange-dark)]">
              <Coins className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                {t("providerCard.priceRange")}
              </span>
            </dt>
            <dd
              className="mt-2 line-clamp-2 min-w-0 text-sm font-extrabold leading-[1.3] text-[var(--brand-navy)] [hyphens:none] [overflow-wrap:normal] [word-break:normal]"
              title={priceRange}
            >
              {priceRange}
            </dd>
          </div>
        </dl>
      </div>

      {isQuickViewOpen ? (
        <ProviderQuickView
          onClose={() => setIsQuickViewOpen(false)}
          priceRange={priceRange}
          profileHref={profileHref}
          provider={provider}
          requestHref={requestHref}
        />
      ) : null}

      <div
        className="mt-auto pt-5"
        id={actionsId}
      >
        <Button
          className="h-12 min-h-12 w-full gap-2 rounded-[14px] px-4 text-sm font-extrabold sm:h-[52px]"
          href={profileHref}
          variant="primary"
        >
          <UserRoundSearch className="size-4 shrink-0" />
          <span>Profili Gör</span>
        </Button>
      </div>
    </article>
  );
}
