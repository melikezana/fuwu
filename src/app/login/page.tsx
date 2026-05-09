import type { Metadata } from "next";
import Link from "next/link";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import { LoginOptions } from "@/components/auth/LoginOptions";
import { Container } from "@/components/common/Container";
import { appRoutes } from "@/constants/navigation";

export const metadata: Metadata = {
  title: "Giriş | Fuwu",
  description:
    "Fuwu giriş sistemi Supabase Auth için hazırlanıyor; şifre toplanmaz ve ustalar girişsiz incelenebilir.",
};

export default function LoginPage() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFB_54%,#F6F7F9_100%)]">
      <FuwuWatermark className="-right-20 top-10 text-[9rem] opacity-[0.035] sm:text-[12rem]" />
      <Container className="relative grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.55fr)] lg:items-center lg:py-16">
        <div className="min-w-0 cursor-default select-none">
          <div className="inline-flex rounded-lg bg-white px-4 py-3 shadow-[0_18px_54px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)]">
            <FuwuLogo size="md" />
          </div>
          <p className="mt-7 text-sm font-black uppercase text-[var(--brand-orange-dark)]">
            Supabase Auth hazırlığı
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-[var(--brand-navy)] sm:text-5xl">
            Giriş sistemi yakında aktif olacak.
          </h1>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            Google, e-posta magic link ve telefon doğrulama akışları için temel hazırlık yapıldı.
            Şimdilik şifre toplanmaz, hesap oluşturulmaz ve ustaları giriş yapmadan
            inceleyebilirsin.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {["Profil karşılaştırma", "Telefon ve WhatsApp", "Hesapsız erişim"].map((badge) => (
              <Link
                className="rounded-md bg-white px-3 py-2 text-sm font-black text-[var(--brand-navy)] shadow-[0_10px_26px_rgba(13,20,36,0.04)] ring-1 ring-[rgba(13,20,36,0.08)] transition-colors hover:bg-[var(--brand-orange-soft)]"
                href={appRoutes.providers}
                key={badge}
              >
                {badge}
              </Link>
            ))}
          </div>
        </div>

        <LoginOptions />
      </Container>
    </section>
  );
}
