"use client";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { saveInterestAction, withdrawInterestAction } from "@/app/waitlist/actions";
import { INTEREST_CONSENT_VERSION } from "@/lib/prelaunch";

type Option = { id: string; name: string };
export function WaitlistForm({ available = false, authenticated = false, email = "", categories = [], districts = [] }: { available?: boolean; authenticated?: boolean; email?: string; categories?: Option[]; districts?: Option[] }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFeedback(null);
    startTransition(async () => {
      try { setFeedback(await saveInterestAction(form)); }
      catch { setFeedback({ ok: false, message: "Kayıt doğrulanamadı. Lütfen yeniden dene." }); }
    });
  }
  return <section className="commerce-panel prelaunch-interest" aria-labelledby="interest-title">
    <h2 id="interest-title">Açılıştan haberdar ol.</h2>
    {!available && <p role="status" className="commerce-notice">Bilgilendirme kaydı şu anda kapalı. Hizmetleri inceleyebilir, daha sonra yeniden deneyebilirsin.</p>}
    {!authenticated && <p className="commerce-help">İletişim iznini güvenle yönetmek için <Link href="/login?next=%2Fwaitlist">doğrulanmış e-posta hesabınla giriş yap</Link>.</p>}
    <form onSubmit={submit}>
      <fieldset disabled={!available || !authenticated || pending} className="prelaunch-interest-fields">
        <label className="commerce-field">E-posta adresin<input type="email" value={email} readOnly autoComplete="email" placeholder="Hesabındaki e-posta adresi" /></label>
        <label className="commerce-field">İlçe <span>(isteğe bağlı)</span><select name="districtId" defaultValue=""><option value="">Tercih belirtmiyorum</option>{districts.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
        <label className="commerce-field">Hizmet <span>(isteğe bağlı)</span><select name="categoryId" defaultValue=""><option value="">Tercih belirtmiyorum</option>{categories.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
        <input type="hidden" name="version" value={INTEREST_CONSENT_VERSION} />
        <div hidden aria-hidden="true"><label>Web sitesi<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <p className="commerce-help">E-posta ve tercihlerinin açılış bilgilendirmesi için nasıl işlendiğini <Link href="/kvkk#launch-interest">KVKK aydınlatmasından</Link> okuyabilirsin.</p>
        <label className="prelaunch-consent"><input type="checkbox" name="consent" required /><span>FUWU açılışı hakkında e-posta almak istiyorum. İznimi bu sayfadan geri çekebilirim.</span></label>
        <button className="commerce-button" disabled={!available || !authenticated || pending} type="submit">{pending ? "Kaydediliyor…" : "Haberdar Ol"}</button>
      </fieldset>
    </form>
    {authenticated && <button className="commerce-text-link mt-5" disabled={pending} type="button" onClick={() => { setFeedback(null); startTransition(async () => { try { setFeedback(await withdrawInterestAction()); } catch { setFeedback({ ok: false, message: "İzin geri çekilemedi. Lütfen yeniden dene." }); } }); }}>İletişim iznimi geri çek</button>}
    {feedback && <p role={feedback.ok ? "status" : "alert"} className={feedback.ok ? "commerce-notice" : "commerce-error"}>{feedback.message}</p>}
  </section>;
}
