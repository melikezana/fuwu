"use client";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { saveInterestAction, withdrawInterestAction, withdrawMarketingAction } from "@/app/waitlist/actions";
import { LegalNoticeDisclosure } from "@/components/legal/LegalNoticeDisclosure";
import { LAUNCH_INTEREST_NOTICE, LAUNCH_MARKETING_CONSENT } from "@/lib/legal/notices";
import type { WaitlistEntry } from "@/services/waitlist";

type Option = { id: string; name: string };
type Feedback = { ok: boolean; message: string } | null;

export function WaitlistForm({ available = false, marketingEmailAvailable = false, authenticated = false, email = "", entry = null, categories = [], districts = [] }: {
  available?: boolean; marketingEmailAvailable?: boolean; authenticated?: boolean; email?: string; entry?: WaitlistEntry | null; categories?: Option[]; districts?: Option[];
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const run = (action: () => Promise<Feedback>, fallback: string) => {
    setFeedback(null);
    startTransition(async () => {
      try { setFeedback(await action()); }
      catch { setFeedback({ ok: false, message: fallback }); }
    });
  };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() => saveInterestAction(form), "Kayıt doğrulanamadı. Lütfen yeniden dene.");
  }
  const locked = !available || !authenticated || pending;
  return <section className="commerce-panel prelaunch-interest" aria-labelledby="interest-title">
    <h2 id="interest-title">{entry ? "Talebin kayıtlı." : "Talebini bırak."}</h2>
    {!available && <p role="status" className="commerce-notice">Talep kaydı şu anda kapalı. Hizmetleri inceleyebilir, daha sonra yeniden deneyebilirsin.</p>}
    {!authenticated && <p className="prelaunch-text">Talebini güvenle yönetebilmen için <Link href="/login?next=%2Fwaitlist">doğrulanmış e-posta hesabınla giriş yap</Link>.</p>}
    {entry && <p className="prelaunch-text">Tercihlerini aşağıdan güncelleyebilir ya da talebini kaldırabilirsin.{entry.marketingEmail ? " E-posta onayın açık." : ""}</p>}
    <form onSubmit={submit} key={entry ? `${entry.districtId}:${entry.categoryId}:${entry.marketingEmail}` : "new"}>
      <fieldset disabled={locked} className="prelaunch-interest-fields">
        <label className="commerce-field">E-posta adresin<input type="email" value={email} readOnly autoComplete="email" placeholder="Hesabındaki e-posta adresi" /></label>
        <label className="commerce-field"><span className="prelaunch-label">İlçe <small>(isteğe bağlı)</small></span><select name="districtId" defaultValue={entry?.districtId ?? ""}><option value="">Tercih belirtmiyorum</option>{districts.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
        <label className="commerce-field"><span className="prelaunch-label">Hizmet <small>(isteğe bağlı)</small></span><select name="categoryId" defaultValue={entry?.categoryId ?? ""}><option value="">Tercih belirtmiyorum</option>{categories.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
        <p className="prelaunch-text prelaunch-hint">İlçe ve hizmet seçersen ilk ustaları en çok talep gelen yere öncelikle davet ederiz.</p>
        <input type="hidden" name="noticeVersion" value={LAUNCH_INTEREST_NOTICE.version} />
        <div hidden aria-hidden="true"><label>Web sitesi<input name="website" tabIndex={-1} autoComplete="off" /></label></div>

        <div className="legal-step">
          <LegalNoticeDisclosure notice={LAUNCH_INTEREST_NOTICE} summary="Talebin için hangi verilerin, neden ve ne kadar süreyle işlendiğini anlatır. Bu bir onay değil, bilgilendirmedir." />
          <label className="prelaunch-consent"><input type="checkbox" name="noticeAcknowledged" required /><span>Aydınlatma metnini okudum, bilgi edindim.</span></label>
        </div>

        {marketingEmailAvailable ? <div className="legal-step">
          <section className="legal-block" aria-labelledby="marketing-consent-title">
            <h3 id="marketing-consent-title" className="legal-block-title">{LAUNCH_MARKETING_CONSENT.title} <small>(isteğe bağlı)</small></h3>
            {LAUNCH_MARKETING_CONSENT.body.map(paragraph => <p key={paragraph} className="legal-block-summary">{paragraph}</p>)}
          </section>
          <input type="hidden" name="marketingVersion" value={LAUNCH_MARKETING_CONSENT.version} />
          <label className="prelaunch-consent"><input type="checkbox" name="marketingEmail" defaultChecked={entry?.marketingEmail ?? false} /><span>{LAUNCH_MARKETING_CONSENT.statement}</span></label>
        </div> : <p className="prelaunch-text prelaunch-hint">E-posta ile bilgilendirme, FUWU İleti Yönetim Sistemi&apos;ne (İYS) kaydolduktan sonra açılacak. O zamana kadar e-posta göndermiyoruz; talebin yine kaydedilir.</p>}

        <button className="commerce-button" disabled={locked} type="submit">{pending ? "Kaydediliyor…" : entry ? "Tercihlerimi güncelle" : "Talebimi kaydet"}</button>
      </fieldset>
    </form>
    {authenticated && entry && <div className="prelaunch-manage">
      {entry.marketingEmail && <button className="commerce-text-link" disabled={pending} type="button" onClick={() => run(() => withdrawMarketingAction(), "E-posta onayı geri çekilemedi. Lütfen yeniden dene.")}>E-posta onayımı geri çek</button>}
      <button className="commerce-text-link" disabled={pending} type="button" onClick={() => run(() => withdrawInterestAction(), "Talep kaldırılamadı. Lütfen yeniden dene.")}>Talebimi kaldır</button>
    </div>}
    {feedback && <p role={feedback.ok ? "status" : "alert"} className={feedback.ok ? "commerce-notice" : "commerce-error"}>{feedback.message}</p>}
  </section>;
}
