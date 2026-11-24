"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Banknote, CalendarDays, Check, Clock3, CreditCard, MapPin, Minus, Plus, ShieldCheck, ShoppingBag, Star, UserRound } from "lucide-react";
import { appointment, commerceError, money, slotTime, todayIstanbul } from "@/lib/commerce/display";
import { bookingDays } from "@/lib/commerce/booking";
import type { CatalogService, PaymentMethod, PublicOffer, ServiceAddon, ServiceVariant, Slot } from "@/lib/commerce/types";
import { persistSessionFormDraft, useSessionFormDraft } from "@/lib/hooks/useSessionFormDraft";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { BookingProgress } from "./BookingProgress";
import { OfferAvailability } from "./OfferAvailability";
import { sandboxPaymentUrl } from "@/lib/commerce/payment";
import { basketMatches, decodeBasket, encodeBasket, type BasketQuote, type BasketSelection } from "@/lib/commerce/pricing";
import { ServicePhoto } from "@/components/ui/ServicePhoto";

type BookingProps = {
  service: CatalogService; offers: PublicOffer[]; variants: ServiceVariant[];
  districts: { id: string; name: string }[]; unavailable: boolean;
  addons?: ServiceAddon[]; cardPaymentEnabled?: boolean;
  initialProvider?: string; initialDistrict?: string; initialVariant?: string; initialRebook?: string;
  savedAddresses?: { id: string; label: string; district_id: string; address: string }[];
};
const titles = ["Paketini, ekstralarını ve ustanı seç", "Gün ve Saat Seç", "Adresini ve ustaya notunu ekle", "Ödeme yöntemini seç ve onayla"];
const leads = ["Bölgeni belirt, paketini seç, istersen ekstra ekle ve ustanı seç.", "Ustanın gerçek takviminden sana uygun saati seç; randevu bu saate göre oluşur.", "Ustanın sana kolayca ulaşması için açık adresini yaz.", "Toplam tutar sabittir. Kapıda ödemede ödemeyi iş bitince ustana yaparsın."];
const NOTE_LIMIT = 500;

