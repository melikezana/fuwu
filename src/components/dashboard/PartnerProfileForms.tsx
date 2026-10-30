"use client";
import { useActionState } from "react";
import { savePartnerProfile } from "@/app/provider-dashboard/profile/partner-actions";
export function PartnerProfileForms({ name, description }: { name: string; description: string }) {
 const [state, save, busy] = useActionState(savePartnerProfile, { ok: false, message: "" });
 return <form action={save} className="commerce-panel partner-profile-form my-6"><h2>Profilimi düzenle</h2><label className="commerce-field">Adın<input name="name" defaultValue={name} minLength={2} maxLength={120} required disabled={busy} /></label><label className="commerce-field">Hizmet açıklaman<textarea name="description" defaultValue={description} minLength={30} maxLength={2000} rows={4} required disabled={busy} /></label>{state.message && <p role={state.ok ? "status" : "alert"} className={state.ok ? "commerce-notice" : "commerce-error"}>{state.message}</p>}<button className="commerce-button" disabled={busy}>{busy ? "Kaydediliyor…" : "Profilimi kaydet"}</button></form>;
}
