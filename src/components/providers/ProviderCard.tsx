"use client";

<<<<<<< HEAD
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  UserSearch,
} from "lucide-react";
import { ProviderAvatar } from "@/components/providers/ProviderAvatar";
import { appRoutes } from "@/lib/constants/navigation";
import {
  getProviderAvailabilityLabel,
  getProviderAvailabilityTone,
  getProviderPhoneHref,
  getProviderWhatsAppHref,
} from "@/lib/constants/providers";
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

const secondaryActionClassName =
  "inline-flex min-h-12 max-w-full cursor-pointer select-none items-center justify-center gap-2 rounded-md bg-white px-3 py-3 text-center text-sm font-black leading-5 text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-soft)] hover:shadow-[inset_0_0_0_1px_rgba(13,20,36,0.18)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:px-4";

const primaryActionClassName =
  "inline-flex min-h-12 max-w-full cursor-pointer select-none items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-3 py-3 text-center text-sm font-black leading-5 text-white shadow-[0_12px_26px_rgba(255,138,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:px-4";

function formatAveragePrice(price: string) {
  return price.replace(/\s+-\s+/, " - ");
}

function createProviderFilterHref(
  searchParams: URLSearchParams,
  filterName: "category" | "district",
  value: string,
) {
  const nextParams = new URLSearchParams(searchParams.toString());

  nextParams.set(filterName, value);

  if (filterName === "category") {
    nextParams.delete("service");
  }

  if (filterName === "district") {
    nextParams.delete("location");
  }

  return `${appRoutes.providers}?${nextParams.toString()}`;
}

