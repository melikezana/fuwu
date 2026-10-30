"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";
import { ArrowLeft, ShieldCheck, Store, ClipboardCheck, History } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { providerControlLabels, type ProviderControlAction, type ProviderControlInput, type ProviderControlResult } from "@/lib/providers/control";
import type { ProviderDetail, ProviderDirectoryRow } from "@/services/admin/provider-control";
const statuses = { approved: "Yayın onaylı", pending_review: "İnceleme bekliyor", changes_requested: "Düzeltme istendi", hidden: "Yayından kaldırıldı" };
export function PublicationBadge({ provider: p }: { provider: ProviderDirectoryRow }) {
 return <span className={`control-badge ${p.published ? "is-green" : ""}`}>{p.published ? "Yayında" : p.record_kind === "test" ? "Test / Demo" : !p.is_active ? "Hesap pasif" : !p.is_approved ? "Hesap onayı bekliyor" : statuses[p.status]}</span>;
}
export function ProviderInspector({ provider: p, detail, action, backHref }: { provider: ProviderDirectoryRow; detail: ProviderDetail | null; action: (input: ProviderControlInput) => Promise<ProviderControlResult>; backHref: string }) {
 const router = useRouter();
 const [selected, setSelected] = useState<ProviderControlAction>("changes_requested");
 const [open, setOpen] = useState(false);
 const [busy, setBusy] = useState(false);
 const [feedback, setFeedback] = useState<ProviderControlResult | null>(null);
 const pending = useRef(false);
 const request = useRef<{ id: string; payload: string } | null>(null);
 const [completedVersion, setCompletedVersion] = useState<string | null>(null);
 const finished = completedVersion === p.version;
 function confirm(kind: ProviderControlAction) { setSelected(kind); setOpen(true); setFeedback(null); }
 async function submit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (pending.current || finished) return;
  const form = new FormData(event.currentTarget);
  const input = { providerId: p.id, action: selected, reason: String(form.get("reason") ?? ""), expectedVersion: p.version, fingerprint: p.fingerprint, verificationReference: String(form.get("verificationReference") ?? ""), recordKind: String(form.get("recordKind") ?? p.record_kind), details: selected === "edit_profile" ? { name: String(form.get("name") ?? ""), average_price_min: Number(form.get("average_price_min")), average_price_max: Number(form.get("average_price_max")), availability: String(form.get("availability") ?? ""), working_hours: String(form.get("working_hours") ?? ""), response_time_minutes: String(form.get("response_time_minutes") ?? ""), is_verified: form.get("is_verified") === "on", identity_verified: form.get("identity_verified") === "on", phone_verified: form.get("phone_verified") === "on" } : undefined };
  const payload = JSON.stringify(input);
  if (!request.current || request.current.payload !== payload) request.current = { id: crypto.randomUUID(), payload };
  const requestId = request.current.id;
  pending.current = true; setBusy(true); setFeedback(null);
  startTransition(async () => {
  try {
   const result = await action({ ...input, requestId });
   setFeedback(result);
   if (result.ok) { setOpen(false); setCompletedVersion(p.version); }
   else if (result.code === "conflict") router.refresh();
  } catch { setFeedback({ ok: false, code: "network", message: "Bağlantı kesildi. Aynı isteği tekrar deneyebilirsin." }); }
  finally { pending.current = false; setBusy(false); }
  });
 }
 const missing = [!p.profile_image_url && "Profil fotoğrafı", !p.phone && "Telefon", !p.category && "Uzmanlık", !p.district && "İlçe", (p.description?.trim().length ?? 0) < 30 && "Hizmet açıklaması", p.service_count === 0 && "Hizmetler", p.calendar_days === 0 && "Çalışma takvimi"].filter(Boolean) as string[];
 const completion = Math.round((7 - missing.length) / 7 * 100);
 return <div className="control-inspector">
  <Link className="control-back" href={backHref}><ArrowLeft size={18} aria-hidden /> Usta listesine dön</Link>
  <header className="control-record-header"><div><p className="control-eyebrow">USTA DOSYASI</p><h2>{p.name}</h2><p>{p.category || "Uzmanlık belirtilmedi"} · {p.district || "İlçe belirtilmedi"}</p></div><PublicationBadge provider={p} /></header>
  {feedback && <div role={feedback.ok ? "status" : "alert"} className={feedback.ok ? "commerce-notice" : "commerce-error"}><strong>{feedback.message}</strong>{feedback.detail && <p>{feedback.detail}</p>}</div>}
  <div className="control-detail-grid">
   <section className="commerce-panel"><h3>Genel bilgiler</h3><dl className="control-facts">{[["Telefon",p.phone],["WhatsApp",p.whatsapp],["Çalışma saatleri",p.working_hours],["Kayıt kaynağı",p.record_kind === "real" ? "İncelenmiş gerçek kayıt" : p.record_kind === "test" ? "Test / Demo" : "Kaynağı incelenecek"],["Hesap",`${p.is_active ? "Aktif" : "Pasif"} · ${p.is_approved ? "Onaylı" : "Onay bekliyor"}`],["Kayıt kimliği",p.id]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value || "Belirtilmedi"}</dd></div>)}</dl></section>
   <section className="commerce-panel"><h3><ClipboardCheck size={20} aria-hidden /> Profil kalitesi</h3><strong className="control-score">%{completion}</strong><p>Profil tamamlanma oranı</p><progress aria-label="Profil tamamlama" max={100} value={completion} /><p className="commerce-help">{missing.length ? `Eksikler: ${missing.join(", ")}.` : "Gerekli profil alanları tamamlandı."}</p><blockquote className="quality-original">{p.description || "Açıklama eklenmemiş."}</blockquote><Link className="control-back" href={`/providers/${p.id}`}>Public profil adresi</Link></section>
   <section className="commerce-panel"><h3><Store size={20} aria-hidden /> Hizmetler</h3>{detail ? detail.services.length ? detail.services.map(s => <article className="control-service" key={s.id}><strong>{s.name}</strong><p>{new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(s.price_minor / 100)} · {s.duration_minutes} dk · {s.active ? "Hazır" : "Kapalı"}</p><p className="commerce-help">{s.scope}</p></article>) : <p>Henüz hizmet eklenmemiş.</p> : <p role="alert">Hizmet bilgileri okunamadı.</p>}</section>
   <section className="commerce-panel"><h3><ShieldCheck size={20} aria-hidden /> Belgeler ve doğrulama</h3><p>Kimlik: {p.identity_verified ? "Doğrulandı" : "İncelenecek"}</p><p>Telefon: {p.phone_verified ? "Doğrulandı" : "İncelenecek"}</p><p>Mesleki doğrulama: {p.is_verified ? "Onaylı" : "Onaylanmadı"}</p><p className="commerce-help">Profil tamamlanması belge doğrulaması veya yayın onayı değildir.</p>{detail?.applications.map(a => <p key={a.id} className="control-id">Başvuru {a.id} · {a.status} · {a.has_document ? "Özel belge mevcut" : "Belge yok"}</p>)}<Link className="commerce-secondary" href="/admin/verifications">Belgeleri güvenli alanda incele</Link></section>
  </div>
  <section className="commerce-panel control-publication"><div><p className="control-eyebrow">YAYIN YÖNETİMİ</p><h3>Kararını kaydet</h3><p className="commerce-help">Yayın, hesap erişimi ve doğrulama ayrı yönetilir. Her karar gerekçesiyle kaydedilir.</p></div><div className="control-action-row"><label className="commerce-field">İşlem<select value={selected} onChange={e => setSelected(e.target.value as ProviderControlAction)}>{Object.entries(providerControlLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><button className="commerce-button" disabled={busy || finished} onClick={() => confirm(selected)}>Kararı uygula</button>{p.published && <button className="commerce-secondary" disabled={busy || finished} onClick={() => confirm("unpublish")}>Yayından Kaldır</button>}</div>{p.review_note && <p className="commerce-help">Son karar: {p.review_note}</p>}</section>
  <section className="commerce-panel"><h3><History size={20} aria-hidden /> Karar geçmişi</h3>{!detail ? <p role="alert">Karar geçmişi okunamadı.</p> : detail.history.length === 0 ? <p>Henüz karar kaydı yok.</p> : <ol className="control-history">{detail.history.map(h => <li key={h.id}><strong>{h.action.startsWith("provider.control.") ? providerControlLabels[h.action.slice(17) as ProviderControlAction] || h.action : h.action}</strong><time dateTime={h.created_at}>{new Date(h.created_at).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</time><p>{typeof h.metadata?.reason === "string" ? h.metadata.reason : "Gerekçe bu kayıtta yer almıyor."}</p><span className="control-id">Yetkili: {h.actor_user_id || "Sistem"}</span></li>)}</ol>}</section>
  <Dialog isOpen={open} onClose={() => { if (!pending.current) setOpen(false); }} title={providerControlLabels[selected]} description={`${p.name} · ${p.category || "Usta"} · ${p.district || ""}`}>
   <form onSubmit={submit} className="control-confirm"><p>{selected === "unpublish" ? "Profil müşterilere kapatılır. Hesap, başvuru ve geçmiş kayıtlar korunur." : "Bu karar usta dosyasına ve denetim kayıtlarına kaydedilecek."}</p>{selected === "edit_profile" && <div className="partner-profile-fields"><label className="commerce-field">Usta adı<input name="name" defaultValue={p.name} required minLength={2} maxLength={120} disabled={busy} /></label>{[["average_price_min","Alt fiyat (TL)",p.average_price_min ?? 0],["average_price_max","Üst fiyat (TL)",p.average_price_max ?? 0]].map(([name,label,value])=><label key={name} className="commerce-field">{label}<input name={String(name)} type="number" min={0} max={1000000} step={1} defaultValue={value} required disabled={busy} /></label>)}<label className="commerce-field">Uygunluk<select name="availability" defaultValue={p.availability ?? "müsait"} disabled={busy}>{["müsait","yoğun","çevrimdışı"].map(v=><option value={v} key={v}>{v}</option>)}</select></label><label className="commerce-field">Çalışma saati<select name="working_hours" defaultValue={p.working_hours ?? "09:00-18:00"} disabled={busy}>{["09:00-18:00","09:00-22:00","7/24"].map(v=><option value={v} key={v}>{v}</option>)}</select></label><label className="commerce-field">Yanıt süresi (dakika)<input name="response_time_minutes" type="number" min={1} max={1440} defaultValue={p.response_time_minutes ?? ""} disabled={busy} /></label>{[["is_verified","Mesleki doğrulama",p.is_verified],["identity_verified","Kimlik doğrulama",p.identity_verified],["phone_verified","Telefon doğrulama",p.phone_verified]].map(([name,label,value])=><label className="commerce-checkbox" key={String(name)}><input name={String(name)} type="checkbox" defaultChecked={Boolean(value)} disabled={busy} />{label}</label>)}</div>}<label className="commerce-field">Kısa gerekçe<textarea name="reason" minLength={10} maxLength={1000} rows={3} required disabled={busy} /></label>{["approve_quality", "changes_requested", "pending_review"].includes(selected) && <label className="commerce-field">Kayıt kaynağı<select name="recordKind" defaultValue={p.record_kind} disabled={busy}><option value="unclassified">Kaynağı incelenecek</option><option value="real">Gerçek kayıt · kaynağı incelendi</option><option value="test">Test / Demo</option></select></label>}{["approve_quality", "verify", "edit_profile"].includes(selected) && <label className="commerce-field">Onaylı başvuru kimliği<input name="verificationReference" maxLength={500} defaultValue={p.verification_reference ?? ""} disabled={busy} /><small>Doğrulama için incelenmiş belgeye ait başvuru referansı.</small></label>}{feedback && !feedback.ok && <p className="commerce-error" role="alert">{feedback.message} {feedback.detail}</p>}<button className="commerce-button" type="submit" disabled={busy || finished}>{busy ? "İşlem doğrulanıyor…" : `${providerControlLabels[selected]} · Onayla`}</button><button className="commerce-secondary" type="button" disabled={busy} onClick={() => setOpen(false)}>Vazgeç</button></form>
  </Dialog>
 </div>;
}
