"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock3, CreditCard, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { appointment, commerceError, money, orderLabels } from "@/lib/commerce/display";
import type { CommerceOrder, OrderEvent, OrderStatus } from "@/lib/commerce/types";
import type { OrderFinance } from "@/lib/commerce/finance";
import { payoutLabels } from "@/lib/commerce/finance";
import { isOrderOverdue } from "@/lib/commerce/order-state";
import { BookingProgress } from "./BookingProgress";

const progress: OrderStatus[] = ["CONFIRMED", "PROVIDER_ON_THE_WAY", "IN_PROGRESS", "COMPLETED"];
export function OrderView({ order, events, completionCode, isProvider, paymentReady, finance, hasReview = false, reviewEligible = false, rebookHref, readOnly = false }: { order: CommerceOrder; events: OrderEvent[]; completionCode: string | null; isProvider: boolean; paymentReady: boolean; finance?: OrderFinance | null; hasReview?: boolean; reviewEligible?: boolean; rebookHref?: string; readOnly?: boolean }) {
  const isCustomer = !isProvider && !readOnly;
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [reviewed, setReviewed] = useState(hasReview);
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  useEffect(() => { const initial = setTimeout(() => setNow(Date.now()), 0); const t = setInterval(() => setNow(Date.now()), 1000); return () => { clearTimeout(initial); clearInterval(t); }; }, []);
  useEffect(() => {
    if (["CANCELLED", "PAYMENT_FAILED", "COMPLETED", "REFUNDED"].includes(order.status)) return;
    const t = setInterval(() => router.refresh(), 15000); return () => clearInterval(t);
  }, [router, order.status]);
  const remaining = Math.max(0, Math.ceil((Date.parse(order.expires_at) - (now ?? Date.parse(order.created_at))) / 1000));
  const expired = order.status === "PENDING_PAYMENT" && now !== null && remaining <= 0;
  const status = order.status;
  async function action(body: object) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/commerce/orders/${order.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.message || commerceError(String(result.error))); return false; }
      router.refresh(); return true;
    } catch (e) { setMessage(commerceError(String(e))); return false; } finally { setBusy(false); }
  }
  async function pay() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/commerce/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign(result.paymentPageUrl);
    } catch (e) { setMessage(commerceError(String(e))); setBusy(false); }
  }
  const next = status === "CONFIRMED" ? "PROVIDER_ON_THE_WAY" : status === "PROVIDER_ON_THE_WAY" ? "IN_PROGRESS" : status === "IN_PROGRESS" ? "COMPLETED" : null;
  return <div className="commerce-page commerce-order-page"><Link className="commerce-back" href={isProvider ? "/provider-dashboard/orders" : "/orders"}><ArrowLeft size={17} aria-hidden /> Siparişlere dön</Link><header className="commerce-page-header"><p className="commerce-eyebrow">SİPARİŞ #{order.id.slice(0, 8).toUpperCase()}</p><h1>{orderLabels[status]}</h1><p>{order.service_name} · {order.provider_name}</p></header><p className="commerce-sandbox">Sandbox / test siparişi · Gerçek para tahsilatı değildir.</p>
    <div className="commerce-booking-layout"><div className="commerce-booking-form"><section className="commerce-panel"><h2>Siparişin hangi aşamada?</h2>{progress.includes(status) ? <ol className="commerce-progress">{progress.map((s, i) => <li key={s} className={progress.indexOf(status) >= i ? "is-done" : ""} aria-current={status === s ? "step" : undefined}><span>{progress.indexOf(status) >= i ? <Check size={17} aria-hidden /> : i + 1}</span><strong>{orderLabels[s]}</strong></li>)}</ol> : <p className="commerce-notice" role="status">{expired ? "Randevunuz için ayrılan ödeme süresi doldu. Slot otomatik olarak tekrar kullanılabilir." : orderLabels[status]}</p>}
      {now !== null && isOrderOverdue(order, now) && <p className="commerce-warning" role="status">Planlanan bitiş saati geçti. Hizmet tamamlanmadı; siparişiniz aktif olarak takip ediliyor.</p>}{expired && <p className="commerce-warning" role="status">Ödeme için ayrılan süre doldu. Ödeme sonucu doğrulanıyor; yeni bir randevu seçebilirsiniz.</p>}{status === "PENDING_PAYMENT" && !expired && <p className="commerce-hold"><Clock3 size={19} aria-hidden /> Randevun {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2,"0")} dakika boyunca ayrıldı.</p>}<p className="commerce-help">Ustanız aşamayı güncellediğinde burada göreceksiniz.</p></section>
      <section className="commerce-panel"><h2>Randevu bilgileri</h2><dl className="commerce-order-details"><div><dt><UserRound size={18} aria-hidden /> Usta</dt><dd><Link href={`/providers/${order.provider_id}`}>{order.provider_name}</Link></dd></div><div><dt><Clock3 size={18} aria-hidden /> Gün ve saat</dt><dd>{appointment(order.starts_at)}<small>{Math.round((Date.parse(order.ends_at) - Date.parse(order.starts_at))/60000)} dakika · Türkiye saati</small></dd></div><div><dt><MapPin size={18} aria-hidden /> Hizmet adresi</dt><dd>{order.address}<small>{order.district_name}, İstanbul</small></dd></div></dl><h3>Satın alınan hizmet kapsamı</h3><p className="commerce-help">{order.scope}</p>{order.exclusions && <><h3>Dahil olmayanlar</h3><p className="commerce-help">{order.exclusions}</p></>}</section>
      {completionCode && ["CONFIRMED", "PROVIDER_ON_THE_WAY", "IN_PROGRESS"].includes(status) && <section className="commerce-panel commerce-code"><h2><ShieldCheck size={22} aria-hidden /> Teslim kodun</h2><strong>{completionCode}</strong><p>Hizmet tamamlandığında bu kodu ustanızla paylaşın.</p></section>}
      {isProvider && next && <section className="commerce-panel"><h2>Siparişi güncelle</h2>{next === "COMPLETED" && <label className="commerce-field">Müşterinin altı haneli teslim kodu<input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} /></label>}<button type="button" className="commerce-button" disabled={busy || (next === "COMPLETED" && code.length !== 6)} onClick={() => action({ status: next, code: next === "COMPLETED" ? code : undefined })}>{next === "PROVIDER_ON_THE_WAY" ? "Yola Çıktım" : next === "IN_PROGRESS" ? "Hizmete Başladım" : "Hizmeti Tamamla"}</button></section>}
      {isCustomer && status === "COMPLETED" && <section className="commerce-panel" id="order-review"><h2>Deneyimini paylaş</h2>{reviewed ? <p role="status">Değerlendirmeniz kaydedildi. Teşekkür ederiz.</p> : !reviewEligible ? <p className="commerce-help">Bu hizmet için değerlendirme hakkı bulunmuyor veya uygunluk şu anda doğrulanamıyor.</p> : <form onSubmit={async e => { e.preventDefault(); if (await action({ action: "review", rating: Number(rating), comment })) setReviewed(true); }}><label className="commerce-field">Puan<select required value={rating} onChange={e => setRating(e.target.value)}><option value="">Puan seçin</option>{[5,4,3,2,1].map(n => <option value={n} key={n}>{n} / 5</option>)}</select></label><label className="commerce-field">Yorum<textarea minLength={10} maxLength={1000} required rows={3} value={comment} onChange={e => setComment(e.target.value)} /></label><button className="commerce-button" disabled={busy}>Değerlendirmeyi Gönder</button></form>}</section>}
      <section className="commerce-panel"><h2>Sipariş geçmişi</h2><ol className="commerce-history">{events.map(event => <li key={event.id}><span>{orderLabels[event.status]}</span><time dateTime={event.created_at}>{appointment(event.created_at)}</time></li>)}</ol></section>
    </div><aside className="commerce-summary"><p className="commerce-eyebrow">SİPARİŞ ÖZETİ</p><h2>{order.service_name}</h2>{order.variant_name && <p>{order.variant_name}</p>}<dl><div><dt>Hizmet bedeli</dt><dd>{money(order.total_minor)}</dd></div><div><dt>Ek ücretler</dt><dd>{money(0)}</dd></div><div><dt>Ödeme durumu</dt><dd>{order.payment_status === "PAID" ? "Test ödemesi onaylandı" : order.payment_status === "REFUND_PENDING" ? "İade bekleniyor" : order.payment_status === "REFUNDED" ? "İade edildi" : order.payment_status === "FAILED" ? "Başarısız" : "Ödenmedi"}</dd></div></dl><div className="commerce-summary-total"><span>Toplam</span><strong>{money(order.total_minor)}</strong></div>{isProvider && <dl><div><dt>Platform komisyonu</dt><dd>{money(order.commission_minor)}</dd></div><div><dt>Usta brüt hak edişi</dt><dd>{money(order.provider_gross_minor)}</dd></div><div><dt>Ödeme kuruluşu kesintisi</dt><dd>{order.processor_fee_minor == null ? "Henüz bildirilmedi" : money(order.processor_fee_minor)}</dd></div></dl>}
      {isCustomer && status === "PENDING_PAYMENT" && <>{!paymentReady && <p className="commerce-notice">Test ödeme altyapısı henüz yapılandırılmadı. Şu anda ödeme alınamıyor.</p>}<button className="commerce-button commerce-desktop-submit" disabled={!paymentReady || busy || expired} onClick={pay}><CreditCard size={18} aria-hidden />{busy ? "Hazırlanıyor…" : "Test Ödemesine Geç"}</button></>}
      {isProvider && <p className="commerce-notice">Hak ediş: {finance?.payout_state ? payoutLabels[finance.payout_state] : "Ödeme kaydı henüz yok"}. Kuruluş onayı, banka hesabına aktarımın tamamlandığı anlamına gelmez.</p>}
      {isCustomer && status === "PENDING_PAYMENT" && <><BookingProgress current={4} /><p className="commerce-help">Randevu başlamadan önce, usta yola çıkmamışken sipariş detayından iptal edebilirsiniz. Ödenen siparişin iadesi kuruluş tarafından doğrulanana kadar beklemede görünür.</p></>}
      {status === "REFUND_PENDING" && <p className="commerce-notice">İade talebi kaydedildi. İade sonucu doğrulanana kadar tamamlandı olarak gösterilmez.</p>}
      {isCustomer && ["PENDING_PAYMENT", "CONFIRMED"].includes(status) && <button className="commerce-secondary" disabled={busy} onClick={() => action({ status: "CANCELLED" })}>Siparişi İptal Et</button>}
      {isCustomer && ["CONFIRMED", "PROVIDER_ON_THE_WAY", "IN_PROGRESS", "COMPLETED"].includes(status) && <button className="commerce-secondary" disabled={busy} onClick={() => action({ status: "DISPUTED" })}>Sipariş İçin Destek İste</button>}
      {message && <p role="alert" className="commerce-error">{message}</p>}
      {isCustomer && rebookHref && <><Link className="commerce-button" href={rebookHref}>Aynı Hizmeti Yeniden Satın Al</Link><p className="commerce-help">Güncel fiyat ve müsaitlik yeniden kontrol edilir. Yeni gün ve saat seçmelisin.</p></>}{["CANCELLED", "PAYMENT_FAILED"].includes(status) && <Link className="commerce-button" href="/services">Yeni Randevu Seç</Link>}
    </aside></div>{isCustomer && status === "PENDING_PAYMENT" && <div className="commerce-sticky"><div><small>Toplam</small><strong>{money(order.total_minor)}</strong></div><button className="commerce-button" disabled={!paymentReady || busy || expired} onClick={pay}>{busy ? "Hazırlanıyor…" : "Ödemeye Geç"}</button></div>}
  </div>;
}
