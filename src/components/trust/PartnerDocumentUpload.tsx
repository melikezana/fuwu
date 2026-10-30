"use client";
import { useActionState } from "react";
import { attachPartnerDocument } from "@/app/provider-dashboard/profile/partner-actions";
export function PartnerDocumentUpload({ types }: { types: { code: string; label: string }[] }) {
 const [state, attach, busy] = useActionState(attachPartnerDocument, { ok: false, message: "" });
 return <form action={attach} className="commerce-panel partner-profile-form" id="documents"><h2>Belge gönder</h2><p className="commerce-help">Yalnızca faaliyet ve inceleme için gereken belgeyi ekle. Kimlik numaranı açıklamaya yazma. Belgeler müşterilere gösterilmez.</p>
 <label className="commerce-field">Belge türü<select name="documentType" required defaultValue="" disabled={busy}><option value="" disabled>Belge türünü seç</option>{types.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}</select></label>
 <label className="commerce-field">Dosya<input name="document" type="file" accept=".pdf,.jpg,.jpeg,.png" required disabled={busy} /></label>
 <label className="commerce-field">Son geçerlilik tarihi (varsa)<input name="expiresOn" type="date" disabled={busy} /></label><p className="commerce-help">PDF, JPG veya PNG · En fazla 5 MB. Yeni sürüm yeniden incelenir.</p>
 {state.message && <p role={state.ok ? "status" : "alert"} className={state.ok ? "commerce-notice" : "commerce-error"}>{state.message}</p>}
 <button className="commerce-button" disabled={busy || types.length === 0}>{busy ? "Yükleniyor…" : "İncelemeye gönder"}</button></form>;
}
