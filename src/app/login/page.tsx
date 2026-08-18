import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import { LoginOptions } from "@/components/auth/LoginOptions";
import { Container } from "@/components/ui/Container";
import { appRoutes } from "@/lib/constants/navigation";
import { I18nText, type TranslationKey } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Giriş",
  description:
    "Fuwu giriş sistemi Supabase ile şifresiz e-posta ve Google akışlarını destekler; ustalar girişsiz incelenebilir.",
};

export default function LoginPage() {
  const badges: TranslationKey[] = [
    "login.badge.compare",
    "login.badge.contact",
    "login.badge.guest",
  ];

  return (
    <section className="premium-page-shell relative overflow-hidden border-b border-[var(--border)]">
      <FuwuWatermark className="-right-20 top-10 text-[9rem] opacity-[0.035] sm:text-[12rem]" />
      <Container className="relative grid gap-5 py-5 sm:py-14 lg:grid-cols-[minmax(0,0.88fr)_minmax(20rem,0.58fr)] lg:items-center lg:py-16">
        <div className="min-w-0 cursor-default select-none">
          <Link
            aria-label="Fuwu ana sayfasına git"
            className="hidden md:inline-flex cursor-pointer rounded-lg bg-white px-4 py-3 shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.home}
          >
            <FuwuLogo size="md" />
          </Link>
          <p className="mt-2 text-xs md:mt-7 md:text-sm font-medium uppercase text-[var(--brand-orange-dark)]">
            <I18nText i18nKey="login.eyebrow" />
          </p>
          <h1 className="mt-1 md:mt-3 max-w-3xl text-2xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl md:text-5xl">
            <I18nText i18nKey="login.title" />
          </h1>
          <p className="mt-2 md:mt-5 max-w-2xl text-xs sm:text-base font-semibold leading-relaxed text-[var(--muted)] sm:leading-8">
            <I18nText i18nKey="login.description" />
          </p>
          <div className="mt-3 md:mt-7 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Link
                className="inline-flex min-h-[44px] items-center rounded-md bg-white px-3 py-2 text-xs font-semibold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] ring-1 ring-[rgba(13,20,36,0.08)] transition-colors hover:bg-[var(--brand-orange-soft)] sm:text-sm"
                href={appRoutes.providers}
                key={badge}
              >
                <I18nText i18nKey={badge} />
              </Link>
            ))}
          </div>
        </div>

        <Suspense fallback={<div className="h-full min-h-[400px] rounded-lg bg-white p-5 shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6" />}>
          <LoginOptions />
        </Suspense>
      </Container>
    </section>
  );
}
