"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Clock3, MapPin, Star } from "lucide-react";
import { ProviderAvatar } from "@/components/providers/ProviderAvatar";
import { ProviderTrustBadges } from "@/components/providers/ProviderTrustBadges";
import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";
import { getServiceFilterValue } from "@/lib/constants/services";
import { cn } from "@/lib/utils";
import type { Provider } from "@/types/provider";

type ProviderCardProps = {
  provider: Provider;
  actionsId?: string;
  className?: string;
  featured?: boolean;
  galleryPreviewUrl?: string;
};

export function ProviderCard({ provider, actionsId, className, featured, galleryPreviewUrl }: ProviderCardProps) {
  const searchParams = useSearchParams();
  const profileHref = `${appRoutes.providers}/${provider.id}`;
  const preview = galleryPreviewUrl || provider.galleryPreviewUrl;
  const hasRating = provider.reviewCount > 0 && Number.isFinite(provider.rating) && provider.rating > 0;
  const hasPrice = provider.averagePriceMin != null || provider.averagePriceMax != null;
  function filterHref(key: "category" | "district", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, key === "category" ? getServiceFilterValue(value) : value);
    params.delete(key === "category" ? "service" : "location");
    return `${appRoutes.providers}?${params.toString()}`;
  }

  return (
    <article aria-labelledby={`provider-${provider.id}-title`} className={cn("market-provider-card", featured && "is-featured", className)}>
      <div className="market-provider-identity">
        <ProviderAvatar className="size-16 rounded-full" provider={provider} />
        <div className="min-w-0 flex-1">
          <h3 id={`provider-${provider.id}-title`}><Link href={profileHref}>{provider.name || "Usta profili"}</Link></h3>
          <Link className="market-provider-category" href={filterHref("category", provider.category)}>{provider.category}</Link>
          <div className="market-provider-rating">
            {hasRating ? <><Star aria-hidden="true" className="size-3.5 fill-current" /><strong>{provider.rating.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</strong><span>({provider.reviewCount} değerlendirme)</span></> : <span>Henüz değerlendirme yok</span>}
          </div>
        </div>
      </div>
      <ProviderTrustBadges badges={provider.trustBadges} className="market-provider-badges" limit={2} />
      <Link className="market-provider-location" href={filterHref("district", provider.district)}><MapPin aria-hidden="true" className="size-4 shrink-0" />{provider.serviceAreas.length ? provider.serviceAreas.join(" · ") : provider.district}</Link>
      {provider.shortDescription ? <p className="market-provider-description">{provider.shortDescription}</p> : null}
      {preview ? <Link aria-label={`${provider.name} iş fotoğraflarını incele`} className="market-provider-work" href={`${profileHref}#portfolio`}><Image alt={`${provider.name} tarafından paylaşılan iş fotoğrafı`} className="object-cover" fill sizes="(max-width: 767px) 90vw, 400px" src={preview} /><span>İş fotoğraflarını incele <ArrowUpRight aria-hidden="true" className="size-4" /></span></Link> : null}
      {provider.availabilityStatus.label ? <p className="market-provider-availability"><Clock3 aria-hidden="true" className="size-3.5 shrink-0" />{provider.availabilityStatus.label}</p> : null}
      <div className="market-provider-footer" id={actionsId}>
        <div className="min-w-0"><span className="market-price-label">{hasPrice ? "Belirtilen fiyat aralığı" : "Ustanın mağazası"}</span><strong className="market-price">{hasPrice ? provider.averagePrice : "Hizmetleri inceleyin"}</strong></div>
        <Button className="shrink-0" href={profileHref}>Profili Gör <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" /></Button>
      </div>
    </article>
  );
}
