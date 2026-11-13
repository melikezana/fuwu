"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { Loader2, Mail, Phone } from "lucide-react";
import { appRoutes } from "@/lib/constants/navigation";
import { getPublicErrorMessage } from "@/lib/errors";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { getSafeRedirectPath } from "@/lib/security";
import { isSupabaseAuthConfigured } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { validateLoginEmailInput, validateLoginPhoneInput, validateLoginOtpInput } from "@/lib/validations";
import { signInWithEmailMagicLink, signInWithGoogle, signInWithPhoneOtp, verifyPhoneOtp } from "@/services/auth";
import { oauthErrors } from "@/lib/auth/oauth";

const authRedirectPath = "/auth/callback";

// Google'ın resmi çok renkli "G" işareti (marka yönergesine uygun düğme simgesi).
function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function getSafeNextPath() {
  const nextPath = new URLSearchParams(window.location.search).get("next");

  return getSafeRedirectPath(nextPath, appRoutes.account);
}

function getAuthRedirectUrl() {
  const params = new URLSearchParams({
    next: getSafeNextPath(),
  });

  return `${window.location.origin}${authRedirectPath}?${params.toString()}`;
}

export function LoginOptions({ phoneLogin = true }: { phoneLogin?: boolean }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const searchParams = useSearchParams();
  // Usta başvurusundan gelen bağlantılar ?method=phone taşır: ustalar çoğunlukla telefonla giriş yapar.
  // SMS kurulu değilken telefon sekmesi gösterilmez: kod gitmeyeceği için kullanıcı çıkmaza girerdi.
  const prefersPhone = phoneLogin && searchParams.get("method") === "phone";
  const [method, setMethod] = useState<"email" | "phone">(prefersPhone ? "phone" : "email");
  const [feedbackKey, setFeedbackKey] = useState<TranslationKey | null>(
    isSupabaseAuthConfigured ? null : "login.status.unavailable",
  );
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  // Aynı adrese/numaraya art arda kod istenmesin: Supabase 60 sn sınırına takılmadan önce kullanıcıya süre gösterilir.
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  useEffect(() => {
    if (!cooldownUntil) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  // Usta başvuru formunda yazılan numara girişte tekrar istenmesin.
  useEffect(() => {
    if (!prefersPhone) return;
    const timer = window.setTimeout(() => {
      try {
        const draft = JSON.parse(sessionStorage.getItem("fuwu:pending-provider-application") ?? "null") as { form?: { phone?: unknown } } | null;
        const draftPhone = typeof draft?.form?.phone === "string" ? draft.form.phone.slice(0, 20) : "";
        if (draftPhone) setPhone(current => current || draftPhone);
      } catch { /* Optional browser storage. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [prefersPhone]);

  // Google sayfasından geri tuşuyla dönülünce (bfcache) düğmeler "açılıyor" durumunda kilitli kalmasın.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setIsGoogleLoading(false);
      setIsEmailLoading(false);
      setIsPhoneLoading(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  function startCooldown() {
    const until = Date.now() + 60_000;
    setNow(Date.now());
    setCooldownUntil(until);
  }
  const urlError = searchParams.get("error");
  const callbackFeedback = urlError && Object.hasOwn(oauthErrors, urlError)
    ? oauthErrors[urlError as keyof typeof oauthErrors] : null;
  const feedback = feedbackText ?? callbackFeedback ?? (feedbackKey ? t(feedbackKey) : "");
  // Mesaj tonu: başarı yeşil, hata kırmızı, bilgi nötr. Boşken kutu hiç görünmez.
  const feedbackTone = !feedback ? "none"
    : /gönderildi|başarılı|Yönlendiriliyorsun|açılıyor/i.test(feedback) ? "success"
    : /hatalı|geçersiz|gönderilemedi|açılamıyor|aktif değil|kullanılamıyor|bekle|gir\.|zorunlu|olmalı|dolmuş|tamamlanmadı|ulaşılamıyor|hazırlanamadı/i.test(feedback) ? "error" : "info";

  function setTranslatedFeedback(key: TranslationKey | null) {
    setFeedbackKey(key);
    setFeedbackText(null);
  }

  async function handleGoogleLogin() {
    if (!isSupabaseAuthConfigured) {
      setTranslatedFeedback("login.status.unavailable");
      return;
    }

    setIsGoogleLoading(true);
    setTranslatedFeedback("login.status.googleOpening");

    try {
      await signInWithGoogle(getAuthRedirectUrl());
    } catch (error) {
      setFeedbackText(
        getPublicErrorMessage(
          error,
          t("login.status.googleError"),
        ),
      );
      setIsGoogleLoading(false);
    }
  }

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSupabaseAuthConfigured) {
      setTranslatedFeedback("login.status.unavailable");
      return;
    }

    const validationResult = validateLoginEmailInput(email);

    if (!validationResult.ok) {
      setFeedbackText(validationResult.fieldErrors.email ?? t("login.emailInvalid"));
      return;
    }

    if (cooldown > 0) {
      setFeedbackText(`Yeni bağlantı için ${cooldown} saniye bekle. Gelen kutunu ve spam klasörünü kontrol et.`);
      return;
    }

    setIsEmailLoading(true);
    setTranslatedFeedback("login.status.emailPreparing");

    try {
      await signInWithEmailMagicLink(validationResult.data.email, getAuthRedirectUrl());
      setTranslatedFeedback("login.status.emailSent");
      startCooldown();
    } catch (error) {
      setFeedbackText(
        getPublicErrorMessage(
          error,
          t("login.status.emailError"),
        ),
      );
    } finally {
      setIsEmailLoading(false);
    }
  }

  async function handlePhoneLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSupabaseAuthConfigured) {
      setTranslatedFeedback("login.status.unavailable");
      return;
    }

    if (showOtpInput) {
      const validationResult = validateLoginOtpInput(otpToken);

      if (!validationResult.ok) {
        setFeedbackText(validationResult.fieldErrors.otp ?? "Lütfen 6 haneli kodu gir.");
        return;
      }

      setIsPhoneLoading(true);
      setFeedbackText("Giriş yapılıyor…");

      try {
        await verifyPhoneOtp(phone, validationResult.data.otp);
        setFeedbackText("Giriş başarılı. Yönlendiriliyorsun…");
        // Tam sayfa geçişi: sunucu bileşenleri ve üst menü yeni oturumu hemen görür.
        window.location.assign(getSafeNextPath());
      } catch (error) {
        setFeedbackText(
          getPublicErrorMessage(
            error,
            "Girdiğin kod hatalı veya süresi dolmuş. Lütfen tekrar dene."
          ),
        );
      } finally {
        setIsPhoneLoading(false);
      }
      return;
    }

    await sendPhoneCode();
  }

  async function sendPhoneCode() {
    const validationResult = validateLoginPhoneInput(phone);

    if (!validationResult.ok) {
      setFeedbackText(validationResult.fieldErrors.phone ?? "Geçerli bir telefon numarası gir.");
      return;
    }

    if (cooldown > 0) {
      setFeedbackText(`Yeni kod için ${cooldown} saniye bekle.`);
      return;
    }

    setIsPhoneLoading(true);
    setFeedbackText("Giriş kodu gönderiliyor…");

    try {
      await signInWithPhoneOtp(validationResult.data.phone);
      setShowOtpInput(true);
      setOtpToken("");
      startCooldown();
      setFeedbackText("Giriş kodu SMS ile gönderildi. Kod birkaç saniye içinde gelir.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";
      if (errorMessage.includes("not configured") || errorMessage.includes("not enabled")) {
        setFeedbackText("Telefonla giriş şu anda aktif değil. Lütfen e-posta veya Google ile devam et.");
      } else {
        setFeedbackText(
          getPublicErrorMessage(
            error,
            "Giriş kodu gönderilemedi. Lütfen tekrar dene."
          ),
        );
      }
    } finally {
      setIsPhoneLoading(false);
    }
  }

  const busy = isGoogleLoading || isEmailLoading || isPhoneLoading;

  return (
    <div className="login-card" data-testid="login-options">
      <p
        aria-live="polite"
        className={feedbackTone === "none" ? "sr-only" : `login-status is-${feedbackTone}`}
        id="login-auth-status"
        role="status"
      >
        {feedback}
      </p>

      <button
        aria-describedby="login-auth-status"
        className="login-google"
        disabled={busy}
        onClick={() => void handleGoogleLogin()}
        type="button"
      >
        {isGoogleLoading ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : <GoogleMark />}
        {t("login.google")}
      </button>

      <div className="login-divider" role="separator"><span>veya</span></div>

      <div aria-label="Giriş yöntemi" className="login-tabs" role="tablist">
        {([["email", "E-posta", Mail], ...(phoneLogin ? [["phone", "Telefon", Phone]] as const : [])] as const).map(([key, label, Icon]) => (
          <button
            aria-selected={method === key}
            className="login-tab"
            disabled={busy}
            key={key}
            onClick={() => { setMethod(key); setFeedbackText(null); setTranslatedFeedback(isSupabaseAuthConfigured ? null : "login.status.unavailable"); }}
            role="tab"
            type="button"
          >
            <Icon aria-hidden="true" className="size-4" />{label}
          </button>
        ))}
      </div>

      {method === "email" ? (
        <form className="login-form" data-testid="email-login-form" noValidate onSubmit={handleEmailLogin}>
          <label className="login-label" htmlFor="login-email">E-posta adresin</label>
          <input
            aria-describedby="login-auth-status login-email-hint"
            autoComplete="email"
            className="login-input"
            data-testid="login-email-input"
            disabled={isEmailLoading}
            id="login-email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("login.emailPlaceholder")}
            type="email"
            value={email}
          />
          <button className="login-submit" disabled={isEmailLoading} type="submit">
            {isEmailLoading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {cooldown > 0 ? `Tekrar gönder (${cooldown} sn)` : "Giriş bağlantısı gönder"}
          </button>
          <p className="login-hint" id="login-email-hint">E-postana tek dokunuşla giriş bağlantısı gelir.</p>
        </form>
      ) : (
        <form className="login-form" data-testid="phone-login-form" noValidate onSubmit={handlePhoneLogin}>
          <label className="login-label" htmlFor="login-phone">{showOtpInput ? "SMS ile gelen 6 haneli kod" : "Cep telefonun"}</label>
          <input
            aria-describedby="login-auth-status"
            autoComplete={showOtpInput ? "one-time-code" : "tel"}
            className="login-input"
            data-testid={showOtpInput ? "login-otp-input" : "login-phone-input"}
            disabled={isPhoneLoading}
            id="login-phone"
            inputMode={showOtpInput ? "numeric" : "tel"}
            maxLength={showOtpInput ? 6 : 20}
            onChange={(event) => showOtpInput ? setOtpToken(event.target.value.replace(/\D/g, "").slice(0, 6)) : setPhone(event.target.value)}
            placeholder={showOtpInput ? "••••••" : "05XX XXX XX XX"}
            type="text"
            value={showOtpInput ? otpToken : phone}
          />
          <button className="login-submit" disabled={isPhoneLoading} type="submit">
            {isPhoneLoading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {showOtpInput ? "Giriş yap" : "Kod gönder"}
          </button>
          {showOtpInput ? (
            <div className="login-otp-actions">
              <button disabled={isPhoneLoading} onClick={() => { setShowOtpInput(false); setOtpToken(""); setFeedbackText(null); }} type="button">
                Numarayı değiştir
              </button>
              <button disabled={isPhoneLoading || cooldown > 0} onClick={() => void sendPhoneCode()} type="button">
                {cooldown > 0 ? `Kodu tekrar gönder (${cooldown} sn)` : "Kodu tekrar gönder"}
              </button>
            </div>
          ) : (
            <p className="login-hint">Numarana 6 haneli bir kod göndereceğiz.</p>
          )}
        </form>
      )}

      <p className="login-legal">
        Devam ederek <Link href={appRoutes.terms}>Kullanım Şartları</Link>&apos;nı kabul etmiş ve{" "}
        <Link href={appRoutes.kvkk}>KVKK Aydınlatma Metni</Link>&apos;ni okumuş olursun.
      </p>
    </div>
  );
}
