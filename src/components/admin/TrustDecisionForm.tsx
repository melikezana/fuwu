"use client";
import { useRef, useState } from "react";
import { trustAdminAction } from "@/app/admin/verifications/actions";
import { Dialog } from "@/components/ui/dialog";
import { useHydrated } from "@/lib/useHydrated";
export function TrustDecisionForm({ kind, id, version }: { kind: "document" | "case"; id?: string; version?: number }) {
 const [state, setState] = useState({ ok: false, message: "" });
 const [busy, setBusy] = useState(false), [open, setOpen] = useState(false);
 const payload = useRef<FormData | null>(null), pending = useRef(false);
 const [decision, setDecision] = useState(""), [reason, setReason] = useState("");
 const ready = useHydrated();
 const options = kind === "document" ? [["in_review", "İncelemede"], ["approved", "Onaylandı"], ["resubmit", "Düzeltme Gerekli"], ["rejected", "Reddedildi"]] : [["reviewing", "İncelemede"], ["resolved", "Çözüldü"], ["reopened", "Yeniden açıldı"]];
 async function confirm() {
  if (pending.current || !payload.current) return;
  pending.current = true; setBusy(true);
  try {
   const result = await trustAdminAction({ ok: false, message: "" }, payload.current);
   setState(result);
   if (result.ok) setOpen(false);
  } catch { setState({ ok: false, message: "Karar doğrulanamadı. Gerekçen korundu; dosyayı kontrol et." }); }
  finally { pending.current = false; setBusy(false); }
 }
 return <><form method="post" onSubmit={event => { event.preventDefault(); if (pending.current) return; payload.current = new FormData(event.currentTarget); setState({ ok: false, message: "" }); setOpen(true); }} className="trust-decision"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id || ""} /><input type="hidden" name="version" value={version || ""} />
 <label className="commerce-field">Karar<select aria-label="Karar" name="status" required disabled={busy || !ready} value={decision} onChange={event => setDecision(event.target.value)}><option value="" disabled>Karar seç</option>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
 <label className="commerce-field">Gerekçe ve düzeltme yolu<textarea name="reason" minLength={10} maxLength={1000} required rows={3} disabled={busy || !ready} value={reason} onChange={event => setReason(event.target.value)} /></label>
 {state.message && <p className={state.ok ? "commerce-notice" : "commerce-error"} role={state.ok ? "status" : "alert"}>{state.message}</p>}
 <button className="commerce-button" disabled={busy || !ready}>{busy ? "Kaydediliyor…" : "Kararı kaydet"}</button></form>
 <Dialog isOpen={open} onClose={() => { if (!pending.current) setOpen(false); }} title="İnceleme kararını onayla" description="Karar ve gerekçesi denetim kaydına yazılacak.">
  <p><strong>{options.find(([value]) => value === decision)?.[1]}</strong></p><p>{reason}</p>
  {state.message && !state.ok && <p className="commerce-error" role="alert">{state.message}</p>}
  <div className="control-action-row"><button className="commerce-secondary" disabled={busy} onClick={() => setOpen(false)}>Vazgeç</button><button className="commerce-button" disabled={busy} onClick={confirm}>{busy ? "Kaydediliyor…" : "Kararı onayla"}</button></div>
 </Dialog></>;
}
