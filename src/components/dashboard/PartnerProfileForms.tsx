"use client";
import { useActionState, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { draftPartnerDescription, savePartnerProfile } from "@/app/provider-dashboard/profile/partner-actions";
export function PartnerProfileForms({ name, description }: { name: string; description: string }) {
 const [state, save, busy] = useActionState(savePartnerProfile, { ok: false, message: "" });
 const [draftName, setName] = useState(name), [draftDescription, setDescription] = useState(description);
 const [notes, setNotes] = useState(""), [draftState, setDraftState] = useState<{ ok: boolean; message: string } | null>(null), [previous, setPrevious] = useState<string | null>(null);
 const [drafting, startDraft] = useTransition();
 const requestDraft = () => startDraft(async () => {
  const result = await draftPartnerDescription(notes);
  setDraftState({ ok: result.ok, message: result.message });
  if (result.ok && result.description) { setPrevious(draftDescription); setDescription(result.description); }
 });
 return <form action={save} aria-busy={busy} className="commerce-panel partner-profile-form my-6"><h2>Profilimi düzenle</h2><label className="commerce-field">Adın<input name="name" value={draftName} onChange={e => setName(e.target.value)} minLength={2} maxLength={120} required disabled={busy} /></label>
  <fieldset className="partner-draft" disabled={busy || drafting}><legend><Sparkles aria-hidden size={18} /> Yazmakta zorlanıyor musun?</legend><p className="commerce-help">Kendini birkaç kelimeyle anlat; müşterinin okuyacağı açıklamayı senin için hazırlayalım. Örnek: “12 yıldır tesisat yapıyorum, kaçak tespiti ve banyo yenileme, hafta sonu da çalışırım.”</p><label className="commerce-field">Kısa notların<textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={600} rows={2} /></label><div className="fusion-actions"><button type="button" className="commerce-secondary" onClick={requestDraft} disabled={notes.trim().length < 10}>{drafting ? "Hazırlanıyor…" : "Açıklama taslağı hazırla"}</button>{previous !== null && <button type="button" className="commerce-text-link" onClick={() => { setDescription(previous); setPrevious(null); setDraftState(null); }}>Önceki açıklamama dön</button>}</div>{draftState && <p role={draftState.ok ? "status" : "alert"} className={draftState.ok ? "commerce-notice" : "commerce-error"}>{draftState.message}</p>}</fieldset>
  <label className="commerce-field">Hizmet açıklaman<textarea name="description" value={draftDescription} onChange={e => setDescription(e.target.value)} minLength={30} maxLength={2000} rows={5} required disabled={busy} /></label>{state.message && <p role={state.ok ? "status" : "alert"} className={state.ok ? "commerce-notice" : "commerce-error"}>{state.message}</p>}<button className="commerce-button" disabled={busy}>{busy ? "Kaydediliyor…" : "Profilimi kaydet"}</button></form>;
}
