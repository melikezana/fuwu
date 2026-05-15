"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { ArrowRight, Loader2, Mail, Phone, type LucideIcon } from "lucide-react";
import { appRoutes } from "@/lib/constants/navigation";
import { getPublicErrorMessage } from "@/lib/errors";
import { getSafeRedirectPath } from "@/lib/security";
import { isSupabaseAuthConfigured } from "@/lib/supabase/client";
import { validateLoginEmailInput } from "@/lib/validations";
import { signInWithEmailMagicLink, signInWithGoogle } from "@/services/auth";

type LoginOptionKey = "google" | "email";

type LoginOption = {
  Icon: LucideIcon | "google";
  description: string;
  key: LoginOptionKey;
  label: string;
};

const authUnavailableMessage =
  "Giriş sistemi şu anda kullanılamıyor. Ustaları giriş yapmadan inceleyebilirsin.";
const phoneUnavailableMessage = "Telefon ile giriş yakında aktif olacak.";
const emailInvalidMessage = "Lütfen geçerli bir e-posta adresi gir.";
const authRedirectPath = "/auth/callback";

const loginOptions: LoginOption[] = [
  {
    Icon: "google",
    key: "google",
    label: "Google ile devam et",
    description: "Google sağlayıcısı aktifse güvenli giriş ekranına yönlendirilirsin.",
  },
  {
    Icon: Mail,
    key: "email",
    label: "E-posta giriş bağlantısı gönder",
    description: "Şifre olmadan e-postana giriş bağlantısı gönderilir.",
  },
];

function LoginIcon({ Icon }: { Icon: LoginOption["Icon"] | typeof Phone }) {
  if (Icon === "google") {
    return (
      <span className="inline-flex size-9 items-center justify-center rounded-full bg-white text-sm font-black text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.14)]">
        G
      </span>
    );
  }

  return (
    <span className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[var(--brand-navy)]">
      <Icon aria-hidden="true" className="size-4" />
    </span>
  );
}

function getSafeNextPath() {
  const nextPath = new URLSearchParams(window.location.search).get("next");

  return getSafeRedirectPath(nextPath, appRoutes.providers);
}

function getAuthRedirectUrl() {
  const params = new URLSearchParams({
    next: getSafeNextPath(),
  });

  return `${window.location.origin}${authRedirectPath}?${params.toString()}`;
}

function getOptionDescription(option: LoginOption) {
  if (!isSupabaseAuthConfigured) {
    return authUnavailableMessage;
  }

  return option.description;
}

function getOptionStatus(optionKey: LoginOptionKey, isLoading: boolean) {
  if (!isSupabaseAuthConfigured) {
    return "Yakında";
  }

  if (optionKey === "google") {
    return isLoading ? "Açılıyor" : "Aktif";
  }

  return isLoading ? "Gönderiliyor" : "Aktif";
}

