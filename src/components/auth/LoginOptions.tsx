"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Loader2, Mail, Phone, type LucideIcon } from "lucide-react";
import { appRoutes } from "@/constants/navigation";
import {
  createSupabaseBrowserClient,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/client";

type LoginOptionKey = "google" | "email" | "phone";

type LoginOption = {
  Icon: LucideIcon | "google";
  description: string;
  key: LoginOptionKey;
  label: string;
};

const authUnavailableMessage = "Giriş sistemi yakında aktif olacak.";

const loginOptions: LoginOption[] = [
  {
    Icon: "google",
    key: "google",
    label: "Google ile devam et",
    description: "Supabase OAuth için hazırlandı",
  },
  {
    Icon: Mail,
    key: "email",
    label: "E-posta ile devam et",
    description: "Magic link akışı için ayrıldı",
  },
  {
    Icon: Phone,
    key: "phone",
    label: "Telefon numarası ile devam et",
    description: "SMS doğrulama için ayrıldı",
  },
];

function LoginIcon({ Icon }: { Icon: LoginOption["Icon"] }) {
  if (Icon === "google") {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-white text-sm font-black text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.14)]">
        G
      </span>
    );
  }

  return (
    <span className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[var(--brand-navy)]">
      <Icon aria-hidden="true" className="size-4" />
    </span>
  );
}

function getOptionDescription(option: LoginOption) {
  if (!isSupabaseAuthConfigured) {
    return authUnavailableMessage;
  }

  return option.description;
}

function getOptionStatus(optionKey: LoginOptionKey, isGoogleLoading: boolean) {
  if (optionKey === "google" && isSupabaseAuthConfigured) {
    return isGoogleLoading ? "Açılıyor" : "Hazır";
  }

  return "Yakında";
}

export function LoginOptions() {
  const [feedback, setFeedback] = useState(
    isSupabaseAuthConfigured
      ? "Google girişi Supabase Auth ile hazırlanmıştır."
      : authUnavailableMessage,
  );
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleGoogleLogin() {
    if (!isSupabaseAuthConfigured) {
      setFeedback(authUnavailableMessage);
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setFeedback(authUnavailableMessage);
      return;
    }

    setIsGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${appRoutes.providers}`,
      },
    });

    if (error) {
      setFeedback(authUnavailableMessage);
      setIsGoogleLoading(false);
    }
  }

  function handlePreparedOption(optionKey: LoginOptionKey) {
    if (optionKey === "google") {
      void handleGoogleLogin();
      return;
    }

    setFeedback(authUnavailableMessage);
  }

  return (
    <div className="rounded-lg bg-white p-5 shadow-[0_24px_70px_rgba(13,20,36,0.1)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6">
      <p
        className="mb-4 cursor-default select-none rounded-md border border-[rgba(255,138,0,0.24)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]"
        id="login-auth-status"
      >
        {feedback}
      </p>
      <div className="grid gap-3">
        {loginOptions.map((option) => (
          <button
            aria-describedby="login-auth-status"
            className="grid min-h-12 w-full cursor-pointer select-none grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-white px-4 py-3 text-left text-xs font-black text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.14)] transition-colors hover:bg-[var(--surface-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-80 sm:text-sm"
            disabled={option.key === "google" && isGoogleLoading}
            key={option.label}
            onClick={() => handlePreparedOption(option.key)}
            type="button"
          >
            {option.key === "google" && isGoogleLoading ? (
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-white text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.14)]">
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              </span>
            ) : (
              <LoginIcon Icon={option.Icon} />
            )}
            <span className="min-w-0">
              <span className="block truncate">{option.label}</span>
              <span className="mt-1 block text-xs font-bold text-[var(--muted)]">
                {getOptionDescription(option)}
              </span>
            </span>
            <span className="rounded-md bg-[var(--surface-soft)] px-2.5 py-1 text-[0.68rem] font-black text-[var(--muted)]">
              {getOptionStatus(option.key, isGoogleLoading)}
            </span>
          </button>
        ))}

        <Link
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-4 py-3 text-xs font-black text-white shadow-[0_14px_32px_rgba(255,138,0,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:text-sm"
          href={appRoutes.providers}
        >
          Giriş yapmadan devam et
          <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
        </Link>
      </div>

      <div className="mt-4 min-h-12 cursor-default select-none rounded-md border border-[rgba(255,138,0,0.2)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
        Hesap girişi olmadan da ustaları inceleyebilirsin. Yardım için{" "}
        <a
          className="cursor-pointer underline decoration-[var(--brand-orange-dark)] decoration-2 underline-offset-4"
          href="mailto:fuwuhizmet@gmail.com"
        >
          e-posta gönder
        </a>
        .
      </div>
    </div>
  );
}
