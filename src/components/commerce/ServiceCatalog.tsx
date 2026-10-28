"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Clock3, Info, Search, ShoppingBag, SlidersHorizontal } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { ServicePhoto } from "@/components/ui/ServicePhoto";
import { getServiceForValue } from "@/lib/constants/services";
import { matchesCatalogQuery, offersForService, previewCategoryFor, type CatalogCategory } from "@/lib/commerce/catalog-navigation";
import { money } from "@/lib/commerce/display";
import type { CatalogService, PublicOffer } from "@/lib/commerce/types";

const pricingFilters = [
  ["all", "Tüm hizmetler"],
  ["FIXED_PRICE", "Sabit fiyatlı"],
  ["VARIANT_BASED", "Paket seçimi"],
  ["DIAGNOSTIC_SERVICE", "Keşif ve arıza tespiti"],
] as const;

function CatalogFilters({ filter, onFilter, saleOnly, onSaleOnly }: { filter: string; onFilter: (value: string) => void; saleOnly: boolean; onSaleOnly: (value: boolean) => void }) {
  return <>
    <fieldset className="catalog-pricing-filters"><legend>Hizmet türü</legend><div className="commerce-filters">{pricingFilters.map(([id, label]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => onFilter(id)}>{label}</button>)}</div></fieldset>
    <label className="catalog-sale-filter"><input checked={saleOnly} onChange={event => onSaleOnly(event.target.checked)} type="checkbox" />Yalnızca satışa açık hizmetler</label>
  </>;
}

