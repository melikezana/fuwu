"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, ShieldCheck, Star, UserRound } from "lucide-react";
import { appointment, commerceError, money, slotTime, todayIstanbul } from "@/lib/commerce/display";
import type { CatalogService, PublicOffer, ServiceVariant, Slot } from "@/lib/commerce/types";
import { useSessionFormDraft } from "@/lib/hooks/useSessionFormDraft";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";

export function ServiceBooking({ service, offers, variants, districts, unavailable, initialProvider, initialDistrict }: { service: CatalogService; offers: PublicOffer[]; variants: ServiceVariant[]; districts: { id: string; name: string }[]; unavailable: boolean; initialProvider?: string; initialDistrict?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ variantId: variants[0]?.id || "", districtId: districts.find(d => d.id === initialDistrict || d.name === initialDistrict)?.id || "", offeringId: offers.find(o => o.provider_id === initialProvider)?.id || "", day: todayIstanbul(), startsAt: "", address: "", idempotencyKey: "" });
  const clearDraft = useSessionFormDraft(`fuwu:commerce:${service.slug}`, form, setForm);
  const [result, setResult] = useState({ key: "", slots: [] as Slot[], error: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const eligible = offers.filter(o => (!form.districtId || o.district_ids.includes(form.districtId)) && (service.pricing_type !== "VARIANT_BASED" || o.variant_id === form.variantId));
  const selected = eligible.find(o => o.id === form.offeringId);
  const key = selected && form.day && form.districtId ? `${selected.id}|${form.day}|${form.districtId}` : "";
  const loading = Boolean(key && key !== result.key);
  const slots = key === result.key ? result.slots : [];
  const validSlot = slots.some(s => s.starts_at === form.startsAt);
  const maxDate = new Date(`${todayIstanbul()}T12:00:00+03:00`); maxDate.setUTCDate(maxDate.getUTCDate() + 30);
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const [offering, day, district] = key.split("|");
    fetch(`/api/commerce/slots?${new URLSearchParams({ offering, day, district })}`, { signal: controller.signal, cache: "no-store" })
      .then(async r => { const b = await r.json(); if (!r.ok) throw new Error(b.error); return b; })
      .then(b => { if (!controller.signal.aborted) setResult({ key, slots: b.slots, error: "" }); })
      .catch(e => { if (!controller.signal.aborted) setResult({ key, slots: [], error: commerceError(String(e)) }); });
    return () => controller.abort();
  }, [key]);
  function change(field: "variantId" | "districtId" | "offeringId" | "day", value: string) {
    setForm(f => ({ ...f, [field]: value, startsAt: "", idempotencyKey: "", ...(["variantId", "districtId"].includes(field) ? { offeringId: "" } : {}) }));
    setError("");
  }
  async function reserve(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !validSlot || busy) return;
    setBusy(true); setError(""); setNeedsLogin(false);
    const idempotencyKey = form.idempotencyKey || crypto.randomUUID();
    setForm(f => ({ ...f, idempotencyKey }));
    try {
      const response = await fetch("/api/commerce/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offeringId: selected.id, districtId: form.districtId, startsAt: form.startsAt, address: form.address, expectedPriceMinor: selected.price_minor, idempotencyKey }) });
      const body = await response.json();
      if (response.status === 401) { setNeedsLogin(true); throw new Error("unauthorized"); }
      if (!response.ok) throw new Error(body.error);
      clearDraft(); router.push(`/orders/${body.order.id}`);
    } catch (e) { setError(commerceError(String(e))); } finally { setBusy(false); }
  }
  return <div className="commerce-page commerce-booking-page">
    <Link className="commerce-back" href="/services"><ArrowLeft size={17} aria-hidden /> Hizmetlere dön</Link>
    <div className="commerce-detail-hero"><div className="commerce-detail-photo"><Image src={service.image_url} alt={`${service.name} hizmetini tanıtan fotoğraf`} fill priority sizes="(max-width: 767px) 92vw, 520px" /></div><header><p className="commerce-eyebrow">EVİNİZDE BİR İŞ DAHA HALLOLSUN</p><h1>{service.name}</h1><p>{service.description}</p><span className="commerce-badge">{service.pricing_type === "DIAGNOSTIC_SERVICE" ? "Keşif / arıza tespiti" : service.pricing_type === "VARIANT_BASED" ? "Seçtiğin pakete göre fiyat" : "Kapsamı belli, sabit fiyat"}</span><div className="commerce-scope"><h2><Check size={18} aria-hidden /> Hizmete dahil</h2><p>{service.scope}</p><h2>Dahil olmayanlar</h2><p>{service.exclusions}</p></div></header></div>
    {unavailable && <p className="commerce-notice" role="status">Katalog bağlantısı henüz hazır değil. Gerçek fiyat ve müsaitlik doğrulanana kadar bu hizmet satın alınamaz.</p>}
    <div className="commerce-booking-layout"><form id="commerce-booking" onSubmit={reserve} className="commerce-booking-form">
      <section className="commerce-panel"><h2><span className="commerce-step">1</span> Hizmet nerede verilecek?</h2><label className="commerce-field">İlçe<select aria-label="İlçe" required value={form.districtId} onChange={e => change("districtId", e.target.value)}><option value="">İstanbul ilçenizi seçin</option>{districts.map(d => <option value={d.id} key={d.id}>{d.name}</option>)}</select></label><p className="commerce-help"><MapPin size={15} aria-hidden /> Bölgenize hizmet veren ustalar listelenir.</p></section>
      {service.pricing_type === "VARIANT_BASED" && <section className="commerce-panel"><h2><span className="commerce-step">2</span> Hizmet paketini seç</h2><div className="commerce-choice-row">{variants.map(v => <button key={v.id} type="button" aria-pressed={form.variantId === v.id} onClick={() => change("variantId", v.id)}>{v.name}</button>)}</div></section>}
      <section className="commerce-panel" id="choose-provider"><h2><UserRound size={21} aria-hidden /> Ustanı seç</h2><p className="commerce-help">Yalnızca bu hizmet için fiyat belirleyen, aktif ustalar gösterilir.</p><div className="commerce-offer-list">{eligible.map(offer => <article className={`commerce-offer ${selected?.id === offer.id ? "is-selected" : ""}`} key={offer.id}><div className="commerce-offer-person"><span className="commerce-avatar">{offer.profile_image_url ? <Image src={offer.profile_image_url} alt={offer.provider_name} fill sizes="56px" unoptimized /> : <UserRound size={26} aria-hidden />}</span><div><h3>{offer.provider_name}</h3><p>{service.name}</p><p className="commerce-rating"><Star size={14} aria-hidden /> {offer.review_count ? `${Number(offer.rating).toLocaleString("tr-TR")} · ${offer.review_count} değerlendirme` : "Henüz değerlendirme yok"}</p></div></div><div className="commerce-offer-meta"><strong>{money(offer.price_minor)}</strong><span><Clock3 size={14} aria-hidden /> {offer.duration_minutes} dakika</span><span>{offer.district_ids.map(id => districts.find(d => d.id === id)?.name).filter(Boolean).join(", ")}</span></div><div className="commerce-offer-actions"><Link href={`/providers/${offer.provider_id}`}>Profili Gör</Link><button type="button" disabled={!form.districtId} aria-pressed={selected?.id === offer.id} onClick={() => change("offeringId", offer.id)}>{selected?.id === offer.id ? <><Check size={16} aria-hidden /> Usta seçildi</> : "Bu Ustayla Devam Et"}</button></div></article>)}</div>{!eligible.length && <div className="commerce-empty compact"><UserRound size={28} aria-hidden /><h3>Bu seçim için satın alınabilir hizmet yok</h3><p>Usta hizmetini, fiyatını ve çalışma saatlerini tanımladığında burada görünecek.</p></div>}{eligible.length > 0 && !form.districtId && <p className="commerce-help">Usta seçmek için önce ilçenizi belirtin.</p>}</section>
      <section className="commerce-panel"><h2><CalendarDays size={21} aria-hidden /> Gün ve Saat Seç</h2><label className="commerce-field">Randevu günü<input type="date" min={todayIstanbul()} max={maxDate.toISOString().slice(0, 10)} required value={form.day} onChange={e => change("day", e.target.value)} /></label><p className="commerce-help">Tüm saatler Türkiye saatidir. Hizmet süresi ve mevcut rezervasyonlar hesaba katılır.</p><div aria-live="polite">{!key ? <p className="commerce-notice">Müsait saatleri görmek için ilçe ve usta seçin.</p> : loading ? <div className="commerce-slot-grid" aria-label="Müsait saatler yükleniyor" role="status">{[1,2,3,4].map(n => <span className="commerce-skeleton h-12" key={n} />)}</div> : result.error ? <p role="alert" className="commerce-error">{result.error}</p> : !slots.length ? <p className="commerce-notice">Bu gün için uygun randevu yok. Başka bir gün veya usta seçebilirsiniz.</p> : <fieldset><legend className="commerce-field-title">Müsait saatler</legend><div className="commerce-slot-grid">{slots.map(s => <label className={`commerce-slot ${form.startsAt === s.starts_at ? "is-selected" : ""}`} key={s.starts_at}><input type="radio" name="slot" value={s.starts_at} checked={form.startsAt === s.starts_at} onChange={() => setForm(f => ({ ...f, startsAt: s.starts_at, idempotencyKey: "" }))} />{slotTime(s.starts_at)}</label>)}</div></fieldset>}</div></section>
      <section className="commerce-panel"><h2><MapPin size={21} aria-hidden /> Açık adres</h2><label className="commerce-field">Mahalle, sokak, bina ve daire<textarea autoComplete="street-address" required minLength={10} maxLength={1000} rows={3} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value, idempotencyKey: "" }))} placeholder="Ustanızın geleceği adresi yazın" /></label></section>
    </form><aside className="commerce-summary"><p className="commerce-eyebrow">SİPARİŞ ÖZETİN</p><h2>{service.name}</h2><dl><div><dt>Usta</dt><dd>{selected?.provider_name || "Ustanı seç"}</dd></div>{service.pricing_type === "VARIANT_BASED" && <div><dt>Paket</dt><dd>{variants.find(v => v.id === form.variantId)?.name || "Seçilmedi"}</dd></div>}<div><dt>Randevu</dt><dd>{validSlot ? appointment(form.startsAt) : "Gün ve saat seç"}</dd></div><div><dt>İlçe</dt><dd>{districts.find(d => d.id === form.districtId)?.name || "İlçe seç"}</dd></div><div><dt>Hizmet bedeli</dt><dd>{selected ? money(selected.price_minor) : "Usta seçimiyle belli olur"}</dd></div><div><dt>Ek ücretler</dt><dd>{selected ? money(0) : "—"}</dd></div></dl><div className="commerce-summary-total"><span>Toplam</span><strong>{selected ? money(selected.price_minor) : "—"}</strong></div><p className="commerce-help"><ShieldCheck size={17} aria-hidden /> Fiyat ve müsaitlik, devam ettiğinizde tekrar kontrol edilir.</p><p className="commerce-sandbox">Test ortamı · Gerçek para tahsil edilmez.</p>{error && <p role="alert" className="commerce-error">{error}</p>}{needsLogin && <Link className="commerce-button" href={buildLoginRedirectUrl(`/services/${service.slug}`)}>Giriş Yap ve Devam Et</Link>}<button className="commerce-button commerce-desktop-submit" type="submit" form="commerce-booking" disabled={!selected || !validSlot || busy}>{busy ? "Randevu ayrılıyor…" : "Sipariş Özetine Geç"}<ArrowRight size={18} aria-hidden /></button><small>Randevunuz ödeme için 10 dakika ayrılır. Ödeme onaylanınca kesinleşir.</small></aside></div>
    <div className="commerce-sticky"><div><small>Toplam</small><strong>{selected ? money(selected.price_minor) : "Ustanı seç"}</strong></div><button className="commerce-button" type="submit" form="commerce-booking" disabled={!selected || !validSlot || busy}>{busy ? "Ayrılıyor…" : "Devam Et"}<ArrowRight size={17} aria-hidden /></button></div>
  </div>;
}
