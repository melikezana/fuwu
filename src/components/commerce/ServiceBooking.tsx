"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, ShieldCheck, Star, UserRound } from "lucide-react";
import { appointment, commerceError, money, slotTime, todayIstanbul } from "@/lib/commerce/display";
import { bookingDays } from "@/lib/commerce/booking";
import type { CatalogService, PublicOffer, ServiceVariant, Slot } from "@/lib/commerce/types";
import { useSessionFormDraft } from "@/lib/hooks/useSessionFormDraft";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { BookingProgress } from "./BookingProgress";

type BookingProps = {
  service: CatalogService; offers: PublicOffer[]; variants: ServiceVariant[];
  districts: { id: string; name: string }[]; unavailable: boolean;
  initialProvider?: string; initialDistrict?: string; initialVariant?: string; initialRebook?: string;
  savedAddresses?: { id: string; label: string; district_id: string; address: string }[];
};
const titles = ["Hizmetini ve ustasını seç", "Gün ve Saat Seç", "Hizmet adresini ekle", "Her şey hazır mı?"];

export function ServiceBooking({ service, offers, variants, districts, unavailable, initialProvider, initialDistrict, initialVariant, initialRebook, savedAddresses = [] }: BookingProps) {
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const variantId = variants.find(v => v.id === initialVariant)?.id || variants[0]?.id || "";
  const [form, setForm] = useState({ variantId, districtId: districts.find(d => d.id === initialDistrict || d.name === initialDistrict)?.id || "", offeringId: offers.find(o => o.provider_id === initialProvider && (!variantId || o.variant_id === variantId))?.id || "", day: todayIstanbul(), startsAt: "", address: "", idempotencyKey: "" });
  const draftScope = `${initialProvider || ""}:${initialVariant || ""}:${initialDistrict || ""}:${initialRebook || ""}`;
  const clearDraft = useSessionFormDraft(`fuwu:commerce:${service.slug}:${draftScope}`, form, setForm);
  const resumeParams = new URLSearchParams({ ...(initialRebook ? { rebook: initialRebook } : {}), ...(initialProvider ? { provider: initialProvider } : {}), ...(initialVariant ? { variant: initialVariant } : {}), ...(initialDistrict ? { district: initialDistrict } : {}) });
  const resumePath = `/services/${service.slug}${resumeParams.size ? `?${resumeParams}` : ""}`;
  const [step, setStep] = useState(0);
  const [result, setResult] = useState({ key: "", slots: [] as Slot[], error: "" });
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const eligible = unavailable ? [] : offers.filter(o => (!form.districtId || o.district_ids.includes(form.districtId)) && (service.pricing_type !== "VARIANT_BASED" || o.variant_id === form.variantId));
  const selected = eligible.find(o => o.id === form.offeringId);
  const key = selected && form.day && form.districtId ? `${selected.id}|${form.day}|${form.districtId}|${retry}` : "";
  const loading = Boolean(key && key !== result.key);
  const slots = key === result.key ? result.slots : [];
  const validSlot = slots.some(s => s.starts_at === form.startsAt);
  const validAddress = form.address.trim().length >= 10 && form.address.length <= 1000;
  const canContinue = step === 0 ? Boolean(selected && form.districtId) : step === 1 ? validSlot : step === 2 ? validAddress : Boolean(selected && validSlot && validAddress);
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

  function go(next: number) {
    setStep(next); setError("");
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: "start", behavior: "instant" }); });
  }
  function change(field: "variantId" | "districtId" | "offeringId" | "day", value: string) {
    setForm(f => ({ ...f, [field]: value, ...(field === "districtId" ? { address: "" } : {}), startsAt: "", idempotencyKey: "", ...(["variantId", "districtId"].includes(field) ? { offeringId: "" } : {}) }));
    setError("");
  }
  async function reserve(e: React.FormEvent) {
    e.preventDefault();
    if (step < 3) { if (canContinue) go(step + 1); return; }
    if (!selected || !validSlot || !validAddress || busy) return;
    setBusy(true); setError(""); setNeedsLogin(false);
    const idempotencyKey = form.idempotencyKey || crypto.randomUUID();
    setForm(f => ({ ...f, idempotencyKey }));
    try {
      const response = await fetch("/api/commerce/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offeringId: selected.id, districtId: form.districtId, startsAt: form.startsAt, address: form.address.trim(), expectedPriceMinor: selected.price_minor, idempotencyKey }) });
      const body = await response.json();
      if (response.status === 401) { setNeedsLogin(true); throw new Error("unauthorized"); }
      if (!response.ok) throw new Error(body.error);
      clearDraft(); router.push(`/orders/${body.order.id}`);
    } catch (e) { setError(commerceError(String(e))); } finally { setBusy(false); }
  }

  const summary = <>
    <p className="commerce-eyebrow">RANDEVUNUN ÖZETİ</p><h2>{service.name}</h2>
    <dl><div><dt>Usta</dt><dd>{selected?.provider_name || "Ustanı seç"}</dd></div>
      {service.pricing_type === "VARIANT_BASED" && <div><dt>Paket</dt><dd>{variants.find(v => v.id === form.variantId)?.name || "Seçilmedi"}</dd></div>}
      <div><dt>Randevu</dt><dd>{validSlot ? appointment(form.startsAt) : "Gün ve saat seç"}</dd></div>
      <div><dt>İlçe</dt><dd>{districts.find(d => d.id === form.districtId)?.name || "İlçe seç"}</dd></div>
      <div><dt>Hizmet bedeli</dt><dd>{selected ? money(selected.price_minor) : "Usta seçimiyle belli olur"}</dd></div>
      <div><dt>Ek ücretler</dt><dd>{selected ? money(0) : "—"}</dd></div>
    </dl>
    <div className="commerce-summary-total"><span>Toplam</span><strong>{selected ? money(selected.price_minor) : "—"}</strong></div>
    <p className="commerce-help"><ShieldCheck size={17} aria-hidden /> Fiyat ve müsaitlik, devam ettiğinde tekrar doğrulanır.</p>
    <p className="commerce-sandbox">Test ortamı · Gerçek para tahsil edilmez.</p>
  </>;

  return <div className="commerce-page commerce-booking-page">
    <BookingProgress current={step + 1} />
    <Link className="commerce-back" href="/services"><ArrowLeft size={17} aria-hidden /> Hizmetlere dön</Link>
    <div className="booking-service-heading"><div className="booking-service-thumb"><Image src={service.image_url} alt={`${service.name} hizmetini tanıtan fotoğraf`} fill priority sizes="80px" /></div><div><p className="commerce-eyebrow">EVİN İÇİN BİR İŞ DAHA HALLOLSUN</p><h1>{service.name}</h1><p>{service.description}</p></div></div>
    <details className="booking-scope"><summary>Hizmet kapsamını gör <span>{service.pricing_type === "DIAGNOSTIC_SERVICE" ? "Yerinde tespit" : service.pricing_type === "VARIANT_BASED" ? "Paket seçimi" : "Sabit fiyat"}</span></summary><div><h2><Check size={16} aria-hidden /> Hizmete dahil</h2><p>{service.scope}</p><h2>Dahil olmayanlar</h2><p>{service.exclusions}</p></div></details>
    {unavailable && <p className="commerce-notice" role="status">Bu hizmet şu anda satın alınamıyor. Hizmet kapsamını inceleyebilir, diğer hizmetlere göz atabilirsin.</p>}
    <div className="commerce-booking-layout"><div>
      <form id="commerce-booking" onSubmit={reserve} className="commerce-booking-form" aria-busy={busy}>
        <div className="booking-step-heading"><p className="commerce-eyebrow">ADIM {step + 1} / 4</p><h2 tabIndex={-1} ref={heading}>{titles[step]}</h2><p>{["Bölgeni belirt, kapsamı ve fiyatı belli bir hizmet seç.", "Ustanın gerçek müsaitliğinden sana uygun bir saat seç.", "Ustanın sana kolayca ulaşması için açık adresini yaz.", "Bilgilerini kontrol et. Sonraki adımda ödeme için randevunu ayıralım."][step]}</p></div>
        {step === 0 && <>
          <section className="commerce-panel"><h3><MapPin size={20} aria-hidden /> Hizmet nerede verilecek?</h3>
            <label className="commerce-field">İlçe<select aria-label="İlçe" required value={form.districtId} onChange={e => change("districtId", e.target.value)}><option value="">İstanbul ilçeni seç</option>{districts.map(d => <option value={d.id} key={d.id}>{d.name}</option>)}</select></label>
            <p className="commerce-help">Seçtiğin bölgeye hizmet veren ustalar gösterilir.</p>
          </section>
          {service.pricing_type === "VARIANT_BASED" && <section className="commerce-panel"><h3>Hizmet paketini seç</h3><div className="commerce-choice-row">{variants.map(v => <button key={v.id} type="button" aria-pressed={form.variantId === v.id} onClick={() => change("variantId", v.id)}>{v.name}</button>)}</div></section>}
          <section className="commerce-panel" id="choose-provider"><h3><UserRound size={20} aria-hidden /> Ustanı seç</h3><div className="commerce-offer-list">{eligible.map(offer => <article className={`commerce-offer ${selected?.id === offer.id ? "is-selected" : ""}`} key={offer.id}>
            <div className="commerce-offer-person"><span className="commerce-avatar">{offer.profile_image_url ? <Image src={offer.profile_image_url} alt={offer.provider_name} fill sizes="56px" unoptimized /> : <UserRound size={26} aria-hidden />}</span><div><h3>{offer.provider_name}</h3><p className="commerce-rating"><Star size={14} aria-hidden /> {offer.review_count ? `${Number(offer.rating).toLocaleString("tr-TR")} · ${offer.review_count} değerlendirme` : "Henüz değerlendirme yok"}</p></div></div>
            <div className="commerce-offer-meta"><strong>{money(offer.price_minor)}</strong><span><Clock3 size={14} aria-hidden /> {offer.duration_minutes} dakika</span><span>{offer.district_ids.map(id => districts.find(d => d.id === id)?.name).filter(Boolean).join(", ")}</span></div>
            <div className="commerce-offer-actions"><Link href={`/providers/${offer.provider_id}`} target="_blank" rel="noopener">Ustayı İncele<span className="sr-only"> (yeni sekme)</span></Link><button type="button" disabled={!form.districtId} aria-pressed={selected?.id === offer.id} onClick={() => change("offeringId", offer.id)}>{selected?.id === offer.id ? <><Check size={16} aria-hidden /> Usta seçildi</> : "Bu Ustayla Devam Et"}</button></div>
          </article>)}</div>{!eligible.length && <div className="commerce-empty compact"><UserRound size={28} aria-hidden /><h3>Bu seçim için uygun hizmet yok</h3><p>Başka bir bölge veya hizmet seçebilirsin.</p><Link className="commerce-secondary" href="/services">Diğer Hizmetleri Gör</Link></div>}{eligible.length > 0 && !form.districtId && <p className="commerce-help">Usta seçmek için önce ilçeni belirt.</p>}</section>
        </>}
        {step === 1 && <section className="commerce-panel"><h3><CalendarDays size={20} aria-hidden /> Randevunu planla</h3>
          <div className="booking-day-rail" aria-label="Hızlı gün seçimi">{bookingDays(todayIstanbul()).map(day => <button type="button" aria-pressed={form.day === day.iso} key={day.iso} onClick={() => change("day", day.iso)}><strong>{day.label}</strong><span>{day.date}</span></button>)}</div>
          <label className="commerce-field">Randevu günü<input type="date" min={todayIstanbul()} max={maxDate.toISOString().slice(0, 10)} required value={form.day} onChange={e => change("day", e.target.value)} /></label>
          <p className="commerce-help">Tüm saatler Türkiye saatidir. Hizmet süresi ve mevcut randevular hesaba katılır.</p>
          <div aria-live="polite">{!key ? <p className="commerce-notice">Müsait saatleri görmek için önce ilçe ve usta seç.</p> : loading ? <div className="commerce-slot-grid" aria-label="Müsait saatler yükleniyor" role="status">{[1,2,3,4].map(n => <span className="commerce-skeleton h-12" key={n} />)}</div> : result.error ? <><p role="alert" className="commerce-error">{result.error}</p><button className="commerce-secondary" type="button" onClick={() => { setResult({ key: "", slots: [], error: "" }); setRetry(r => r + 1); }}>Yeniden Dene</button></> : !slots.length ? <p className="commerce-notice">Bu gün için uygun randevu yok. Başka bir gün veya usta seçebilirsin.</p> : <fieldset><legend className="commerce-field-title">Müsait saatler</legend><div className="commerce-slot-grid">{slots.map(s => <label className={`commerce-slot ${form.startsAt === s.starts_at ? "is-selected" : ""}`} key={s.starts_at}><input type="radio" name="slot" value={s.starts_at} checked={form.startsAt === s.starts_at} onChange={() => setForm(f => ({ ...f, startsAt: s.starts_at, idempotencyKey: "" }))} />{slotTime(s.starts_at)}</label>)}</div></fieldset>}</div>
        </section>}
        {step === 2 && <section className="commerce-panel"><h3><MapPin size={20} aria-hidden /> Hizmet adresin</h3>
          {savedAddresses.length > 0 && <label className="commerce-field">Kayıtlı adreslerim<select value={savedAddresses.find(a => a.address === form.address && a.district_id === form.districtId)?.id || ""} onChange={e => { const address = savedAddresses.find(a => a.id === e.target.value); if (address && address.district_id === form.districtId) setForm(f => ({ ...f, address: address.address, idempotencyKey: "" })); }}><option value="">Bu ilçedeki kayıtlı adresini seç</option>{savedAddresses.filter(a => a.district_id === form.districtId).map(address => <option key={address.id} value={address.id}>{address.label}</option>)}</select></label>}
          <p className="commerce-help">{districts.find(d => d.id === form.districtId)?.name}, İstanbul <button type="button" className="booking-inline-edit" onClick={() => go(0)}>İlçeyi değiştir</button></p>
          <label className="commerce-field">Mahalle, sokak, bina ve daire<textarea autoComplete="street-address" required minLength={10} maxLength={1000} rows={4} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value, idempotencyKey: "" }))} placeholder="Mahalle, sokak, bina no, kat ve daire" aria-describedby="booking-address-help" /></label>
          <p className="commerce-help" id="booking-address-help">En az 10 karakter yaz. Giriş tarifi ve varsa kapı bilgilerini de ekleyebilirsin.</p>
        </section>}
        {step === 3 && <section className="commerce-panel booking-review"><h3><Check size={20} aria-hidden /> Son bir kontrol</h3><div className="booking-review-summary">{summary}</div><div className="booking-review-row"><div><strong>Hizmet adresi</strong><p>{form.address}</p></div><button className="booking-inline-edit" type="button" onClick={() => go(2)}>Düzenle</button></div><p className="commerce-help">Randevun ödeme için 10 dakika ayrılır. Güvenli ödeme onayından sonra kesinleşir.</p></section>}
        {error && <p role="alert" className="commerce-error">{error}</p>}
        {needsLogin && <Link className="commerce-button" href={buildLoginRedirectUrl(resumePath)}>Giriş Yap ve Devam Et</Link>}
        <div className="booking-desktop-actions">{step > 0 && <button className="commerce-secondary" type="button" disabled={busy} onClick={() => go(step - 1)}><ArrowLeft size={17} aria-hidden /> Geri</button>}<button className="commerce-button" disabled={!canContinue || busy} type="submit">{busy ? "Randevu ayrılıyor…" : step === 3 ? "Sipariş Özetine Geç" : "Devam Et"}<ArrowRight size={18} aria-hidden /></button></div>
      </form>
    </div><aside className="commerce-summary booking-live-summary">{summary}{step > 0 && <button type="button" className="commerce-text-link" disabled={busy} onClick={() => go(0)}>Seçimlerimi düzenle</button>}</aside></div>
    <div className="commerce-sticky booking-sticky">{step > 0 && <button className="booking-back-button" type="button" aria-label="Önceki adım" disabled={busy} onClick={() => go(step - 1)}><ArrowLeft size={20} aria-hidden /></button>}<div><small>Toplam</small><strong>{selected ? money(selected.price_minor) : "Ustanı seç"}</strong></div><button className="commerce-button" type="submit" form="commerce-booking" disabled={!canContinue || busy}>{busy ? "Ayrılıyor…" : step === 3 ? "Randevu Planla" : "Devam Et"}<ArrowRight size={17} aria-hidden /></button></div>
  </div>;
}