export function ServiceCatalog({ services, offers, unavailable, initialSearch = "", district = "", districtId = "", featured = false, category = "", categories = [] }: {
  services: CatalogService[]; offers: PublicOffer[]; unavailable: boolean; initialSearch?: string; district?: string; districtId?: string; featured?: boolean; category?: string; categories?: CatalogCategory[];
}) {
  const [query, setQuery] = useState(initialSearch);
  const [filter, setFilter] = useState("all");
  const [saleOnly, setSaleOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const availableOffers = unavailable ? [] : offers;
  const visible = services.filter(service => {
    const categoryName = categories.find(item => item.id === service.category_id)?.name ?? getServiceForValue(previewCategoryFor(service))?.title ?? "";
    return service.is_active && matchesCatalogQuery(service, query, categoryName) && (filter === "all" || service.pricing_type === filter) && (!saleOnly || offersForService(availableOffers, service.id, districtId).length > 0);
  });
  const activeFilterCount = Number(filter !== "all") + Number(saleOnly);
  const serviceHref = (slug: string) => `/services/${slug}${district ? `?${new URLSearchParams({ district })}` : ""}`;
  function resetFilters() { setFilter("all"); setSaleOnly(false); }

  return <>
    {!featured && <>
      <div className="commerce-catalog-tools">
        <label className="commerce-search"><Search size={20} aria-hidden /><span className="sr-only">Hizmet ara</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Hizmet ara" type="search" enterKeyHint="search" /></label>
        <button className="catalog-mobile-filter-button commerce-secondary" type="button" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog"><SlidersHorizontal size={18} aria-hidden />Filtrele{activeFilterCount > 0 && <span className="catalog-filter-count">{activeFilterCount}</span>}</button>
      </div>
      <div className="catalog-desktop-filters"><CatalogFilters filter={filter} onFilter={setFilter} saleOnly={saleOnly} onSaleOnly={setSaleOnly} /></div>
      <div className="catalog-results-heading"><h2 aria-live="polite">{visible.length} hizmet{district ? ` · ${district}` : ""}</h2>{activeFilterCount > 0 && <button type="button" onClick={resetFilters}>Filtreleri temizle</button>}<Link className="commerce-text-link" href="/orders">Siparişlerim <ArrowRight size={15} aria-hidden /></Link></div>
      <Dialog isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} title="Hizmetleri filtrele" description="İhtiyacına uygun hizmet türünü seç.">
        <CatalogFilters filter={filter} onFilter={setFilter} saleOnly={saleOnly} onSaleOnly={setSaleOnly} />
        <div className="catalog-sheet-actions"><button className="commerce-secondary" onClick={resetFilters} type="button">Temizle</button><button className="commerce-button" onClick={() => setFiltersOpen(false)} type="button">{visible.length} hizmeti göster <ArrowRight size={17} aria-hidden /></button></div>
      </Dialog>
    </>}
    {unavailable && <div className="catalog-connection-notice" role="alert"><Info size={20} aria-hidden /><div><strong>Hizmet kataloğuna şu anda tam olarak ulaşılamıyor.</strong><p>Fiyat ve randevu bilgileri doğrulanamıyor. Okunabilen kayıtlar korunuyor; satın alma kapalı.</p><button onClick={() => window.location.reload()} type="button">Bağlantıyı yeniden dene <ArrowRight size={15} aria-hidden /></button></div></div>}
    <div className="commerce-service-grid">{visible.map(service => {
      const available = offersForService(availableOffers, service.id, districtId);
      const min = available.length ? Math.min(...available.map(offer => offer.price_minor)) : null;
      const duration = available.length ? Math.min(...available.map(offer => offer.duration_minutes)) : null;
      return <article className="commerce-service-card" key={service.id}>
        <Link href={serviceHref(service.slug)} className="commerce-service-photo"><ServicePhoto keys={[service.slug, categories.find(item => item.id === service.category_id)?.slug]} src={service.image_url} label={service.name} sizes={featured ? "(max-width: 767px) 92vw, 380px" : "(max-width: 639px) 92vw, (max-width: 1023px) 45vw, 380px"} /><span className="commerce-photo-label">{service.pricing_type === "DIAGNOSTIC_SERVICE" ? "Yerinde tespit" : service.pricing_type === "VARIANT_BASED" ? "Paketini seç" : "Sabit kapsam"}</span></Link>
        <div className="commerce-service-body">
          <h3><Link href={serviceHref(service.slug)}>{service.name}</Link></h3><p>{service.description}</p><details className="catalog-scope"><summary>Hizmet kapsamı</summary><p>{service.scope}</p>{service.exclusions && <p><strong>Dahil olmayanlar:</strong> {service.exclusions}</p>}</details>
          {duration != null && <div className="commerce-meta"><Clock3 size={15} aria-hidden />{duration} dk itibarıyla</div>}
          <div className="commerce-price-row"><div><small>{min == null ? "Satış durumu" : available.every(offer => offer.price_minor === min) ? "Hizmet bedeli" : "Başlangıç fiyatı"}</small><strong>{min == null ? district && !unavailable ? "Bu ilçede satışa açık değil" : "Henüz satışa açılmadı" : money(min)}</strong></div>{available.length > 0 && <span>{new Set(available.map(offer => offer.provider_id)).size} usta</span>}</div>
          <Link className={min == null ? "commerce-secondary" : "commerce-button"} href={serviceHref(service.slug)}>{min == null ? "Kapsamı İncele" : "Usta ve Randevu Seç"}<ArrowRight size={17} aria-hidden /></Link>
        </div>
      </article>;
    })}</div>
    {!visible.length && !unavailable && <div className="commerce-empty"><ShoppingBag aria-hidden size={32} /><h3>{category && !query ? "Bu kategoride hizmetler hazırlanıyor." : "Aradığın hizmet bulunamadı"}</h3><p>Aramanı değiştirebilir veya diğer hizmetleri inceleyebilirsin.</p>{query || activeFilterCount ? <button type="button" className="commerce-secondary" onClick={() => { setQuery(""); resetFilters(); }}>Arama ve Filtreleri Temizle</button> : null}{category && <Link className="commerce-secondary" href={`/providers?${new URLSearchParams({ category, ...(district ? { district } : {}) })}`}>Bu Kategoride Usta Bul</Link>}<Link className="commerce-button" href="/services">Tüm Hizmetleri Gör</Link></div>}
  </>;
}