export function LoginOptions() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState(
    isSupabaseAuthConfigured
      ? "Google veya e-posta giriş bağlantısı ile şifresiz giriş yapabilirsin."
      : authUnavailableMessage,
  );
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  async function handleGoogleLogin() {
    if (!isSupabaseAuthConfigured) {
      setFeedback(authUnavailableMessage);
      return;
    }

    setIsGoogleLoading(true);
    setFeedback("Google girişi açılıyor.");

    try {
      await signInWithGoogle(getAuthRedirectUrl());
    } catch (error) {
      setFeedback(
        getPublicErrorMessage(
          error,
          "Google girişi şu anda açılamıyor. Lütfen tekrar dene.",
        ),
      );
      setIsGoogleLoading(false);
    }
  }

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSupabaseAuthConfigured) {
      setFeedback(authUnavailableMessage);
      return;
    }

    const validationResult = validateLoginEmailInput(email);

    if (!validationResult.ok) {
      setFeedback(validationResult.fieldErrors.email ?? emailInvalidMessage);
      return;
    }

    setIsEmailLoading(true);
    setFeedback("Giriş bağlantısı hazırlanıyor.");

    try {
      await signInWithEmailMagicLink(validationResult.data.email, getAuthRedirectUrl());
      setFeedback("Giriş bağlantısı e-posta adresine gönderildi. Gelen kutunu kontrol et.");
    } catch (error) {
      setFeedback(
        getPublicErrorMessage(
          error,
          "Giriş bağlantısı şu anda gönderilemedi. Lütfen tekrar dene.",
        ),
      );
    } finally {
      setIsEmailLoading(false);
    }
  }

  return (
    <div className="rounded-lg bg-white p-5 shadow-[0_24px_70px_rgba(13,20,36,0.1)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6">
      <p
        aria-live="polite"
        className="mb-4 cursor-default select-none rounded-md border border-[rgba(255,138,0,0.24)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]"
        id="login-auth-status"
      >
        {feedback}
      </p>
      <div className="grid gap-3">
        <button
          aria-describedby="login-auth-status"
          className="grid min-h-14 w-full cursor-pointer select-none grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-white px-4 py-3 text-left text-sm font-black text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.14)] transition-colors hover:bg-[var(--surface-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-80"
          disabled={isGoogleLoading}
          onClick={() => void handleGoogleLogin()}
          type="button"
        >
          {isGoogleLoading ? (
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-white text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.14)]">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            </span>
          ) : (
            <LoginIcon Icon={loginOptions[0].Icon} />
          )}
          <span className="min-w-0">
            <span className="block leading-5">{loginOptions[0].label}</span>
            <span className="mt-1 block text-xs font-bold leading-5 text-[var(--muted)]">
              {getOptionDescription(loginOptions[0])}
            </span>
          </span>
          <span className="w-fit rounded-md bg-[var(--surface-soft)] px-2.5 py-1 text-[0.68rem] font-black text-[var(--muted)]">
            {getOptionStatus("google", isGoogleLoading)}
          </span>
        </button>

        <form className="grid gap-3" noValidate onSubmit={handleEmailLogin}>
          <label className="block min-w-0 cursor-default select-none">
            <span className="mb-2 block text-sm font-black text-[var(--brand-navy)]">
              {loginOptions[1].label}
            </span>
            <span className="grid min-h-12 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 rounded-md bg-white px-4 py-3 shadow-[inset_0_0_0_1px_rgba(13,20,36,0.14)] focus-within:ring-2 focus-within:ring-[var(--brand-orange)] focus-within:ring-offset-2">
              <LoginIcon Icon={loginOptions[1].Icon} />
              <input
                aria-describedby="login-auth-status"
                className="min-w-0 cursor-text bg-transparent text-sm font-bold text-[var(--brand-navy)] outline-none placeholder:text-[var(--muted)]"
                disabled={isEmailLoading}
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ornek@eposta.com"
                type="email"
                value={email}
              />
            </span>
          </label>
          <button
            aria-describedby="login-auth-status"
            className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--brand-navy)] px-4 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(13,20,36,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#172033] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-80"
            disabled={isEmailLoading}
            type="submit"
          >
            {isEmailLoading ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Mail aria-hidden="true" className="size-4" />
            )}
            Giriş bağlantısı gönder
          </button>
          <span className="cursor-default select-none text-xs font-bold leading-5 text-[var(--muted)]">
            {getOptionDescription(loginOptions[1])}
          </span>
        </form>

        <div
          aria-disabled="true"
          className="grid min-h-16 cursor-default select-none grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-[var(--surface-soft)] px-4 py-3 text-left text-sm font-black text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.1)]"
          role="note"
        >
          <LoginIcon Icon={Phone} />
          <span className="min-w-0">
            <span className="block leading-5">Telefon numarası ile devam et</span>
            <span className="mt-1 block text-xs font-bold leading-5 text-[var(--muted)]">
              {phoneUnavailableMessage}
            </span>
          </span>
          <span className="w-fit rounded-md bg-white px-2.5 py-1 text-[0.68rem] font-black text-[var(--muted)]">
            Yakında
          </span>
        </div>

        <Link
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-4 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(255,138,0,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
          href={appRoutes.providers}
        >
          Giriş yapmadan devam et
          <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
        </Link>
      </div>

      <div className="mt-4 min-h-12 cursor-default select-none rounded-md border border-[rgba(255,138,0,0.2)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
        Hesap girişi olmadan da ustaları inceleyebilirsin. Yardım için{" "}
        <a
          className="cursor-pointer underline decoration-[var(--brand-orange-dark)] decoration-2 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
          href="mailto:fuwuhizmet@gmail.com"
        >
          e-posta gönder
        </a>
        .
      </div>
    </div>
  );
}