export function ProviderCard({ provider, actionsId, className }: ProviderCardProps) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const currentSearchParams = new URLSearchParams(searchParams.toString());
  const profileHref = `${appRoutes.providers}/${provider.id}`;
  const profileBadge =
    provider.source === "supabase" ? t("providerCard.badge.live") : t("providerCard.badge.fallback");
  const dataNotice =
    provider.source === "supabase"
      ? t("providerCard.notice.live")
      : t("providerCard.notice.fallback");
  const availabilityLabel = getProviderAvailabilityLabel(provider.availability);
  const availabilityTone = getProviderAvailabilityTone(provider.availability);
  const availabilityClassName = cn(
    "inline-flex min-h-8 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-black leading-4",
    availabilityTone === "green"
      ? "border-[rgba(23,116,95,0.22)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]"
      : availabilityTone === "orange"
        ? "border-[rgba(255,138,0,0.25)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"
        : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--muted)]",
  );
  const analyticsPayload = {
    category: provider.category,
    district: provider.district,
    providerId: provider.id,
    source: provider.source,
  };
  const trustSignals =
    provider.source === "supabase"
      ? [
          {
            description: t("providerCard.trust.approvedDescription"),
            icon: BadgeCheck,
            label: t("providerCard.trust.approved"),
          },
          {
            description: t("providerCard.trust.fuwuDescription"),
            icon: ShieldCheck,
            label: t("providerCard.trust.fuwu"),
          },
          {
            description: t("providerCard.trust.verifiedDescription"),
            icon: BadgeCheck,
            label: t("providerCard.trust.verified"),
          },
        ]
      : [
          {
            description: t("providerCard.trust.previewDescription"),
            icon: ShieldCheck,
            label: t("providerCard.trust.preview"),
          },
        ];

  return (
    <article
      aria-labelledby={`provider-${provider.id}-title`}
      className={cn(
        "flex h-full min-w-0 cursor-default flex-col rounded-lg bg-white p-4 shadow-[0_18px_48px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_64px_rgba(13,20,36,0.1)] hover:ring-[rgba(255,138,0,0.34)] sm:p-6",
        className,
      )}
    >
      <header className="select-none">
        <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
          <ProviderAvatar provider={provider} />
          <div className="min-w-0">
            <Link
              className="block cursor-pointer break-words text-xl font-black leading-tight text-[var(--brand-navy)] transition-colors hover:text-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:text-2xl"
              href={profileHref}
              id={`provider-${provider.id}-title`}
            >
              {provider.name}
            </Link>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                aria-label={t("providerCard.categoryAria", { category: provider.category })}
                className="max-w-full cursor-pointer rounded-md bg-[var(--brand-orange-soft)] px-3 py-1.5 text-xs font-black leading-5 text-[var(--brand-orange-dark)] transition-colors hover:bg-[#FFE3BC] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                href={createProviderFilterHref(currentSearchParams, "category", provider.category)}
              >
                {provider.category}
              </Link>
              <Link
                aria-label={t("providerCard.districtAria", { district: provider.district })}
                className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-black leading-5 text-[var(--brand-navy)] transition-colors hover:bg-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                href={createProviderFilterHref(currentSearchParams, "district", provider.district)}
              >
                <MapPin aria-hidden="true" className="size-3.5" />
                {provider.district}
              </Link>
              <span className={availabilityClassName}>{availabilityLabel}</span>
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
          <dd className="min-w-0 font-bold text-[var(--brand-navy)]">
            <span className={availabilityClassName}>{availabilityLabel}</span>
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="inline-flex max-w-full select-none items-center gap-1.5 rounded-md bg-[var(--surface-soft)] px-3 py-1.5 text-sm font-black leading-6 text-[var(--brand-navy)]">
          <Clock3 aria-hidden="true" className="size-4 shrink-0 text-[var(--trust-green)]" />
          {provider.responseTime}
        </span>
        <span className="max-w-full select-none rounded-md bg-white px-3 py-1.5 text-sm font-black leading-6 text-[var(--muted)] ring-1 ring-[rgba(13,20,36,0.12)]">
          {profileBadge}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" aria-label={t("providerCard.trust.aria")}>
        {trustSignals.map((signal) => {
          const Icon = signal.icon;

          return (
            <span
              className="inline-flex max-w-full select-none items-center gap-1.5 rounded-md border border-[rgba(23,116,95,0.18)] bg-[var(--trust-green-soft)] px-2.5 py-1.5 text-xs font-black leading-5 text-[var(--trust-green)]"
              key={signal.label}
              title={signal.description}
            >
              <Icon aria-hidden="true" className="size-3.5 shrink-0" />
              {signal.label}
            </span>
          );
        })}
      </div>

      <p className="mt-3 cursor-default select-none rounded-md bg-[var(--surface-soft)] px-3 py-2 text-xs font-bold leading-5 text-[var(--muted)]">
        {dataNotice}
      </p>

      <footer className="mt-auto pt-5">
        <div className="grid grid-cols-2 gap-2" id={actionsId}>
          <a
            aria-label={t("providerCard.whatsappAria", { name: provider.name })}
            className={primaryActionClassName}
            data-provider-whatsapp="true"
            href={getProviderWhatsAppHref(provider)}
            onClick={() => trackWhatsappClick(analyticsPayload)}
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
            onClick={() => trackPhoneClick(analyticsPayload)}
          >
            <Phone aria-hidden="true" className="size-4 shrink-0" />
            Telefon
          </a>
          <Link
            aria-label={t("providerCard.profileAria", { name: provider.name })}
            className={`${secondaryActionClassName} col-span-2`}
            href={profileHref}
          >
            <UserSearch aria-hidden="true" className="size-4 shrink-0" />
            {t("providerCard.profileButton")}
          </Link>
        </div>
      </footer>
    </article>
=======
import { Star, MapPin, Wrench, Phone, MessageCircle, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Provider } from "@/services/providers";
import { analyticsService } from "@/services/analytics";
import { whatsappHelper } from "@/lib/whatsapp";

interface ProviderCardProps {
  provider: Provider;
}

export default function ProviderCard({ provider }: ProviderCardProps) {
  const { t } = useTranslation();

  const handleWhatsApp = () => {
    analyticsService.trackWhatsAppClick(provider.id);
    const url = whatsappHelper.generateLeadUrl(provider.whatsapp, provider.category, provider.district);
    window.open(url, "_blank");
  };

  const handlePhone = () => {
    analyticsService.trackPhoneClick(provider.id);
    window.open(`tel:${provider.phone}`);
  };

  const handleViewProfile = () => {
    analyticsService.trackProviderView(provider.id);
    // Future router.push(`/providers/${provider.id}`)
  };

  // Status badge styling
  const statusColors = {
    müsait: "bg-green-100 text-green-700",
    yoğun: "bg-orange-100 text-orange-700",
    çevrimdışı: "bg-gray-100 text-gray-600",
  };

  const statusLabel = {
    müsait: t("provider.availability.available" as any) || "Müsait",
    yoğun: t("provider.availability.busy" as any) || "Yoğun",
    çevrimdışı: t("provider.availability.offline" as any) || "Çevrimdışı",
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="flex gap-3 items-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            {/* Avatar placeholder */}
            <span className="font-bold text-lg">{provider.name.charAt(0)}</span>
          </div>
          <div>
            <h3 className="font-bold text-[#0D1424] text-lg">{provider.name}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Wrench size={14} />
              <span>{provider.category}</span>
              <span className="mx-1">•</span>
              <MapPin size={14} />
              <span>{provider.district}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[provider.availability]}`}>
            {statusLabel[provider.availability]}
          </span>
          <div className="flex items-center gap-1 text-[#FF8A00] font-bold text-sm">
            <Star size={14} className="fill-[#FF8A00]" />
            <span>{provider.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <button 
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 py-2.5 rounded-xl font-medium transition-colors"
        >
          <MessageCircle size={18} />
          <span className="text-sm">WhatsApp</span>
        </button>
        
        <button 
          onClick={handlePhone}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 py-2.5 rounded-xl font-medium transition-colors"
        >
          <Phone size={18} />
          <span className="text-sm">Telefon</span>
        </button>
      </div>

      <button 
        onClick={handleViewProfile}
        className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-[#0D1424] font-medium py-2 border-t border-gray-100 mt-2 transition-colors group"
      >
        <span>{t("provider.inspectProfile" as any) || "Profili İncele"}</span>
        <ChevronRight size={16} className="text-gray-400 group-hover:text-[#0D1424] group-hover:translate-x-1 transition-all" />
      </button>
    </div>
>>>>>>> 41e55ab (Full marketplace backend auth and production update)
  );
}
