"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { ArrowRight, Loader2, Mail, Phone, type LucideIcon } from "lucide-react";
import { appRoutes } from "@/lib/constants/navigation";
import { getPublicErrorMessage } from "@/lib/errors";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { getSafeRedirectPath } from "@/lib/security";
import { isSupabaseAuthConfigured } from "@/lib/supabase/client";
import { validateLoginEmailInput } from "@/lib/validations";
import { signInWithEmailMagicLink, signInWithGoogle } from "@/services/auth";

type LoginOptionKey = "google" | "email";

type LoginOption = {
  descriptionKey: TranslationKey;
  Icon: LucideIcon | "google";
  key: LoginOptionKey;
  labelKey: TranslationKey;
};

const authRedirectPath = "/auth/callback";

const loginOptions: LoginOption[] = [
  {
    descriptionKey: "login.googleDescription",
    Icon: "google",
    key: "google",
    labelKey: "login.google",
  },
  {
    descriptionKey: "login.emailDescription",
    Icon: Mail,
    key: "email",
    labelKey: "login.email",
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

function getOptionDescription(option: LoginOption, t: ReturnType<typeof useI18n>["t"]) {
  if (!isSupabaseAuthConfigured) {
    return t("login.status.unavailable");
  }

  return t(option.descriptionKey);
}

function getOptionStatus(
  optionKey: LoginOptionKey,
  isLoading: boolean,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (!isSupabaseAuthConfigured) {
    return t("login.statusSoon");
  }

  if (optionKey === "google") {
    return isLoading ? t("login.statusOpening") : t("login.statusActive");
  }

  return isLoading ? t("login.statusSending") : t("login.statusActive");
}

export function LoginOptions() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [feedbackKey, setFeedbackKey] = useState<TranslationKey>(
    isSupabaseAuthConfigured
      ? "login.status.ready"
      : "login.status.unavailable",
  );
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const feedback = feedbackText ?? t(feedbackKey);

  function setTranslatedFeedback(key: TranslationKey) {
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

    setIsEmailLoading(true);
    setTranslatedFeedback("login.status.emailPreparing");

    try {
      await signInWithEmailMagicLink(validationResult.data.email, getAuthRedirectUrl());
      setTranslatedFeedback("login.status.emailSent");
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
            <span className="block leading-5">{t(loginOptions[0].labelKey)}</span>
            <span className="mt-1 block text-xs font-bold leading-5 text-[var(--muted)]">
              {getOptionDescription(loginOptions[0], t)}
            </span>
          </span>
          <span className="w-fit rounded-md bg-[var(--surface-soft)] px-2.5 py-1 text-[0.68rem] font-black text-[var(--muted)]">
            {getOptionStatus("google", isGoogleLoading, t)}
          </span>
        </button>

        <form className="grid gap-3" noValidate onSubmit={handleEmailLogin}>
          <label className="block min-w-0 cursor-default select-none">
            <span className="mb-2 block text-sm font-black text-[var(--brand-navy)]">
              {t(loginOptions[1].labelKey)}
            </span>
            <span className="grid min-h-12 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 rounded-md bg-white px-4 py-3 shadow-[inset_0_0_0_1px_rgba(13,20,36,0.14)] focus-within:ring-2 focus-within:ring-[var(--brand-orange)] focus-within:ring-offset-2">
              <LoginIcon Icon={loginOptions[1].Icon} />
              <input
                aria-describedby="login-auth-status"
                className="min-w-0 cursor-text bg-transparent text-sm font-bold text-[var(--brand-navy)] outline-none placeholder:text-[var(--muted)]"
                disabled={isEmailLoading}
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("login.emailPlaceholder")}
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
            {t("login.email")}
          </button>
          <span className="cursor-default select-none text-xs font-bold leading-5 text-[var(--muted)]">
            {getOptionDescription(loginOptions[1], t)}
          </span>
        </form>

        <div
          aria-disabled="true"
          className="grid min-h-16 cursor-default select-none grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-[var(--surface-soft)] px-4 py-3 text-left text-sm font-black text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.1)]"
          role="note"
        >
          <LoginIcon Icon={Phone} />
          <span className="min-w-0">
            <span className="block leading-5">{t("login.phone")}</span>
            <span className="mt-1 block text-xs font-bold leading-5 text-[var(--muted)]">
              {t("login.phoneUnavailable")}
            </span>
          </span>
          <span className="w-fit rounded-md bg-white px-2.5 py-1 text-[0.68rem] font-black text-[var(--muted)]">
            {t("login.statusSoon")}
          </span>
        </div>

        <Link
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-4 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(255,138,0,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
          href={appRoutes.providers}
        >
          {t("login.continueWithoutLogin")}
          <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
        </Link>
      </div>

      <div className="mt-4 min-h-12 cursor-default select-none rounded-md border border-[rgba(255,138,0,0.2)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
        {t("login.guestNote")}{" "}
        <a
          className="cursor-pointer underline decoration-[var(--brand-orange-dark)] decoration-2 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
          href="mailto:fuwuhizmet@gmail.com"
        >
          {t("login.emailLink")}
        </a>
        .
      </div>
    </div>
  );
}
