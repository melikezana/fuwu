"use client";
import { useActionState } from "react";
import { trustAdminAction } from "@/app/admin/verifications/actions";
export function TrustDecisionForm({ kind, id, version }: { kind: "document" | "case"; id?: string; version?: number }) {
 const [state, submit, busy] = useActionState(trustAdminAction, { ok: false, message: "" });
 return <form action={submit} className="trust-decision"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id || ""} /><input type="hidden" name="version" value={version || ""} />
 <label className="commerce-field">Karar<select aria-label="Karar" name="status" required disabled={busy} defaultValue=""><option value="" disabled>Karar seç</option>{(kind === "document" ? [["in_review", "İncelemede"], ["approved", "Onaylandı"], ["resubmit", "Yeniden Yükle"], ["rejected", "Reddedildi"]] : [["reviewing", "İncelemede"], ["resolved", "Çözüldü"], ["reopened", "Yeniden açıldı"]]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
 <label className="commerce-field">Gerekçe ve düzeltme yolu<textarea name="reason" minLength={10} maxLength={1000} required rows={3} disabled={busy} /></label>
 {state.message && <p className={state.ok ? "commerce-notice" : "commerce-error"} role={state.ok ? "status" : "alert"}>{state.message}</p>}
 <button className="commerce-button" disabled={busy}>{busy ? "Kaydediliyor…" : "Kararı kaydet"}</button></form>;
}
