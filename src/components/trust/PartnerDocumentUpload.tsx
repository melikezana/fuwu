"use client";
import { useRef, useState, type FormEvent } from "react";
import { attachPartnerDocument } from "@/app/provider-dashboard/profile/partner-actions";
import { useHydrated } from "@/lib/useHydrated";
export function PartnerDocumentUpload({ types }: { types: { code: string; label: string }[] }) {
 const [state, setState] = useState({ ok: false, message: "" });
 const [busy, setBusy] = useState(false);
 const pending = useRef(false);
 const ready = useHydrated();
 async function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (pending.current) return;
  const form = event.currentTarget, data = new FormData(form);
  pending.current = true; setBusy(true); setState({ ok: false, message: "" });
  try {
   const result = await attachPartnerDocument({ ok: false, message: "" }, data);
   setState(result);
   // A resolved action can still return an error. Keep the file/type/date on retry.
   if (result.ok) form.reset();
  } catch {
   setState({ ok: false, message: "Belge yüklenemedi. Seçimlerin korundu; yeniden dene." });
  } finally { pending.current = false; setBusy(false); }
 }
 return <form method="post" onSubmit={submit} aria-busy={busy} className="commerce-panel partner-profile-form" id="documents"><h2>Belge gönder</h2><p className="commerce-help">Yalnızca faaliyet ve inceleme için gereken belgeyi ekle. Kimlik numaranı açıklamaya yazma. Belgeler müşterilere gösterilmez.</p>
 <label className="commerce-field">Belge türü<select aria-label="Belge türü" name="documentType" required defaultValue="" disabled={busy || !ready}><option value="" disabled>Belge türünü seç</option>{types.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}</select></label>
 <label className="commerce-field">Dosya<input name="document" type="file" accept=".pdf,.jpg,.jpeg,.png" required disabled={busy || !ready} /></label>
 <label className="commerce-field">Son geçerlilik tarihi (varsa)<input name="expiresOn" type="date" disabled={busy || !ready} /></label><p className="commerce-help">PDF, JPG veya PNG · En fazla 5 MB. Yeni sürüm yeniden incelenir.</p>
 {state.message && <p role={state.ok ? "status" : "alert"} className={state.ok ? "commerce-notice" : "commerce-error"}>{state.message}</p>}
 <button className="commerce-button" disabled={busy || !ready || types.length === 0}>{busy ? "Yükleniyor…" : "İncelemeye gönder"}</button></form>;
}
