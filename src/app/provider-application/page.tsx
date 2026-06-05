import type { Metadata } from "next";
import Link from "next/link";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ProviderApplicationForm } from "@/components/providers/ProviderApplicationForm";
import { appRoutes } from "@/lib/constants/navigation";
import { I18nText } from "@/lib/i18n";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getProviderApplicationFormOptions } from "@/services/providers/applications";
import { getAuthenticatedServerUserId } from "@/services/auth/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Usta Ağına Katıl",
  description:
    "Fuwu'da görünür olmak, doğru müşterilerden telefon ve WhatsApp ile talep almak için usta başvurusu yap.",
};

export default async function ProviderApplicationPage() {
  const [formOptions, authenticatedUserId] = await Promise.all([
    getProviderApplicationFormOptions(),
    getAuthenticatedServerUserId(),
  ]);

  const needsLogin = isSupabaseServerConfigured && !authenticatedUserId;
  const loginHref = `${appRoutes.login}?next=${encodeURIComponent(appRoutes.providerApplication)}`;

  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(135deg,#ffffff_0%,#FFF7EC_44%,#F7F7F8_100%)]">
      <FuwuWatermark className="-left-20 top-10 text-[10rem] opacity-[0.04] sm:text-[13rem]" />
      <Container className="relative grid max-w-7xl gap-7 py-9 sm:py-12 lg:py-14 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)] xl:items-start xl:gap-10">
        <div className="min-w-0 cursor-default select-none lg:max-w-[520px]">
          <Link
            aria-label="Fuwu ana sayfasına git"
            className="inline-flex cursor-pointer rounded-lg bg-white px-4 py-3 shadow-[0_18px_54px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.home}
          >
            <FuwuLogo size="md" />
          </Link>
          <p className="mt-7 text-sm font-black uppercase tracking-normal text-[var(--brand-orange-dark)]">
            <I18nText i18nKey="providerApplication.eyebrow" />
          </p>
          <h1 className="mt-4 max-w-[640px] text-3xl font-bold leading-tight tracking-normal text-[var(--brand-navy)] sm:text-4xl lg:text-[2.5rem]">
            <I18nText i18nKey="providerApplication.title" />
          </h1>
          <p className="mt-5 max-w-[680px] text-base font-medium leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            <I18nText i18nKey="providerApplication.subtitle" />
          </p>
          <div className="mt-6 cursor-default select-none rounded-lg border border-[rgba(255,138,0,0.28)] bg-white p-5 shadow-[0_18px_48px_rgba(13,20,36,0.07)]">
            <p className="text-sm font-black uppercase text-[var(--brand-orange-dark)]">
              <I18nText i18nKey="providerApplication.trustTitle" />
            </p>
            <p className="mt-2 text-base font-semibold leading-7 text-[var(--brand-navy)]">
              <I18nText i18nKey="providerApplication.trustDescription" />
            </p>
            <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 text-sm font-bold leading-6 text-[var(--muted)]">
              <p>
                <I18nText i18nKey="providerApplication.reassurance" />
              </p>
              <p>
                <I18nText i18nKey="providerApplication.noPassword" />
              </p>
            </div>
          </div>
        </div>

        {needsLogin ? (
          <div className="min-w-0 rounded-xl border border-[var(--border)] bg-white p-6 shadow-[0_24px_70px_rgba(13,20,36,0.1)] sm:p-8">
            <p className="text-sm font-black uppercase tracking-wider text-[var(--brand-orange-dark)]">
              Giriş gerekli
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight text-[var(--brand-navy)]">
              Başvurmak için Google ile giriş yap
            </h2>
            <p className="mt-4 text-sm font-semibold leading-7 text-[var(--muted)]">
              Usta ağına başvurmak için bir Fuwu hesabı gerekli. Google ile saniyeler içinde giriş
              yap ve hemen formu doldur.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button href={loginHref}>Google ile Giriş Yap</Button>
              <Button href={appRoutes.providers} variant="secondary">
                Ustaları İncele
              </Button>
            </div>
          </div>
        ) : (
          <ProviderApplicationForm
            categories={formOptions.categories}
            districts={formOptions.districts}
            isConfigured={formOptions.isConfigured}
            lookupError={formOptions.error}
          />
        )}
      </Container>
    </section>
  );
}
