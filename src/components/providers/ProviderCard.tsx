"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MapPin,
  MessageCircle,
  Phone,
  Star,
  UserSearch,
} from "lucide-react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
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

export function ProviderCard({ provider, actionsId, className }: ProviderCardProps) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const currentSearchParams = new URLSearchParams(searchParams.toString());
  const profileHref = `${appRoutes.providers}/${provider.id}`;
  
  const analyticsPayload = {
    category: provider.category,
    district: provider.district,
    providerId: provider.id,
    source: provider.source,
  };

  // Primary Action (Fuwu Orange)
  const primaryActionClassName = "inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-1";
  
  // Secondary Action (Calm Gray/Navy)
  const secondaryActionClassName = "inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--brand-navy)] transition-colors hover:bg-[var(--surface-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-1";

  // Clamp description
  const descriptionPreview = provider.shortDescription || provider.description;

  return (
    <article
      aria-labelledby={`provider-${provider.id}-title`}
      className={cn(
        "flex flex-col h-full min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm transition-all duration-200 hover:shadow-md",
        className,
      )}
    >
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        {/* Top Row: Name + Rating */}
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <Link
              href={profileHref}
              id={`provider-${provider.id}-title`}
              className="block truncate text-lg sm:text-xl font-semibold text-[var(--brand-navy)] hover:text-[var(--brand-orange)] transition-colors"
            >
              {provider.name || "İsimsiz Usta"}
            </Link>
          </div>
          {typeof provider.rating === 'number' && !isNaN(provider.rating) && provider.rating > 0 && (
            <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md text-xs font-semibold shrink-0 border border-yellow-100">
              <Star className="size-3.5 fill-current" />
              {provider.rating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Middle Row: Badges */}
        <div className="mt-2 flex flex-wrap gap-2">
          {provider.category && (
            <Link
              href={createProviderFilterHref(currentSearchParams, "category", provider.category)}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-navy)] hover:bg-[#E5E7EB] transition-colors"
            >
              <ServiceIcon name={getServiceIconNameForCategory(provider.category)} className="size-3.5 text-[var(--brand-orange)]" />
              {provider.category}
            </Link>
          )}
          {provider.district && (
            <Link
              href={createProviderFilterHref(currentSearchParams, "district", provider.district)}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-soft)] px-2 py-1 text-xs font-semibold text-[var(--brand-navy)] hover:bg-[#E5E7EB] transition-colors"
            >
              <MapPin className="size-3" />
              {provider.district}
            </Link>
          )}
        </div>

        {/* Description Preview */}
        {descriptionPreview && (
          <p className="mt-3 text-sm text-[var(--muted)] line-clamp-2 leading-relaxed">
            {descriptionPreview}
          </p>
        )}
      </div>

      {/* Bottom Row: Price + Actions */}
      <div className="border-t border-[var(--border)] bg-[#FAFAFA] p-4 sm:p-5 mt-auto">
        <div className="mb-4">
          <span className="block text-xs font-semibold text-[var(--muted)] uppercase mb-0.5">
            Fiyat Aralığı
          </span>
          <span className="block text-sm font-semibold text-[var(--brand-navy)]">
            {provider.averagePrice || "Fiyat bilgisi yakında"}
          </span>
        </div>

        <div className="flex flex-col gap-2" id={actionsId}>
          <div className="grid grid-cols-2 gap-2">
            {provider.whatsapp && (
              <a
                className={primaryActionClassName}
                href={getProviderWhatsAppHref(provider)}
                onClick={() => trackWhatsappClick(analyticsPayload)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4 shrink-0" />
                <span>WhatsApp</span>
              </a>
            )}
            {provider.phone && (
              <a
                className={secondaryActionClassName}
                href={getProviderPhoneHref(provider)}
                onClick={() => trackPhoneClick(analyticsPayload)}
              >
                <Phone className="size-4 shrink-0" />
                <span>Telefon</span>
              </a>
            )}
          </div>
          <Link
            className={secondaryActionClassName}
            href={profileHref}
          >
            <UserSearch className="size-4 shrink-0" />
            Profili İncele
          </Link>
        </div>
      </div>
    </article>
  );
}
