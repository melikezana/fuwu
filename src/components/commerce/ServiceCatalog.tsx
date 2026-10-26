"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Clock3, Search, ShoppingBag } from "lucide-react";
import { money } from "@/lib/commerce/display";
import type { CatalogService, PublicOffer } from "@/lib/commerce/types";
export function ServiceCatalog({ services, offers, unavailable, initialSearch = "", district = "", featured = false, category = "" }: { services: CatalogService[]; offers: PublicOffer[]; unavailable: boolean; initialSearch?: string; district?: string; featured?: boolean; category?: string }) {
  const [query, setQuery] = useState(initialSearch);
  const [filter, setFilter] = useState("all");
  const visible = services.filter(s => (!query || `${s.name} ${s.description} ${s.scope} ${s.exclusions}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))) && (filter === "all" || s.pricing_type === filter));
  const serviceHref = (slug: string) => `/services/${slug}${district ? `?district=${encodeURIComponent(district)}` : ""}`;
  return <>
    {!featured && <><div className="commerce-catalog-tools"><label className="commerce-search"><Search size={20} aria-hidden /><span className="sr-only">Hizmet ara</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Eviniz için neye ihtiyacınız var?" type="search" /></label><Link className="commerce-text-link" href="/orders">Siparişlerim <ArrowRight size={16} aria-hidden /></Link></div>
    <div className="commerce-filters" aria-label="Fiyatlandırma türü">{[["all", "Tüm hizmetler"], ["FIXED_PRICE", "Sabit fiyatlı"], ["VARIANT_BASED", "Paket seçimi"], ["DIAGNOSTIC_SERVICE", "Keşif ve arıza tespiti"]].map(([id, label]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div></>}
    {unavailable && <p className="commerce-notice" role="status">Hizmet kataloğunun bağlantısı henüz hazır değil. Hizmet kapsamlarını inceleyebilirsiniz; fiyat ve randevu bilgisi doğrulanana kadar satın alma kapalıdır.</p>}
    <div className="commerce-service-grid">{visible.map(service => {
      const available = unavailable ? [] : offers.filter(o => o.service_id === service.id);
      const min = available.length ? Math.min(...available.map(o => o.price_minor)) : null;
      const minDuration = available.length ? Math.min(...available.map(o => o.duration_minutes)) : null;
      return <article className="commerce-service-card" key={service.id}>
        <Link href={serviceHref(service.slug)} className="commerce-service-photo"><Image src={service.image_url} alt={`${service.name} hizmetini tanıtan fotoğraf`} fill sizes="(max-width: 639px) 92vw, (max-width: 1023px) 45vw, 360px" /><span className="commerce-photo-label">{service.pricing_type === "DIAGNOSTIC_SERVICE" ? "Yerinde tespit" : service.pricing_type === "VARIANT_BASED" ? "Paketini seç" : "Kapsamı belli hizmet"}</span></Link>
        <div className="commerce-service-body"><h2><Link href={serviceHref(service.slug)}>{service.name}</Link></h2><p>{service.description}</p><p className="commerce-service-scope">{service.scope}</p><div className="commerce-meta"><Clock3 size={15} aria-hidden />{minDuration ? `${minDuration} dk itibarıyla` : "Süre, usta fiyatlandırmasıyla açıklanır"}</div><div className="commerce-price-row"><div><small>{min == null ? "Satış durumu" : available.every(o => o.price_minor === min) ? "Hizmet bedeli" : "Başlangıç fiyatı"}</small><strong>{min == null ? "Henüz satışa açılmadı" : money(min)}</strong></div><span>{new Set(available.map(o => o.provider_id)).size} usta</span></div><Link className="commerce-button" href={serviceHref(service.slug)}>{min == null ? "Hizmeti İncele" : "Hizmeti Satın Al"}<ArrowRight size={17} aria-hidden /></Link></div>
      </article>;
    })}</div>
    {!visible.length && <div className="commerce-empty"><ShoppingBag aria-hidden size={32} /><h2>{category && !query ? "Bu kategoride satışa açık hizmet yok" : "Aradığınız hizmet bulunamadı"}</h2><p>Aramanı değiştirebilir, diğer hizmetleri veya bölgenizdeki usta profillerini inceleyebilirsin.</p>{query || filter !== "all" ? <button type="button" className="commerce-secondary" onClick={() => { setQuery(""); setFilter("all"); }}>Aramayı Temizle</button> : null}{category && <Link className="commerce-secondary" href={`/providers?${new URLSearchParams({ category, ...(district ? { district } : {}) })}`}>Bu Kategoride Usta Bul</Link>}<Link className="commerce-button" href="/services">Tüm Hizmetleri İncele</Link></div>}
  </>;
}
