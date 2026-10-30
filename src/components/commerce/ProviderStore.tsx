"use client";
import { useRef, useState } from "react";
import { Check, Plus, Store, X } from "lucide-react";
import { commerceError } from "@/lib/commerce/display";
import type { Availability, CatalogService, Offering, ServiceVariant, TimeOff } from "@/lib/commerce/types";
type Row = { service_id: string; variant_id: string | null; label: string; price: string; duration: string; active: boolean; scope: string };
const week = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
export function ProviderStore({ providerId, services, variants, offerings, hours, daysOff, districts, mode = "store" }: { mode?: "store" | "calendar"; providerId: string; services: CatalogService[]; variants: ServiceVariant[]; offerings: Offering[]; hours: Availability[]; daysOff: TimeOff[]; districts: { id: string; name: string }[] }) {
  const [rows, setRows] = useState<Row[]>(() => services.flatMap(s => (s.pricing_type === "VARIANT_BASED" ? variants.filter(v => v.service_id === s.id && (!v.provider_id || v.provider_id === providerId)) : [null]).map(v => {
    const existing = offerings.find(o => o.service_id === s.id && o.variant_id === (v?.id ?? null));
    return { service_id: s.id, variant_id: v?.id ?? null, label: s.name + (v ? ` · ${v.name}` : ""), price: existing ? String(existing.price_minor / 100) : "", duration: String(existing?.duration_minutes ?? 60), scope: existing?.scope || s.scope, active: existing?.is_active ?? false };
  })));
  const [areas, setAreas] = useState<string[]>([...new Set(offerings.flatMap(o => o.district_ids))]);
  const [schedule, setSchedule] = useState(() => [1,2,3,4,5,6,0].map(weekday => { const h = hours.find(h => h.weekday === weekday); return { weekday, enabled: Boolean(h), starts_at: h?.starts_at.slice(0,5) ?? "09:00", ends_at: h?.ends_at.slice(0,5) ?? "18:00" }; }));
  const [off, setOff] = useState(daysOff.map(d => d.day));
  const [newDay, setNewDay] = useState("");
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [packageService, setPackageService] = useState(services.find(s => s.pricing_type === "VARIANT_BASED")?.id || "");
  const [packageName, setPackageName] = useState("");
  async function addPackage() {
    if (inFlight.current || busy || !packageService || packageName.trim().length < 2) return;
    setBusy(true); setMessage(""); setSuccess(false);
    try {
      const response = await fetch("/api/commerce/store/variants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId, serviceId: packageService, name: packageName.trim() }) });
      const result = await response.json();
      if (!response.ok || !result.id) throw new Error("Paket eklenemedi. Bağlantını kontrol edip tekrar dene.");
      setRows(previous => previous.some(r => r.variant_id === result.id) ? previous : [...previous, { service_id: packageService, variant_id: result.id, label: `${services.find(s => s.id === packageService)?.name} · ${packageName.trim()}`, price: "", duration: "60", active: false, scope: services.find(s => s.id === packageService)?.scope || "" }]);
      setPackageName(""); setMessage("Paket eklendi. Fiyatını, süresini ve bölgesini seçip mağazanı kaydet."); setSuccess(true);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Paket eklenemedi."); } finally { inFlight.current = false; setBusy(false); }
  }
  function rowChange(index: number, patch: Partial<Row>) { setRows(r => r.map((row, i) => i === index ? { ...row, ...patch } : row)); setSuccess(false); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (inFlight.current) return; inFlight.current = true; setBusy(true); setMessage(""); setSuccess(false);
    try {
      if (rows.some(r => r.active) && !areas.length) throw new Error("En az bir hizmet bölgesi seç.");
      if (rows.some(r => r.active && !r.price)) throw new Error("Hazırladığın her hizmet için fiyat gir.");
      if (rows.some(r => r.active) && !schedule.some(h => h.enabled)) throw new Error("Hizmet hazırlamak için çalışma saatlerini belirle.");
      if (schedule.some(h => h.enabled && h.ends_at <= h.starts_at)) throw new Error("Bitiş saati başlangıç saatinden sonra olmalıdır.");
      const response = await fetch("/api/commerce/store", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId, offerings: rows.filter(r => r.price).map(r => ({ service_id: r.service_id, variant_id: r.variant_id, price_minor: Math.round(Number(r.price.replace(",", ".")) * 100), duration_minutes: Number(r.duration), district_ids: areas, is_active: r.active, scope: r.scope })), hours: schedule.filter(h => h.enabled).map(({ weekday, starts_at, ends_at }) => ({ weekday, starts_at, ends_at })), daysOff: off }) });
      const result = await response.json();
      if (!response.ok) throw new Error(commerceError(result.error));
      setSuccess(true); setMessage("Hizmetlerin ve çalışma takvimin kaydedildi. Yayın için admin incelemesi gerekiyor.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Kaydedilemedi."); } finally { inFlight.current = false; setBusy(false); }
  }
  return <form onSubmit={save} className="commerce-store">{mode === "store" && <section className="commerce-panel"><h2><Store size={23} aria-hidden /> Hizmetlerin ve fiyatların</h2><p className="commerce-help">Fiyatını ve hizmet kapsamını sen belirlersin. Gerçek satış açıldığında başlangıçta %10 usta komisyonu uygulanır. Değişiklikler yeniden yayın incelemesine alınır.</p>{rows.map((r, i) => <div className="commerce-store-offering" key={r.service_id + r.variant_id}><h3>{r.label}</h3><label className="commerce-field">Fiyat (TL)<input type="number" min="1" max="1000000" step="0.01" value={r.price} onChange={e => rowChange(i, { price: e.target.value })} required={r.active || offerings.some(o => o.service_id === r.service_id && o.variant_id === r.variant_id)} /></label><label className="commerce-field">Süre<select value={r.duration} onChange={e => rowChange(i, { duration: e.target.value })}>{Array.from({ length: 32 }, (_, n) => (n+1)*15).map(n => <option key={n} value={n}>{n} dakika</option>)}</select></label><label className="commerce-checkbox"><input type="checkbox" checked={r.active} onChange={e => rowChange(i, { active: e.target.checked })} /> Hazır</label><label className="commerce-field commerce-store-scope">Hizmet kapsamı<textarea maxLength={2000} rows={3} value={r.scope} onChange={e => rowChange(i, { scope: e.target.value })} /></label></div>)}{!rows.length && <p className="commerce-notice">Uzmanlık alanında henüz hazırlanacak hizmet yok.</p>}</section>}
    {mode === "store" && services.some(s => s.pricing_type === "VARIANT_BASED") && <section className="commerce-panel"><h2>Kendi hizmet paketini oluştur</h2><p className="commerce-help">Paket seçimi, fiyat ve süre satın alma öncesinde müşteriye gösterilir. Katalogdaki hizmet kapsamı geçerlidir.</p><label className="commerce-field">Paket hizmeti<select value={packageService} onChange={e => setPackageService(e.target.value)}>{services.filter(s => s.pricing_type === "VARIANT_BASED").map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label className="commerce-field">Paket adı<input value={packageName} onChange={e => setPackageName(e.target.value)} maxLength={80} placeholder="Örneğin: 3 klima" /></label><button className="commerce-secondary" type="button" disabled={busy || packageName.trim().length < 2} onClick={addPackage}>Paket Ekle</button></section>}
    {mode === "store" && <section id="regions" className="commerce-panel"><h2>Hizmet bölgelerin</h2><p className="commerce-help">Seçtiğin ilçeler tüm hizmetlerinde geçerlidir.</p><div className="commerce-area-grid">{districts.map(d => <label className="commerce-checkbox" key={d.id}><input type="checkbox" checked={areas.includes(d.id)} onChange={e => setAreas(a => e.target.checked ? [...a,d.id] : a.filter(id => id !== d.id))} />{d.name}</label>)}</div></section>}
    <section id="schedule" className="commerce-panel"><h2>Haftalık çalışma takvimin</h2><p className="commerce-help">Seçmediğin günlerde randevu açılmaz. Saatler Türkiye saatidir.</p>{schedule.map((h, i) => <div className="commerce-hours-row" key={h.weekday}><label className="commerce-checkbox"><input type="checkbox" checked={h.enabled} onChange={e => setSchedule(s => s.map((r,j) => j === i ? { ...r, enabled: e.target.checked } : r))} />{week[h.weekday]}</label><label className="commerce-field"><span className="sr-only">{week[h.weekday]} başlangıç</span><input type="time" value={h.starts_at} disabled={!h.enabled} onChange={e => setSchedule(s => s.map((r,j) => j === i ? { ...r, starts_at: e.target.value } : r))} required={h.enabled} /></label><span aria-hidden>—</span><label className="commerce-field"><span className="sr-only">{week[h.weekday]} bitiş</span><input type="time" value={h.ends_at} disabled={!h.enabled} onChange={e => setSchedule(s => s.map((r,j) => j === i ? { ...r, ends_at: e.target.value } : r))} required={h.enabled} /></label></div>)}</section>
    <section id="days-off" className="commerce-panel"><h2>İzin günlerin</h2><div className="commerce-choice-row"><label className="commerce-field">İzin tarihi<input type="date" value={newDay} onChange={e => setNewDay(e.target.value)} /></label><button type="button" className="commerce-secondary" disabled={!newDay} onClick={() => { if (!off.includes(newDay)) setOff(o => [...o,newDay].sort()); setNewDay(""); }}><Plus size={17} aria-hidden /> Gün Ekle</button></div><div className="commerce-filters">{off.map(day => <button key={day} type="button" aria-label={`${day} iznini kaldır`} onClick={() => setOff(o => o.filter(d => d !== day))}>{day}<X size={16} aria-hidden /></button>)}</div><p className="commerce-help">İzin veya çalışma saati değişikliği onaylanmış randevuyu iptal etmez. Mevcut siparişlerini ayrıca yönet.</p></section>
    {message && <p role={success ? "status" : "alert"} className={success ? "commerce-notice" : "commerce-error"}>{success && <Check size={18} aria-hidden />}{message}</p>}<button className="commerce-button" disabled={busy}>{busy ? "Kaydediliyor…" : mode === "calendar" ? "Takvimimi Kaydet" : "Hizmetlerimi Kaydet"}</button><p className="commerce-sandbox">Online satın alma henüz açılmadı. Hizmetlerini açılışa hazırlıyorsun.</p>
  </form>;
}