export function ServiceBooking({ service, offers, variants, districts, unavailable, addons = [], cardPaymentEnabled = false, initialProvider, initialDistrict, initialVariant, initialRebook, savedAddresses = [] }: BookingProps) {
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const variantId = variants.find(v => v.id === initialVariant)?.id || variants[0]?.id || "";
  const [form, setForm] = useState({ variantId, districtId: districts.find(d => d.id === initialDistrict || d.name === initialDistrict)?.id || "", offeringId: offers.find(o => o.provider_id === initialProvider && (!variantId || o.variant_id === variantId))?.id || "", preferredProviderId: initialProvider || "", day: todayIstanbul(), startsAt: "", address: "", note: "", addons: "", paymentMethod: "PAY_AT_DOOR", idempotencyKey: "", stage: "0" });
  const draftScope = `${initialProvider || ""}:${initialVariant || ""}:${initialDistrict || ""}:${initialRebook || ""}`;
  const draftKey = `fuwu:commerce:${service.slug}:${draftScope}`;
  const clearDraft = useSessionFormDraft(draftKey, form, setForm);
  const resumeParams = new URLSearchParams({ ...(initialRebook ? { rebook: initialRebook } : {}), ...(initialProvider ? { provider: initialProvider } : {}), ...(initialVariant ? { variant: initialVariant } : {}), ...(initialDistrict ? { district: initialDistrict } : {}) });
  const resumePath = `/services/${service.slug}${resumeParams.size ? `?${resumeParams}` : ""}`;
  const step = /^[0-3]$/.test(form.stage) ? Number(form.stage) : 0;
  const [quickDays, setQuickDays] = useState({ key: "", days: [] as string[] });
  const [result, setResult] = useState({ key: "", slots: [] as Slot[], error: "" });
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

  // Sepet: yalnızca bu hizmetin aktif ekstraları, en fazla izin verilen adette. Taslaktan gelen bozuk değer boş sepet olur.
  const serviceAddons = useMemo(() => addons.filter(addon => addon.service_id === service.id && addon.is_active).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "tr")), [addons, service.id]);
  const basket: BasketSelection = useMemo(() => (decodeBasket(form.addons) ?? []).filter(line => { const addon = serviceAddons.find(item => item.id === line.id); return addon && line.quantity <= addon.max_quantity; }), [form.addons, serviceAddons]);
  const basketKey = encodeBasket(basket);
  const addonsMinor = basket.reduce((sum, line) => sum + (serviceAddons.find(item => item.id === line.id)?.price_minor ?? 0) * line.quantity, 0);
  const quantityOf = (id: string) => basket.find(line => line.id === id)?.quantity ?? 0;

  const eligible = unavailable ? [] : offers.filter(o => (!form.districtId || o.district_ids.includes(form.districtId)) && (service.pricing_type !== "VARIANT_BASED" || o.variant_id === form.variantId));
  const selected = eligible.find(o => o.id === form.offeringId);
  const cardAvailable = cardPaymentEnabled && selected?.card_payment !== false;
  const paymentMethod: PaymentMethod = form.paymentMethod === "CARD" && cardAvailable ? "CARD" : "PAY_AT_DOOR";
  const pricingKey = selected ? `${selected.id}|${basketKey}` : "";
  const [pricing, setPricing] = useState<{ key: string; quote: BasketQuote | null; error: boolean }>({ key: "", quote: null, error: false });
  const [consentKey, setConsentKey] = useState("");
  const quote = pricingKey && pricing.key === pricingKey ? pricing.quote : null;
  const quoteKey = quote && selected ? `${pricingKey}:${quote.total_minor}:${quote.customer_fee_bps}:${quote.terms_version}:${paymentMethod}` : "";
  const consent = Boolean(quoteKey && consentKey === quoteKey);
  const key = selected && form.day && form.districtId ? `${selected.id}|${form.day}|${form.districtId}|${retry}` : "";
  const loading = Boolean(key && key !== result.key);
  const slots = key === result.key ? result.slots : [];
  const validSlot = slots.some(s => s.starts_at === form.startsAt);
  const validAddress = form.address.trim().length >= 10 && form.address.length <= 1000;
  const validNote = form.note.length <= NOTE_LIMIT;
  const canContinue = step === 0 ? Boolean(selected && form.districtId) : step === 1 ? validSlot : step === 2 ? validAddress && validNote : Boolean(selected && validSlot && validAddress && validNote && quote && consent);
  const maxDate = new Date(`${todayIstanbul()}T12:00:00+03:00`); maxDate.setUTCDate(maxDate.getUTCDate() + 30);
  const quickKey = selected && form.districtId ? `${selected.id}|${form.districtId}|${todayIstanbul()}|${retry}` : "";
  const submitLabel = busy ? (paymentMethod === "CARD" ? "Ödeme hazırlanıyor…" : "Sipariş oluşturuluyor…") : step === 3 ? (paymentMethod === "CARD" ? "Ödemeye Geç" : "Siparişi Onayla") : "Devam Et";

  useEffect(() => {
    if (!selected || !pricingKey) return;
    const controller = new AbortController();
    const [offering, encoded] = pricingKey.split("|");
    fetch(`/api/commerce/quote?${new URLSearchParams({ offering, ...(encoded ? { addons: encoded } : {}) })}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("pricing_unavailable"); return response.json(); })
      .then(body => {
        const q = body.quote as BasketQuote;
        // Sunucu tutarı istemcide bağımsız olarak yeniden hesaplanır; tutmazsa onay verilemez.
        if (!basketMatches(q, selected.price_minor, serviceAddons, decodeBasket(encoded) ?? [])) throw new Error("invalid_price");
        if (!controller.signal.aborted) setPricing({ key: pricingKey, quote: q, error: false });
      }).catch(() => { if (!controller.signal.aborted) setPricing({ key: pricingKey, quote: null, error: true }); });
    return () => controller.abort();
  }, [selected, pricingKey, serviceAddons, retry]);

  useEffect(() => {
    if (!quickKey) return;
    const controller = new AbortController();
    const [offering, district, day] = quickKey.split("|");
    fetch(`/api/commerce/slots?${new URLSearchParams({ offering, district, day, days: "7" })}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("store_unavailable"); return response.json(); })
      .then(body => { if (!controller.signal.aborted) setQuickDays({ key: quickKey, days: (body.days ?? []).filter((entry: { slots: Slot[] }) => entry.slots.length > 0).map((entry: { day: string }) => entry.day) }); })
      .catch(() => { if (!controller.signal.aborted) setQuickDays({ key: quickKey, days: [] }); });
    return () => controller.abort();
  }, [quickKey]);

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
    setForm(f => ({ ...f, stage: String(next) })); setError("");
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: "start", behavior: "instant" }); });
  }
  function change(field: "variantId" | "districtId" | "offeringId" | "day", value: string) {
    setForm(f => {
      const next = { ...f, [field]: value, ...(field === "districtId" ? { address: "" } : {}), startsAt: "", idempotencyKey: "" };
      if (field === "offeringId") next.preferredProviderId = offers.find(o => o.id === value)?.provider_id || "";
      if (field === "variantId" || field === "districtId") next.offeringId = offers.find(o => o.provider_id === f.preferredProviderId && (service.pricing_type !== "VARIANT_BASED" || o.variant_id === next.variantId) && (!next.districtId || o.district_ids.includes(next.districtId)))?.id || "";
      return next;
    });
    setError(""); setConsentKey("");
  }
  function setQuantity(addon: ServiceAddon, quantity: number) {
    const bounded = Math.max(0, Math.min(addon.max_quantity, quantity));
    const next = [...basket.filter(line => line.id !== addon.id), ...(bounded ? [{ id: addon.id, quantity: bounded }] : [])];
    setForm(f => ({ ...f, addons: encodeBasket(next), idempotencyKey: "" })); setConsentKey(""); setError("");
  }
  function choosePayment(method: PaymentMethod) {
    setForm(f => ({ ...f, paymentMethod: method, idempotencyKey: "" })); setConsentKey(""); setError("");
  }
  async function reserve(e: React.FormEvent) {
    e.preventDefault();
    if (step < 3) { if (canContinue) go(step + 1); return; }
    if (!selected || !validSlot || !validAddress || !validNote || !quote || !consent || busy) return;
    setBusy(true); setError(""); setNeedsLogin(false);
    const idempotencyKey = form.idempotencyKey || crypto.randomUUID();
    setForm(f => ({ ...f, idempotencyKey }));
    try {
      const response = await fetch("/api/commerce/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offeringId: selected.id, districtId: form.districtId, startsAt: form.startsAt, address: form.address.trim(), note: form.note.trim() || null, addons: basketKey, paymentMethod, expectedTotalMinor: quote.total_minor, feeConsent: consent, termsVersion: quote.terms_version, idempotencyKey }) });
      const body = await response.json();
      if (response.status === 401) {
        // Flush synchronously before leaving the tab; never put the address in the URL.
        try { persistSessionFormDraft(draftKey, { ...form, idempotencyKey }); }
        catch { throw new Error("checkout_draft_unavailable"); }
        router.push(buildLoginRedirectUrl(resumePath)); setNeedsLogin(true); throw new Error("unauthorized");
      }
      if (!response.ok) throw new Error(body.error);
      if (paymentMethod === "PAY_AT_DOOR") { clearDraft(); router.push(`/orders/${body.order.id}?siparis=alindi`); return; }
      // Keep the durable order accessible if initialization fails or times out.
      try {
        const checkout = await fetch("/api/commerce/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: body.order.id }) });
        const payment = await checkout.json();
        if (!checkout.ok) throw new Error(payment.error);
        const url = sandboxPaymentUrl(payment.paymentPageUrl);
        clearDraft(); window.location.assign(url);
      } catch { clearDraft(); router.push(`/orders/${body.order.id}`); }
    } catch (e) { setError(commerceError(String(e))); if (/fee_changed|price_changed|invalid_addons/.test(String(e))) { setPricing({ key: "", quote: null, error: false }); setConsentKey(""); setRetry(r => r + 1); } } finally { setBusy(false); }
  }

  const basketLines = basket.map(line => ({ line, addon: serviceAddons.find(item => item.id === line.id) })).filter((entry): entry is { line: BasketSelection[number]; addon: ServiceAddon } => Boolean(entry.addon));
  const summary = <>
    <p className="commerce-eyebrow">SEPETİN</p><h2>{service.name}</h2>
    <dl><div><dt>Usta</dt><dd>{selected?.provider_name || "Ustanı seç"}</dd></div>
      {service.pricing_type === "VARIANT_BASED" && <div><dt>Paket</dt><dd>{variants.find(v => v.id === form.variantId)?.name || "Seçilmedi"}</dd></div>}
      {basketLines.map(({ line, addon }) => <div key={addon.id}><dt>{addon.name}{line.quantity > 1 ? ` × ${line.quantity}` : ""}</dt><dd>+{money(addon.price_minor * line.quantity)}</dd></div>)}
      <div><dt>Randevu</dt><dd>{validSlot ? appointment(form.startsAt) : "Gün ve saat seç"}</dd></div>
      <div><dt>İlçe</dt><dd>{districts.find(d => d.id === form.districtId)?.name || "İlçe seç"}</dd></div>
      <div><dt>Hizmet süresi</dt><dd>{selected ? `${selected.duration_minutes} dakika` : "Usta seçimiyle belli olur"}</dd></div>
      <div><dt>Ödeme</dt><dd>{paymentMethod === "CARD" ? "Online kartla" : "Kapıda, iş bitince"}</dd></div>
    </dl>
    <div className="commerce-summary-total"><span>{paymentMethod === "CARD" ? "Ödeyeceğin tutar" : "İş bitince ödeyeceğin tutar"}<small className="block text-xs font-medium opacity-75">Tüm ücretler dahil · sürpriz yok</small></span><strong>{quote ? money(quote.total_minor) : selected ? "Hesaplanıyor" : addonsMinor ? `Ekstralar +${money(addonsMinor)}` : "—"}</strong></div>
    {pricingKey && pricing.key === pricingKey && pricing.error && <p role="alert" className="commerce-error">Toplam ücret doğrulanamadı. <button type="button" className="booking-inline-edit" onClick={() => setRetry(r => r + 1)}>Yeniden dene</button></p>}
    <p className="commerce-help"><ShieldCheck size={17} aria-hidden /> Gördüğün fiyat, ödediğin fiyattır. Onayın olmadan ek ücret alınmaz.</p>
    {paymentMethod === "CARD" && <p className="commerce-sandbox">Test ortamı · Gerçek para tahsil edilmez.</p>}
  </>;

  return <div className="commerce-page commerce-booking-page">
    <BookingProgress current={step + 1} withPayment={paymentMethod === "CARD"} />
    <Link className="commerce-back" href="/services"><ArrowLeft size={17} aria-hidden /> Hizmetlere dön</Link>
    <div className="booking-service-heading"><div className="booking-service-thumb"><ServicePhoto keys={[service.slug]} src={service.image_url} label={service.name} preload sizes="80px" /></div><div><p className="commerce-eyebrow">HİZMETİ SATIN AL</p><h1>{service.name}</h1><p>{service.description}</p></div></div>
    <ul className="booking-promise" aria-label="Satın alma güvenceleri"><li><Check size={15} aria-hidden /> Fiyat baştan belli</li><li><CalendarDays size={15} aria-hidden /> Randevu ustanın gerçek takviminden</li><li><Banknote size={15} aria-hidden /> Ödeme iş bitince kapıda</li></ul>
    <details className="booking-scope"><summary>Hizmet kapsamını gör <span>{service.pricing_type === "DIAGNOSTIC_SERVICE" ? "Yerinde tespit" : service.pricing_type === "VARIANT_BASED" ? "Paket seçimi" : "Sabit fiyat"}</span></summary><div><h2><Check size={16} aria-hidden /> Hizmete dahil</h2><p>{selected?.scope || service.scope}</p><h2>Dahil olmayanlar</h2><p>{service.exclusions}</p></div></details>
    {unavailable && <p className="commerce-notice" role="status">Bu hizmet şu anda satın alınamıyor. Hizmet kapsamını inceleyebilir, diğer hizmetlere göz atabilirsin.</p>}
    <div className="commerce-booking-layout"><div>
      <form id="commerce-booking" onSubmit={reserve} className="commerce-booking-form" aria-busy={busy}>
        <div className="booking-step-heading"><p className="commerce-eyebrow">ADIM {step + 1} / 4</p><h2 tabIndex={-1} ref={heading}>{titles[step]}</h2><p>{leads[step]}</p></div>
        {step === 0 && <>
          <section className="commerce-panel"><h3><MapPin size={20} aria-hidden /> Hizmet nerede verilecek?</h3>
            <label className="commerce-field">İlçe<select aria-label="İlçe" required value={form.districtId} onChange={e => change("districtId", e.target.value)}><option value="">İstanbul ilçeni seç</option>{districts.map(d => <option value={d.id} key={d.id}>{d.name}</option>)}</select></label>
            <p className="commerce-help">Seçtiğin bölgeye hizmet veren ustalar gösterilir.</p>
            {form.preferredProviderId && !selected && <p className="commerce-notice" role="status">Seçtiğin ustanın bu paket veya bölgede uygun hizmeti bulunmuyor. Başka bir ustayla devam etmek istersen onu kendin seçmelisin.</p>}
          </section>
          {service.pricing_type === "VARIANT_BASED" && <section className="commerce-panel"><h3>Hizmet paketini seç</h3><div className="commerce-choice-row">{variants.map(v => <button key={v.id} type="button" aria-pressed={form.variantId === v.id} onClick={() => change("variantId", v.id)}>{v.name}</button>)}</div></section>}
          {serviceAddons.length > 0 && <section className="commerce-panel booking-extras" aria-labelledby="booking-extras-title"><h3 id="booking-extras-title"><ShoppingBag size={20} aria-hidden /> Ekstra ister misin? <small>İsteğe bağlı</small></h3>
            <ul>{serviceAddons.map(addon => { const quantity = quantityOf(addon.id); return <li key={addon.id} className={quantity ? "is-selected" : ""}>
              <div><strong>{addon.name}</strong>{addon.description && <p>{addon.description}</p>}<span className="booking-extra-price">+{money(addon.price_minor)}{addon.max_quantity > 1 ? " / adet" : ""}</span></div>
              {addon.max_quantity > 1 ? <div className="booking-stepper" role="group" aria-label={`${addon.name} adedi`}>
                <button type="button" aria-label={`${addon.name} azalt`} disabled={!quantity} onClick={() => setQuantity(addon, quantity - 1)}><Minus size={16} aria-hidden /></button>
                <output aria-live="polite">{quantity}</output>
                <button type="button" aria-label={`${addon.name} ekle`} disabled={quantity >= addon.max_quantity} onClick={() => setQuantity(addon, quantity + 1)}><Plus size={16} aria-hidden /></button>
              </div> : <button type="button" className="booking-extra-toggle" aria-pressed={quantity > 0} onClick={() => setQuantity(addon, quantity ? 0 : 1)}>{quantity ? <><Check size={15} aria-hidden /> Eklendi</> : <><Plus size={15} aria-hidden /> Ekle</>}</button>}
            </li>; })}</ul>
            <p className="commerce-help">{addonsMinor ? `Ekstralar toplamı +${money(addonsMinor)}. ` : ""}Ekstralar ustanın aynı randevuda yaptığı ek işlerdir; fiyatları sabittir.</p>
          </section>}
          <section className="commerce-panel" id="choose-provider"><h3><UserRound size={20} aria-hidden /> Ustanı seç</h3><div className="commerce-offer-list">{eligible.map(offer => <article className={`commerce-offer ${selected?.id === offer.id ? "is-selected" : ""}`} key={offer.id}>
            <div className="commerce-offer-person"><span className="commerce-avatar">{offer.profile_image_url ? <Image src={offer.profile_image_url} alt={offer.provider_name} fill sizes="56px" unoptimized /> : <UserRound size={26} aria-hidden />}</span><div><h3>{offer.provider_name}</h3><p className="commerce-rating"><Star size={14} aria-hidden /> {offer.review_count ? `${Number(offer.rating).toLocaleString("tr-TR")} · ${offer.review_count} değerlendirme` : "Henüz değerlendirme yok"}</p></div></div>
            <div className="commerce-offer-meta"><strong>{money(offer.customer_price_minor ?? offer.price_minor)}</strong><span><Clock3 size={14} aria-hidden /> {offer.duration_minutes} dakika</span><span>{offer.district_ids.map(id => districts.find(d => d.id === id)?.name).filter(Boolean).join(", ")}</span></div>
            <p className="commerce-help">Uzmanlık: {service.name}{offer.variant_name ? ` · ${offer.variant_name}` : ""}{addonsMinor ? ` · Ekstralar ayrıca +${money(addonsMinor)}` : ""}</p>
            <OfferAvailability offeringId={offer.id} districtId={form.districtId} />
            <div className="commerce-offer-actions"><Link href={`/providers/${offer.provider_id}`} target="_blank" rel="noopener">Ustayı İncele<span className="sr-only"> (yeni sekme)</span></Link><button type="button" disabled={!form.districtId} aria-pressed={selected?.id === offer.id} onClick={() => change("offeringId", offer.id)}>{selected?.id === offer.id ? <><Check size={16} aria-hidden /> Usta seçildi</> : "Bu Ustayla Devam Et"}</button></div>
          </article>)}</div>{!eligible.length && <div className="commerce-empty compact"><UserRound size={28} aria-hidden /><h3>{offers.length ? "Bu seçim için uygun usta yok" : "Bu hizmette usta takvimleri açılıyor"}</h3><p>{offers.length ? "Başka bir ilçe veya paket seçebilirsin." : "Ustanın boş saati açıldığında bu hizmeti buradan doğrudan satın alırsın. Şimdilik diğer hizmetlere göz atabilirsin."}</p><Link className="commerce-secondary" href="/services">Diğer Hizmetleri Gör</Link></div>}{eligible.length > 0 && !form.districtId && <p className="commerce-help">Usta seçmek için önce ilçeni belirt.</p>}</section>
        </>}
        {step === 1 && <section className="commerce-panel"><h3><CalendarDays size={20} aria-hidden /> Randevunu planla</h3>
          <div className="booking-day-rail" aria-label="Müsait günler">{bookingDays(todayIstanbul()).filter(day => quickDays.key === quickKey && quickDays.days.includes(day.iso)).map(day => <button type="button" aria-pressed={form.day === day.iso} key={day.iso} onClick={() => change("day", day.iso)}><strong>{day.label}</strong><span>{day.date}</span></button>)}</div>
          <label className="commerce-field">Randevu günü<input type="date" min={todayIstanbul()} max={maxDate.toISOString().slice(0, 10)} required value={form.day} onChange={e => change("day", e.target.value)} /></label>
          <p className="commerce-help">Tüm saatler Türkiye saatidir. Hizmet süresi ve mevcut randevular hesaba katılır.</p>
          <div aria-live="polite">{!key ? <p className="commerce-notice">Müsait saatleri görmek için önce ilçe ve usta seç.</p> : loading ? <div className="commerce-slot-grid" aria-label="Müsait saatler yükleniyor" role="status">{[1,2,3,4].map(n => <span className="commerce-skeleton h-12" key={n} />)}</div> : result.error ? <><p role="alert" className="commerce-error">{result.error}</p><button className="commerce-secondary" type="button" onClick={() => { setResult({ key: "", slots: [], error: "" }); setRetry(r => r + 1); }}>Yeniden Dene</button></> : !slots.length ? <p className="commerce-notice">Bu gün için uygun randevu yok. Başka bir gün veya usta seçebilirsin.</p> : <fieldset><legend className="commerce-field-title">Müsait saatler</legend><div className="commerce-slot-grid">{slots.map(s => <label className={`commerce-slot ${form.startsAt === s.starts_at ? "is-selected" : ""}`} key={s.starts_at}><input type="radio" name="slot" value={s.starts_at} checked={form.startsAt === s.starts_at} onChange={() => setForm(f => ({ ...f, startsAt: s.starts_at, idempotencyKey: "" }))} />{slotTime(s.starts_at)}</label>)}</div></fieldset>}</div>
        </section>}
        {step === 2 && <section className="commerce-panel"><h3><MapPin size={20} aria-hidden /> Hizmet adresin</h3>
          {savedAddresses.length > 0 && <label className="commerce-field">Kayıtlı adreslerim<select value={savedAddresses.find(a => a.address === form.address && a.district_id === form.districtId)?.id || ""} onChange={e => { const address = savedAddresses.find(a => a.id === e.target.value); if (address && address.district_id === form.districtId) setForm(f => ({ ...f, address: address.address, idempotencyKey: "" })); }}><option value="">Bu ilçedeki kayıtlı adresini seç</option>{savedAddresses.filter(a => a.district_id === form.districtId).map(address => <option key={address.id} value={address.id}>{address.label}</option>)}</select></label>}
          <p className="commerce-help">{districts.find(d => d.id === form.districtId)?.name}, İstanbul <button type="button" className="booking-inline-edit" onClick={() => go(0)}>İlçeyi değiştir</button></p>
          <label className="commerce-field">Mahalle, sokak, bina ve daire<textarea autoComplete="street-address" required minLength={10} maxLength={1000} rows={4} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value, idempotencyKey: "" }))} placeholder="Mahalle, sokak, bina no, kat ve daire" aria-describedby="booking-address-help" /></label>
          <p className="commerce-help" id="booking-address-help">En az 10 karakter yaz. Giriş tarifi ve varsa kapı bilgilerini de ekleyebilirsin.</p>
          <label className="commerce-field">Ustaya not <small>İsteğe bağlı</small><textarea maxLength={NOTE_LIMIT} rows={3} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value.slice(0, NOTE_LIMIT), idempotencyKey: "" }))} placeholder="Örn. Zil çalışmıyor, gelince arayın. Musluk mutfakta." aria-describedby="booking-note-help" /></label>
          <p className="commerce-help" id="booking-note-help">{form.note.length} / {NOTE_LIMIT}. Not yalnızca ustana gösterilir; kart, şifre veya kimlik bilgisi yazma.</p>
        </section>}
        {step === 3 && <>
          <section className="commerce-panel booking-payment" aria-labelledby="booking-payment-title"><h3 id="booking-payment-title"><Banknote size={20} aria-hidden /> Ödeme yöntemi</h3>
            <div className="booking-payment-options" role="radiogroup" aria-label="Ödeme yöntemi">
              <label className={`booking-payment-option ${paymentMethod === "PAY_AT_DOOR" ? "is-selected" : ""}`}><input type="radio" name="payment-method" value="PAY_AT_DOOR" checked={paymentMethod === "PAY_AT_DOOR"} onChange={() => choosePayment("PAY_AT_DOOR")} /><Banknote size={22} aria-hidden /><span><strong>Kapıda öde</strong><small>İş bitince toplam tutarı ustana ödersin. Randevun hemen onaylanır.</small></span></label>
              {cardAvailable ? <label className={`booking-payment-option ${paymentMethod === "CARD" ? "is-selected" : ""}`}><input type="radio" name="payment-method" value="CARD" checked={paymentMethod === "CARD"} onChange={() => choosePayment("CARD")} /><CreditCard size={22} aria-hidden /><span><strong>Online kartla öde</strong><small>Kart bilgilerin iyzico güvenli ödeme ekranına girilir. Randevun ödeme için 10 dakika ayrılır.</small></span></label>
                : <p className="booking-payment-soon"><CreditCard size={18} aria-hidden /> Online kartla ödeme yakında açılıyor.</p>}
            </div>
            {paymentMethod === "PAY_AT_DOOR" && <p className="commerce-help">Usta, hizmete başlamadan ödeme isteyemez. İş bitince ödersin; sorun olursa sipariş sayfandan destek istersin.</p>}
          </section>
          <section className="commerce-panel booking-review"><h3><Check size={20} aria-hidden /> Son bir kontrol</h3><div className="booking-review-summary">{summary}</div><div className="booking-review-row"><div><strong>Hizmet adresi</strong><p>{form.address}</p>{form.note.trim() && <><strong>Ustaya not</strong><p>{form.note.trim()}</p></>}</div><button className="booking-inline-edit" type="button" onClick={() => go(2)}>Düzenle</button></div><h3>Hizmete dahil</h3><p className="commerce-help">{selected?.scope || service.scope}</p><h3>Malzeme ve ek işçilik / dahil olmayanlar</h3><p className="commerce-help">{service.exclusions || "Yalnızca yukarıdaki kapsam satın alınır."} Kapsam dışı malzeme veya işçilik bu tutara dahil değildir; onayın olmadan ek ücret alınmaz.</p>{service.pricing_type === "DIAGNOSTIC_SERVICE" && <p className="commerce-notice">Bu bedel keşif ve arıza tespiti içindir. Onarım ve parçalar bu pakete dahil değildir.</p>}<h3>İptal</h3><p className="commerce-help">Randevu başlamadan, usta yola çıkmamışken sipariş detayından ücretsiz iptal edebilirsin.{paymentMethod === "CARD" ? " Kartla ödenen siparişin iadesi ödeme kuruluşundan doğrulanana kadar beklemede görünür." : ""}</p><p className="commerce-help">Ayrıntılar için <Link href="/kullanim-sartlari" target="_blank" rel="noopener">kullanım, iptal ve iade koşullarını</Link> inceleyebilirsin.</p>{!loading && (!selected || !validSlot) && <p className="commerce-warning" role="status">Seçimin artık uygun değil. Ustanı ve güncel saatleri tekrar kontrol et.</p>}<button className="booking-inline-edit" type="button" onClick={() => go(selected ? 1 : 0)}>Usta ve saati kontrol et</button>{quote && <label className="commerce-checkbox booking-fee-consent"><input type="checkbox" checked={consent} onChange={event => setConsentKey(event.target.checked ? quoteKey : "")} />{paymentMethod === "CARD" ? `Hizmet kapsamını, iptal ve iade koşullarını okudum. Tüm ücretler dahil ${money(quote.total_minor)} ödemeyi onaylıyorum.` : `Hizmet kapsamını ve iptal koşullarını okudum. Tüm ücretler dahil ${money(quote.total_minor)} tutarı iş bitince kapıda ödemeyi onaylıyorum.`}</label>}</section>
        </>}
        {error && <p role="alert" className="commerce-error">{error}</p>}
        {needsLogin && <Link className="commerce-secondary" href={buildLoginRedirectUrl(resumePath)}>Google ile Giriş Yap ve Devam Et</Link>}
        <div className="booking-desktop-actions">{step > 0 && <button className="commerce-secondary" type="button" disabled={busy} onClick={() => go(step - 1)}><ArrowLeft size={17} aria-hidden /> Geri</button>}<button className="commerce-button" disabled={!canContinue || busy} type="submit">{submitLabel}<ArrowRight size={18} aria-hidden /></button></div>
      </form>
    </div><aside className="commerce-summary booking-live-summary">{summary}{step > 0 && <button type="button" className="commerce-text-link" disabled={busy} onClick={() => go(0)}>Seçimlerimi düzenle</button>}</aside></div>
    <div className="commerce-sticky booking-sticky">{step > 0 && <button className="booking-back-button" type="button" aria-label="Önceki adım" disabled={busy} onClick={() => go(step - 1)}><ArrowLeft size={20} aria-hidden /></button>}<div><small>{basket.length ? `Toplam · ${basket.reduce((sum, line) => sum + line.quantity, 0)} ekstra` : "Toplam"}</small><strong>{quote ? money(quote.total_minor) : selected ? "Hesaplanıyor" : "Ustanı seç"}</strong></div><button className="commerce-button" type="submit" form="commerce-booking" disabled={!canContinue || busy}>{busy ? "Hazırlanıyor…" : submitLabel}<ArrowRight size={17} aria-hidden /></button></div>
  </div>;
}
