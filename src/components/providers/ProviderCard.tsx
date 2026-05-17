"use client";

import Link from "next/link";
import { MapPin, MessageCircle, Phone, Star, UserSearch } from "lucide-react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { appRoutes } from "@/lib/constants/navigation";
import {
  getProviderPhoneHref,
  getProviderWhatsAppHref,
} from "@/lib/constants/providers";
import { getServiceIconNameForCategory } from "@/lib/constants/services";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Provider } from "@/types/provider";

type ProviderCardProps = {
  provider: Provider;
  actionsId?: string;
  className?: string;
};

const secondaryActionClassName =
  "inline-flex min-h-12 max-w-full cursor-pointer select-none items-center justify-center gap-2 rounded-md bg-white px-3 py-3 text-center text-sm font-black leading-5 text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-soft)] hover:shadow-[inset_0_0_0_1px_rgba(13,20,36,0.18)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:px-4";

const primaryActionClassName =
  "inline-flex min-h-12 max-w-full cursor-pointer select-none items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-3 py-3 text-center text-sm font-black leading-5 text-white shadow-[0_12px_26px_rgba(255,138,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:px-4";

function formatAveragePrice(price: string) {
  return price.replace(/\s+-\s+/, " - ");
}

export function ProviderCard({ provider, actionsId, className }: ProviderCardProps) {
  const { t } = useI18n();
  const profileHref = `${appRoutes.providers}/${provider.id}`;
  const iconName = getServiceIconNameForCategory(provider.category);
  const profileBadge =
    provider.source === "supabase" ? t("providerCard.badge.live") : t("providerCard.badge.fallback");
  const dataNotice =
    provider.source === "supabase"
      ? t("providerCard.notice.live")
      : t("providerCard.notice.fallback");

  return (
    <article
      aria-labelledby={`provider-${provider.id}-title`}
      className={cn(
        "flex h-full min-w-0 cursor-default flex-col rounded-lg bg-white p-5 shadow-[0_18px_48px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_64px_rgba(13,20,36,0.1)] hover:ring-[rgba(255,138,0,0.34)] sm:p-6",
        className,
      )}
    >
      <header className="select-none">
        <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
          <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.24)]">
            <ServiceIcon className="size-7" name={iconName} />
          </span>
          <div className="min-w-0">
            <Link
              className="block cursor-pointer break-words text-2xl font-black leading-tight text-[var(--brand-navy)] transition-colors hover:text-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={profileHref}
              id={`provider-${provider.id}-title`}
            >
              {provider.name}
            </Link>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                aria-label={t("providerCard.categoryAria", { category: provider.category })}
                className="max-w-full cursor-pointer rounded-md bg-[var(--brand-orange-soft)] px-3 py-1.5 text-xs font-black leading-5 text-[var(--brand-orange-dark)] transition-colors hover:bg-[#FFE3BC] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                href={`${appRoutes.providers}?category=${encodeURIComponent(provider.category)}`}
              >
                {provider.category}
              </Link>
              <Link
                aria-label={t("providerCard.districtAria", { district: provider.district })}
                className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-black leading-5 text-[var(--brand-navy)] transition-colors hover:bg-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                href={`${appRoutes.providers}?district=${encodeURIComponent(provider.district)}`}
              >
                <MapPin aria-hidden="true" className="size-3.5" />
                {provider.district}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <span className="inline-flex min-h-10 min-w-0 items-center gap-2 rounded-md bg-[#ECFDF5] px-3 py-2 text-sm font-black leading-5 text-[var(--trust-green)]">
            <Star aria-hidden="true" className="size-4 fill-current" />
            <span className="min-w-0 break-words">
              {t("providerCard.rating", { rating: provider.rating.toFixed(1) })}
            </span>
          </span>
          <span className="grid min-h-10 min-w-0 gap-0.5 rounded-md bg-[var(--surface-soft)] px-3 py-2 text-sm font-black leading-5 text-[var(--brand-navy)]">
            <span className="text-[0.68rem] uppercase leading-4 text-[var(--muted)]">
              {t("providerCard.priceRange")}
            </span>
            <span className="min-w-0 break-words">{formatAveragePrice(provider.averagePrice)}</span>
          </span>
        </div>

        <p className="mt-4 text-sm font-semibold leading-6 text-[var(--muted)]">
          {provider.shortDescription}
        </p>
      </header>

      <dl className="mt-5 grid gap-3 border-y border-[var(--border)] py-4">
        <div className="grid gap-1 text-sm sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center sm:gap-3">
          <dt className="select-none font-black text-[var(--muted)]">
            {t("providerCard.experience")}
          </dt>
          <dd className="min-w-0 font-bold text-[var(--brand-navy)]">{provider.experience}</dd>
        </div>
        <div className="grid gap-1 text-sm sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center sm:gap-3">
          <dt className="select-none font-black text-[var(--muted)]">
            {t("providerCard.reviews")}
          </dt>
          <dd className="min-w-0 font-bold text-[var(--brand-navy)]">
            {t("providerCard.reviewCount", { count: provider.reviewCount })}
          </dd>
        </div>
        <div className="grid gap-1 text-sm sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center sm:gap-3">
          <dt className="select-none font-black text-[var(--muted)]">
            {t("providerCard.status")}
          </dt>
          <dd className="min-w-0 font-bold text-[var(--brand-navy)]">{provider.availability}</dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="max-w-full select-none rounded-md bg-[var(--surface-soft)] px-3 py-1.5 text-sm font-black leading-6 text-[var(--brand-navy)]">
          {provider.responseTime}
        </span>
        <span className="max-w-full select-none rounded-md bg-white px-3 py-1.5 text-sm font-black leading-6 text-[var(--muted)] ring-1 ring-[rgba(13,20,36,0.12)]">
          {profileBadge}
        </span>
      </div>

      <p className="mt-3 cursor-default select-none rounded-md bg-[var(--surface-soft)] px-3 py-2 text-xs font-bold leading-5 text-[var(--muted)]">
        {dataNotice}
      </p>

      <footer className="mt-auto pt-5">
        <div className="grid gap-2 sm:grid-cols-2" id={actionsId}>
          <a
            aria-label={t("providerCard.whatsappAria", { name: provider.name })}
            className={primaryActionClassName}
            data-provider-whatsapp="true"
            href={getProviderWhatsAppHref(provider)}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
            WhatsApp
          </a>
          <a
            aria-label={t("providerCard.phoneAria", { name: provider.name })}
            className={secondaryActionClassName}
            href={getProviderPhoneHref(provider)}
          >
            <Phone aria-hidden="true" className="size-4 shrink-0" />
            Telefon
          </a>
          <Link
            aria-label={t("providerCard.profileAria", { name: provider.name })}
            className={`${secondaryActionClassName} sm:col-span-2`}
            href={profileHref}
          >
            <UserSearch aria-hidden="true" className="size-4 shrink-0" />
            {t("providerCard.profileButton")}
          </Link>
        </div>
      </footer>
    </article>
  );
}
