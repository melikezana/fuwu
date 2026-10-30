"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CommerceOrder } from "@/lib/commerce/types";
import { appointment, money } from "@/lib/commerce/display";
export function OrderAssurance({ order, isProvider, readOnly }: { order: CommerceOrder; isProvider: boolean; readOnly: boolean }) {
 const router = useRouter();
 const [code, setCode] = useState(""), [expires, setExpires] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [reason, setReason] = useState(""), [kind, setKind] = useState("complaint");
 const [scope, setScope] = useState(""), [extra, setExtra] = useState("");
 const [changes, setChanges] = useState<{ id: string; scope: string; extra_minor: number; status: string }[]>([]);
 const [photo, setPhoto] = useState<string | null>(null), [loaded, setLoaded] = useState(false);
 async function load() { try { const response = await fetch(`/api/commerce/orders/${order.id}`, { cache: "no-store" }); const data = await response.json(); if (response.ok && Array.isArray(data.changes)) { setChanges(data.changes); setPhoto(data.provider?.profile_image_url || null); setLoaded(true); } } catch { setLoaded(false); } }
 useEffect(() => {
  if (readOnly) return;
  const controller = new AbortController();
  fetch(`/api/commerce/orders/${order.id}`, { cache: "no-store", signal: controller.signal }).then(async response => {
   const data = await response.json();
   if (controller.signal.aborted) return;
   if (response.ok && Array.isArray(data.changes)) { setChanges(data.changes); setPhoto(data.provider?.profile_image_url || null); setLoaded(true); } else setLoaded(false);
  }).catch(() => { if (!controller.signal.aborted) setLoaded(false); });
  return () => controller.abort();
 }, [order.id, order.status, readOnly]);
 async function send(body: object) {
  if (busy) return; setBusy(true); setMessage("");
  try { const response = await fetch(`/api/commerce/orders/${order.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json();
   if (!response.ok) { setMessage(data.message || "İşlem tamamlanamadı."); return; }
   if (data.code && /^\d{6}$/.test(data.code)) { setCode(data.code); setExpires(data.expires_at); } else { setMessage("İşlemin kaydedildi."); await load(); router.refresh(); }
  } catch { setMessage("Bağlantı kurulamadı. Yeniden dene."); } finally { setBusy(false); }
 }
 if (readOnly) return null;
 return <section className="commerce-panel trust-file"><h2>FUWU Güvence</h2><p>Doğru usta. Doğru hizmet. Kontrol sende.</p>
 {photo ? <Image src={photo} alt={`${order.provider_name} profil fotoğrafı`} width={80} height={80} className="rounded-full" /> : <p className="commerce-help">Profil fotoğrafı şu anda görüntülenemiyor. Emin değilsen kodu paylaşma ve destek iste.</p>}
 <p>Randevudaki usta: <Link href={`/providers/${order.provider_id}`}>{order.provider_name}</Link>. Gelen kişinin adını ve profil fotoğrafını kontrol et. Farklı biri geldiyse kodu paylaşma; sorun bildir.</p>
 {!isProvider && ["CONFIRMED", "PROVIDER_ON_THE_WAY"].includes(order.status) && <div className="commerce-code"><h3>Kapı doğrulama kodu</h3>{code ? <><strong aria-label="Kapı kodun">{code}</strong><p>Geçerlilik: {appointment(expires)}. Süresi dolduğunda yeni kod isteyebilirsin.</p></> : <p>Usta kapıya geldiğinde kod oluştur. Kod 15 dakika geçerlidir ve bir kez kullanılabilir.</p>}<button className="commerce-secondary" disabled={busy} onClick={() => send({ action: "service_code" })}>Kapı kodu oluştur</button></div>}
 {order.arrival_verified_at && <p className="commerce-notice">Kapı kodu doğrulandı. Bu işlem kimlik veya mesleki belge doğrulaması yerine geçmez.</p>}
 {order.status === "IN_PROGRESS" && order.service_completed_at && <div><h3>Müşteri onayı bekleniyor</h3><p>Usta işi tamamladığını bildirdi. Hizmet müşterinin onayıyla kapanır; gecikme onay sayılmaz.</p>{!isProvider && <button className="commerce-button" disabled={busy} onClick={() => send({ status: "COMPLETED" })}>Hizmeti Onayla</button>}</div>}
 <p className="commerce-help">Konum izni zorunlu değil. Kapı kodu ve destek doğrulaması konum olmadan çalışır. Sürekli konum geçmişi veya canlı rota tutulmaz.</p>
 <details><summary>Ek iş ve fiyat değişikliği</summary><p>Ek işe başlamadan önce müşteri kapsamı ve ek bedeli açıkça onaylamalı. Burada ödeme alınmaz.</p>{!loaded && <p role="alert">Ek iş bilgileri okunamadı.</p>}{changes.map(c => <article className="trust-document" key={c.id}><p>{c.scope}</p><p>Ek bedel: {money(c.extra_minor)} · {c.status === "accepted" ? "Müşteri onayladı" : c.status === "declined" ? "Müşteri reddetti" : "Müşteri yanıtı bekleniyor"}</p>{!isProvider && c.status === "proposed" && <div className="trust-row"><button className="commerce-button" disabled={busy} onClick={() => send({ action: "scope_change", changeId: c.id, accept: true })}>Kapsamı ve ek bedeli onayla</button><button className="commerce-secondary" disabled={busy} onClick={() => send({ action: "scope_change", changeId: c.id, accept: false })}>Reddet</button></div>}</article>)}
 {isProvider && order.status === "IN_PROGRESS" && !order.service_completed_at && <form onSubmit={e => { e.preventDefault(); void send({ action: "scope_change", scope, extraMinor: Math.round(Number(extra) * 100) }); }}><label className="commerce-field">Ek iş kapsamı<textarea value={scope} onChange={e => setScope(e.target.value)} minLength={10} maxLength={2000} required /></label><label className="commerce-field">Ek bedel (TL)<input type="number" min={0} max={1000000} step="0.01" required value={extra} onChange={e => setExtra(e.target.value)} /></label><button className="commerce-secondary" disabled={busy}>Müşteri onayına sun</button></form>}</details>
 <details><summary>{isProvider ? "Destek ve itiraz" : "Sorun Bildir"}</summary><form onSubmit={e => { e.preventDefault(); void send({ action: "report", kind, reason }); }}><label className="commerce-field">Bildirim türü<select value={kind} onChange={e => setKind(e.target.value)}>{[["complaint", "Şikâyet"], ["safety", "Güvenlik olayı"], ["appeal", "Karara / şikâyete itiraz"], ["no_show", "Randevuya gelinmedi"], ["unreachable", "Karşı tarafa ulaşılamıyor"]].map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label><label className="commerce-field">Ne oldu?<textarea required minLength={10} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} rows={3} /></label><button className="commerce-secondary" disabled={busy}>Destek kaydı oluştur</button></form></details>
 {message && <p role="status" className="commerce-notice">{message}</p>}</section>;
}
