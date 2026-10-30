"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitProviderApplicationAction } from "@/app/provider-application/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sanitizePhone } from "@/lib/validations/phone";
import type { ProviderApplicationOption } from "@/types/provider";
export function ProviderApplicationForm({ authenticatedUserId, categories, districts, isConfigured, lookupError }: { authenticatedUserId?: string | null; categories: ProviderApplicationOption[]; districts: ProviderApplicationOption[]; isConfigured: boolean; lookupError?: string | null }) {
 const router = useRouter();
 const [name, setName] = useState(""), [phone, setPhone] = useState(""), [category, setCategory] = useState(""), [district, setDistrict] = useState("");
 const [otp, setOtp] = useState(""), [sent, setSent] = useState(false), [verified, setVerified] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [done, setDone] = useState(false);
 async function verifyPhone() {
  if (busy) return; setBusy(true); setMessage("");
  try {
   const db = createSupabaseBrowserClient(); if (!db || !authenticatedUserId) { router.push("/login?next=/provider-application"); return; }
   const normalized = sanitizePhone(phone);
   if (!/^\+90\d{10}$/.test(normalized)) { setMessage("Geçerli cep telefonu numaranı gir."); return; }
   const { data: { user } } = await db.auth.getUser();
   if (user?.phone_confirmed_at && sanitizePhone(user.phone || "") === normalized) { setVerified(true); setMessage("Telefonun doğrulandı."); return; }
   if (sent) {
    const { error } = await db.auth.verifyOtp({ phone: normalized, token: otp, type: "phone_change" });
    if (error) { setMessage("Kod doğrulanamadı. Kodu ve süresini kontrol et."); return; }
    setVerified(true); setMessage("Telefonun doğrulandı.");
   } else {
    const { error } = await db.auth.updateUser({ phone: normalized });
    if (error) { setMessage("Doğrulama mesajı gönderilemedi. Daha sonra tekrar dene."); return; }
    setSent(true); setMessage("Telefonuna gelen kodu gir.");
   }
  } catch { setMessage("Telefon doğrulama hizmetine ulaşılamadı."); } finally { setBusy(false); }
 }
 return <form data-testid="provider-application-form" className="commerce-panel trust-onboarding" onSubmit={async event => {
  event.preventDefault(); if (busy || done) return;
  if (!authenticatedUserId) { router.push("/login?next=/provider-application"); return; }
  if (!verified) { setMessage("Önce telefonunu doğrula."); return; }
  setBusy(true); setMessage("");
  try {
   const result = await submitProviderApplicationAction({ fullName: name, phone: sanitizePhone(phone), categoryId: category, districtId: district, availability: "", experienceYears: "", hasEquipment: "", introduction: "", portfolioUrl: "", profileImagePath: "", profileImageUrl: "", verificationDocumentPath: "", verificationDocumentUrl: "" });
   if (!result.ok) { setMessage(result.message); return; }
   setDone(true); setMessage("Başvurun alındı. Profil ve belgelerini hesabından kademeli tamamlayabilirsin."); router.refresh();
  } catch { setMessage("Başvuru gönderilemedi. Bilgilerini kontrol edip tekrar dene."); } finally { setBusy(false); }
 }}>
 <h2>FUWU Partner başvurusu</h2><p>Dört bilgiyle başla. Gerekli belgeleri yayın öncesi tamamlarsın.</p>
 {lookupError && <p className="commerce-error" role="alert">{lookupError}</p>}
 <label className="commerce-field">Ad soyad<input autoComplete="name" name="fullName" minLength={2} maxLength={120} required value={name} onChange={e => setName(e.target.value)} disabled={busy || done} /></label>
 <label className="commerce-field">Cep telefonu<input autoComplete="tel" name="phone" type="tel" required value={phone} onChange={e => { setPhone(e.target.value); setVerified(false); setSent(false); }} disabled={busy || done} /></label>
 {sent && !verified && <label className="commerce-field">SMS doğrulama kodu<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} disabled={busy} /></label>}
 <button className="commerce-secondary" type="button" onClick={verifyPhone} disabled={busy || verified || done}>{verified ? "Telefon doğrulandı" : sent ? "Kodu doğrula" : "Telefonumu doğrula"}</button>
 <label className="commerce-field">Hizmet kategorisi<select name="categoryId" required value={category} onChange={e => setCategory(e.target.value)} disabled={busy || done}><option value="">Mesleğini seç</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label className="commerce-field">Çalışma ilçesi<select name="districtId" required value={district} onChange={e => setDistrict(e.target.value)} disabled={busy || done}><option value="">İlçeni seç</option>{districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
 {message && <p className={done || verified ? "commerce-notice" : "commerce-error"} role={done || verified ? "status" : "alert"}>{message}</p>}
 <button className="commerce-button" disabled={busy || done || !isConfigured}>{busy ? "İşlem sürüyor…" : done ? "Başvuru alındı" : "Başvurumu gönder"}</button>
 <p className="commerce-help">Belge yüklemek veya başvurmak yayın onayı değildir. Online satın alma henüz açılmadı.</p></form>;
}
