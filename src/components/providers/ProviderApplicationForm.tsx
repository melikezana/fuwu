"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitProviderApplicationAction } from "@/app/provider-application/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sanitizePhone } from "@/lib/validations/phone";
import { useHydrated } from "@/lib/useHydrated";
import { persistSessionFormDraft, useSessionFormDraft } from "@/lib/hooks/useSessionFormDraft";
import type { ProviderApplicationOption } from "@/types/provider";
import { LegalNoticeDisclosure } from "@/components/legal/LegalNoticeDisclosure";
import { PROVIDER_APPLICATION_NOTICE } from "@/lib/legal/notices";
export function ProviderApplicationForm({ authenticatedUserId, categories, districts, isConfigured, lookupError, smsAvailable = true }: { authenticatedUserId?: string | null; categories: ProviderApplicationOption[]; districts: ProviderApplicationOption[]; isConfigured: boolean; lookupError?: string | null; smsAvailable?: boolean }) {
 const router = useRouter();
 const ready = useHydrated();
 const [draft, setDraft] = useState({ fullName: "", phone: "", categoryId: "", districtId: "", noticeAcknowledged: false });
 const { fullName: name, phone, categoryId: category, districtId: district, noticeAcknowledged } = draft;
 const draftKey = "fuwu:pending-provider-application";
 const clearDraft = useSessionFormDraft(draftKey, draft, setDraft);
 const setName = (value: string) => setDraft(current => ({ ...current, fullName: value }));
 const setPhone = (value: string) => setDraft(current => ({ ...current, phone: value }));
 const setCategory = (value: string) => setDraft(current => ({ ...current, categoryId: value }));
 const setDistrict = (value: string) => setDraft(current => ({ ...current, districtId: value }));
 const setNoticeAcknowledged = (value: boolean) => setDraft(current => ({ ...current, noticeAcknowledged: value }));
 function loginWithDraft() {
  try { persistSessionFormDraft(draftKey, draft); } catch { /* Form remains usable without browser storage. */ }
  // SMS kurulu değilken telefonla giriş de çalışmaz; aday Google ya da e-postayla girer.
  router.push(smsAvailable ? "/login?method=phone&next=/provider-application&restore=1" : "/login?next=/provider-application&restore=1");
 }
 const [otp, setOtp] = useState(""), [resendAt, setResendAt] = useState(0), [sent, setSent] = useState(false), [verified, setVerified] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [done, setDone] = useState(false), [smsFailed, setSmsFailed] = useState(false);
 // SMS kurulu değilse ya da kod gönderilemediyse başvuru doğrulamasız alınır; ekip adayı bu numaradan arayarak doğrular.
 const canSkipSms = !smsAvailable || smsFailed;
 // Telefonla giriş yapan ustanın numarası zaten doğrulanmıştır: alanı doldur ve ikinci SMS isteme.
 const draftReady = clearDraft.ready;
 const phoneRef = useRef(phone);
 useEffect(() => { phoneRef.current = phone; }, [phone]);
 useEffect(() => {
  if (!authenticatedUserId || !draftReady) return;
  let cancelled = false;
  const db = createSupabaseBrowserClient(); if (!db) return;
  void db.auth.getUser().then(({ data: { user } }) => {
   if (cancelled || !user?.phone || !user.phone_confirmed_at) return;
   const confirmed = sanitizePhone(user.phone);
   const typed = phoneRef.current;
   if (typed && sanitizePhone(typed) !== confirmed) return;
   if (!typed) setDraft(current => current.phone ? current : { ...current, phone: `0${confirmed.slice(3)}` });
   setVerified(true); setMessage("Telefonun doğrulandı.");
  }, () => undefined);
  return () => { cancelled = true; };
 }, [authenticatedUserId, draftReady]);
 // Supabase hata kodlarını ustanın anlayacağı, ne yapacağını söyleyen mesajlara çevirir.
 function phoneErrorMessage(error: { code?: string; status?: number; message?: string }) {
  const code = error.code ?? "";
  if (code === "phone_exists" || /already.*registered|already been registered/i.test(error.message ?? "")) return "Bu numara başka bir FUWU hesabına bağlı. O hesapla giriş yap ya da destek ekibine yaz.";
  if (code.startsWith("over_sms_send_rate_limit") || error.status === 429) return "Çok sık kod istendi. Bir dakika sonra tekrar dene.";
  if (code === "sms_send_failed" || code === "phone_provider_disabled") return "SMS şu anda gönderilemiyor. Biraz sonra tekrar dene; sorun sürerse destek ekibine yaz.";
  if (code === "otp_expired") return "Kodun süresi doldu. \"Kodu tekrar gönder\" ile yeni kod iste.";
  return "";
 }
 async function sendPhoneCode(normalized: string) {
  const db = createSupabaseBrowserClient(); if (!db) return;
  const { error } = await db.auth.updateUser({ phone: normalized });
  if (error) {
   const known = phoneErrorMessage(error);
   const providerDown = !known || error.code === "sms_send_failed" || error.code === "phone_provider_disabled" || (error.status ?? 0) >= 500;
   if (providerDown && !(error.code ?? "").startsWith("over_sms_send_rate_limit") && error.code !== "phone_exists") { setSmsFailed(true); setMessage("SMS şu anda gönderilemiyor. Başvurunu yine de gönderebilirsin; ekibimiz seni bu numaradan arayarak doğrulayacak."); return; }
   setMessage(known || "Doğrulama mesajı gönderilemedi. Daha sonra tekrar dene."); return;
  }
  setSent(true); setOtp(""); setResendAt(Date.now() + 60_000); setMessage("Telefonuna gelen 6 haneli kodu gir.");
 }
 async function verifyPhone(resend = false) {
  if (busy) return; setBusy(true); setMessage("");
  try {
   const db = createSupabaseBrowserClient(); if (!db || !authenticatedUserId) { loginWithDraft(); return; }
   const normalized = sanitizePhone(phone);
   // SMS yalnızca cep telefonuna gider: +90 5XX XXX XX XX.
   if (!/^\+905\d{9}$/.test(normalized)) { setMessage("05XX XXX XX XX biçiminde cep telefonu numaranı gir."); return; }
   const { data: { user } } = await db.auth.getUser();
   if (user?.phone_confirmed_at && sanitizePhone(user.phone || "") === normalized) { setVerified(true); setMessage("Telefonun doğrulandı."); return; }
   if (sent && !resend) {
    if (!/^\d{6}$/.test(otp)) { setMessage("Telefonuna gelen 6 haneli kodu gir."); return; }
    const { error } = await db.auth.verifyOtp({ phone: normalized, token: otp, type: "phone_change" });
    if (error) { setMessage(phoneErrorMessage(error) || "Kod doğrulanamadı. Kodu kontrol et ya da yeni kod iste."); return; }
    setVerified(true); setMessage("Telefonun doğrulandı.");
   } else {
    if (resend && Date.now() < resendAt) { setMessage("Yeni kod için biraz bekle."); return; }
    await sendPhoneCode(normalized);
   }
  } catch { setMessage("Telefon doğrulama hizmetine ulaşılamadı."); } finally { setBusy(false); }
 }
 return <form method="post" aria-label="FUWU Partner başvurusu" data-testid="provider-application-form" className="commerce-panel trust-onboarding" onSubmit={async event => {
  event.preventDefault(); if (busy || done) return;
  if (!noticeAcknowledged) { setMessage("Başvuru aydınlatma metnini okuduğunu işaretle."); return; }
  if (!authenticatedUserId) { loginWithDraft(); return; }
  if (!verified && !canSkipSms) { setMessage("Önce telefonunu doğrula. Kod gelmezse \"Kodu tekrar gönder\"e bas."); return; }
  setBusy(true); setMessage("");
  try {
   const result = await submitProviderApplicationAction({ fullName: name, phone: sanitizePhone(phone), categoryId: category, districtId: district, availability: "", experienceYears: "", hasEquipment: "", introduction: "", portfolioUrl: "", privacyNoticeVersion: PROVIDER_APPLICATION_NOTICE.version, profileImagePath: "", profileImageUrl: "", verificationDocumentPath: "", verificationDocumentUrl: "" });
   if (!result.ok) { setMessage(result.message); return; }
   clearDraft(); setDone(true); setMessage(verified ? "Başvurun alındı. Onaylandığında SMS ile haber vereceğiz; ardından Usta Paneli'nden profilini, belgelerini ve hizmetlerini tamamlayacaksın." : "Başvurun alındı. Ekibimiz seni bu numaradan arayarak telefonunu doğrulayacak; onaydan sonra Usta Paneli'nden profilini, belgelerini ve hizmetlerini tamamlayacaksın."); router.refresh();
  } catch { setMessage("Başvuru gönderilemedi. Bilgilerini kontrol edip tekrar dene."); } finally { setBusy(false); }
 }}>
 <h2>FUWU Partner başvurusu</h2><p>Dört bilgiyle başla, iki dakika sürer. Belgeleri onaydan sonra, yayından önce yüklersin.</p>
 {!authenticatedUserId && <p className="prelaunch-text" data-testid="provider-application-guest-note">Formu şimdi doldur. Gönderirken cep telefonunla giriş yapacaksın; yazdıkların kaybolmaz.</p>}
 {lookupError && <p className="commerce-error" role="alert">{lookupError}</p>}
 <label className="commerce-field">Ad soyad<input autoComplete="name" name="fullName" minLength={2} maxLength={120} required value={name} onChange={e => setName(e.target.value)} disabled={busy || done} /></label>
 <label className="commerce-field">Cep telefonu<input autoComplete="tel" inputMode="tel" name="phone" placeholder="05XX XXX XX XX" type="tel" required value={phone} onChange={e => { setPhone(e.target.value); setVerified(false); setSent(false); }} disabled={busy || done} /></label>
 {sent && !verified && <label className="commerce-field">SMS doğrulama kodu<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} disabled={busy} /></label>}
 {(verified || !canSkipSms) && <button className="commerce-secondary" type="button" onClick={() => void verifyPhone()} disabled={busy || verified || done}>{verified ? "Telefon doğrulandı" : sent ? "Kodu doğrula" : "Telefonumu doğrula"}</button>}
 {canSkipSms && !verified && <p className="prelaunch-text" data-testid="provider-application-call-verification">Telefonunu SMS yerine ekibimiz arayarak doğrulayacak. Numaranı doğru yazdığından emin ol.</p>}
 {sent && !verified && !canSkipSms && <button className="commerce-text-link" type="button" onClick={() => void verifyPhone(true)} disabled={busy || done}>Kodu tekrar gönder</button>}
 <label className="commerce-field">Hizmet kategorisi<select name="categoryId" required value={category} onChange={e => setCategory(e.target.value)} disabled={busy || done}><option value="">Mesleğini seç</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label className="commerce-field">Çalışma ilçesi<select name="districtId" required value={district} onChange={e => setDistrict(e.target.value)} disabled={busy || done}><option value="">İlçeni seç</option>{districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
 <div className="legal-step">
  <LegalNoticeDisclosure notice={PROVIDER_APPLICATION_NOTICE} summary="Başvurun için hangi verilerin, neden ve ne kadar süreyle işlendiğini anlatır. Bu bir onay değil, bilgilendirmedir." />
  <label className="prelaunch-consent"><input type="checkbox" name="privacyNoticeAcknowledged" required checked={noticeAcknowledged} onChange={e => setNoticeAcknowledged(e.target.checked)} disabled={busy || done} /><span>Başvuru aydınlatma metnini okudum, bilgi edindim.</span></label>
 </div>
 {message && (() => { const calm = done || verified || (smsFailed && message.startsWith("SMS şu anda")); return <p className={calm ? "commerce-notice" : "commerce-error"} role={calm ? "status" : "alert"}>{message}</p>; })()}
 <button className="commerce-button" type="submit" disabled={busy || done || !ready || !clearDraft.ready || !isConfigured}>{busy ? "İşlem sürüyor…" : done ? "Başvuru alındı" : "Başvurumu gönder"}</button>
 <p className="commerce-help">Belge yüklemek veya başvurmak yayın onayı değildir. Online satın alma henüz açılmadı.</p></form>;
}
