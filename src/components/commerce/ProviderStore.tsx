"use client";
import { useState } from "react";
import { Check, Plus, Store, X } from "lucide-react";
import { commerceError } from "@/lib/commerce/display";
import type { Availability, CatalogService, Offering, ServiceVariant, TimeOff } from "@/lib/commerce/types";
type Row = { service_id: string; variant_id: string | null; label: string; price: string; duration: string; active: boolean };
const week = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
export function ProviderStore({ providerId, services, variants, offerings, hours, daysOff, districts }: { providerId: string; services: CatalogService[]; variants: ServiceVariant[]; offerings: Offering[]; hours: Availability[]; daysOff: TimeOff[]; districts: { id: string; name: string }[] }) {
  const [rows, setRows] = useState<Row[]>(() => services.flatMap(s => (s.pricing_type === "VARIANT_BASED" ? variants.filter(v => v.service_id === s.id) : [null]).map(v => {
    const existing = offerings.find(o => o.service_id === s.id && o.variant_id === (v?.id ?? null));
    return { service_id: s.id, variant_id: v?.id ?? null, label: s.name + (v ? ` · ${v.name}` : ""), price: existing ? String(existing.price_minor / 100) : "", duration: String(existing?.duration_minutes ?? 60), active: existing?.is_active ?? false };
  })));
  const [areas, setAreas] = useState<string[]>([...new Set(offerings.flatMap(o => o.district_ids))]);
  const [schedule, setSchedule] = useState(() => [1,2,3,4,5,6,0].map(weekday => { const h = hours.find(h => h.weekday === weekday); return { weekday, enabled: Boolean(h), starts_at: h?.starts_at.slice(0,5) ?? "09:00", ends_at: h?.ends_at.slice(0,5) ?? "18:00" }; }));
  const [off, setOff] = useState(daysOff.map(d => d.day));
  const [newDay, setNewDay] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  function rowChange(index: number, patch: Partial<Row>) { setRows(r => r.map((row, i) => i === index ? { ...row, ...patch } : row)); setSuccess(false); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(""); setSuccess(false);
    try {
      if (!areas.length) throw new Error("Lütfen en az bir hizmet bölgesi seçin.");
      if (rows.some(r => r.active && !r.price)) throw new Error("Satışa açtığınız her hizmet için fiyat girin.");
      if (rows.some(r => r.active) && !schedule.some(h => h.enabled)) throw new Error("Satışa açmak için çalışma saatlerinizi tanımlayın.");
      if (schedule.some(h => h.enabled && h.ends_at <= h.starts_at)) throw new Error("Bitiş saati başlangıç saatinden sonra olmalıdır.");
      const response = await fetch("/api/commerce/store", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId, offerings: rows.filter(r => r.price).map(r => ({ service_id: r.service_id, variant_id: r.variant_id, price_minor: Math.round(Number(r.price.replace(",", ".")) * 100), duration_minutes: Number(r.duration), district_ids: areas, is_active: r.active })), hours: schedule.filter(h => h.enabled).map(({ weekday, starts_at, ends_at }) => ({ weekday, starts_at, ends_at })), daysOff: off }) });
      const result = await response.json();
      if (!response.ok) throw new Error(commerceError(result.error));
      setSuccess(true); setMessage("Hizmetleriniz ve çalışma takviminiz kaydedildi.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Kaydedilemedi."); } finally { setBusy(false); }
  }
  return <form onSubmit={save} className="commerce-store"><section className="commerce-panel"><h2><Store size={23} aria-hidden /> Hizmetlerin ve fiyatların</h2><p className="commerce-help">Fiyatlar müşterinin ödeyeceği toplam tutardır. Platform komisyonu ayrıca müşteriye eklenmez. Mevcut siparişlerin fiyat ve süresi değişmez.</p>{rows.map((r, i) => <div className="commerce-store-offering" key={r.service_id + r.variant_id}><h3>{r.label}</h3><label className="commerce-field">Fiyat (TL)<input type="number" min="1" max="1000000" step="0.01" value={r.price} onChange={e => rowChange(i, { price: e.target.value })} required={r.active || offerings.some(o => o.service_id === r.service_id && o.variant_id === r.variant_id)} /></label><label className="commerce-field">Süre<select value={r.duration} onChange={e => rowChange(i, { duration: e.target.value })}>{Array.from({ length: 32 }, (_, n) => (n+1)*15).map(n => <option key={n} value={n}>{n} dakika</option>)}</select></label><label className="commerce-checkbox"><input type="checkbox" checked={r.active} onChange={e => rowChange(i, { active: e.target.checked })} /> Satışa açık</label></div>)}{!rows.length && <p className="commerce-notice">Uzmanlık kategorinize henüz satın alınabilir hizmet tanımlanmamış.</p>}</section>
    <section className="commerce-panel"><h2>Hizmet bölgelerin</h2><p className="commerce-help">Seçtiğiniz ilçeler tüm hizmetlerinize uygulanır.</p><div className="commerce-area-grid">{districts.map(d => <label className="commerce-checkbox" key={d.id}><input type="checkbox" checked={areas.includes(d.id)} onChange={e => setAreas(a => e.target.checked ? [...a,d.id] : a.filter(id => id !== d.id))} />{d.name}</label>)}</div></section>
    <section className="commerce-panel"><h2>Haftalık çalışma takvimin</h2><p className="commerce-help">İşaretlemediğiniz günlerde randevu açılmaz. Saatler Türkiye saatidir.</p>{schedule.map((h, i) => <div className="commerce-hours-row" key={h.weekday}><label className="commerce-checkbox"><input type="checkbox" checked={h.enabled} onChange={e => setSchedule(s => s.map((r,j) => j === i ? { ...r, enabled: e.target.checked } : r))} />{week[h.weekday]}</label><label className="commerce-field"><span className="sr-only">{week[h.weekday]} başlangıç</span><input type="time" value={h.starts_at} disabled={!h.enabled} onChange={e => setSchedule(s => s.map((r,j) => j === i ? { ...r, starts_at: e.target.value } : r))} required={h.enabled} /></label><span aria-hidden>—</span><label className="commerce-field"><span className="sr-only">{week[h.weekday]} bitiş</span><input type="time" value={h.ends_at} disabled={!h.enabled} onChange={e => setSchedule(s => s.map((r,j) => j === i ? { ...r, ends_at: e.target.value } : r))} required={h.enabled} /></label></div>)}</section>
    <section className="commerce-panel"><h2>İzin günlerin</h2><div className="commerce-choice-row"><label className="commerce-field">İzin tarihi<input type="date" value={newDay} onChange={e => setNewDay(e.target.value)} /></label><button type="button" className="commerce-secondary" disabled={!newDay} onClick={() => { if (!off.includes(newDay)) setOff(o => [...o,newDay].sort()); setNewDay(""); }}><Plus size={17} aria-hidden /> Gün Ekle</button></div><div className="commerce-filters">{off.map(day => <button key={day} type="button" aria-label={`${day} iznini kaldır`} onClick={() => setOff(o => o.filter(d => d !== day))}>{day}<X size={16} aria-hidden /></button>)}</div><p className="commerce-help">İzin veya çalışma saati değişikliği onaylanmış randevuyu iptal etmez. Mevcut siparişlerinizi ayrıca yönetin.</p></section>
    {message && <p role={success ? "status" : "alert"} className={success ? "commerce-notice" : "commerce-error"}>{success && <Check size={18} aria-hidden />}{message}</p>}<button className="commerce-button" disabled={busy}>{busy ? "Kaydediliyor…" : "Mağazamı Kaydet"}</button><p className="commerce-sandbox">Ödeme hesabınızın sandbox durumu aktif olduğunda hizmetler satın alınabilir.</p>
  </form>;
}
