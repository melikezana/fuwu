import type { Metadata } from "next";
import Link from "next/link";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { RequestForm } from "@/components/request/RequestForm";
import { appRoutes } from "@/lib/constants/navigation";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { authAccessMessages } from "@/services/auth/constants";
import {
  getAuthenticatedServerUserId,
  getCurrentServerUserProfile,
} from "@/services/auth/server";

export const metadata: Metadata = {
  title: "Talep Oluştur",
  description:
    "Fuwu hizmet talebi oluşturma akışı giriş yapan kullanıcılar için güvenli şekilde hazırlanır.",
};

export const dynamic = "force-dynamic";

type RequestSearchParams = {
  approximate_location?: string | string[];
  budget?: string | string[];
  district?: string | string[];
  match_budget?: string | string[];
  match_district?: string | string[];
  match_notes?: string | string[];
  match_offer_amount?: string | string[];
  match_payment_preference?: string | string[];
  match_service?: string | string[];
  match_time?: string | string[];
  notes?: string | string[];
  offer_amount?: string | string[];
  payment_preference?: string | string[];
  service?: string | string[];
  time?: string | string[];
};

type RequestPageProps = {
  searchParams?: Promise<RequestSearchParams>;
};

function getSearchParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function createRequestNextPath(params?: RequestSearchParams) {
  const nextParams = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    const paramValue = getSearchParam(value);

    if (paramValue.trim()) {
      nextParams.set(key, paramValue);
    }
  });

  const queryString = nextParams.toString();

  return queryString ? `${appRoutes.request}?${queryString}` : appRoutes.request;
}

function LoginRequiredState({ nextPath }: { nextPath: string }) {
  const loginHref = `${appRoutes.login}?next=${encodeURIComponent(nextPath)}`;

  return (
    <Card className="min-w-0">
      <div className="cursor-default select-none">
        <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
          Giriş gerekli
        </p>
        <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--brand-navy)]">
          {authAccessMessages.loginRequired}
        </h2>
        <p className="mt-4 text-base font-semibold leading-7 text-[var(--muted)]">
          Usta profillerini giriş yapmadan inceleyebilirsin. Ancak hizmet talebi oluşturmak için
          hesabınla devam etmen gerekir.
        </p>
        {!isSupabaseServerConfigured ? (
          <p className="mt-4 rounded-md border border-[rgba(255,138,0,0.24)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
            Giriş ve veri bağlantısı henüz aktif olmadığı için bu ekranda gerçek talep kaydı
            alınmaz.
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button className="w-full sm:w-fit" href={loginHref}>
          Giriş Yap
        </Button>
        <Button className="w-full sm:w-fit" href={appRoutes.providers} variant="secondary">
          Usta Bul
        </Button>
      </div>
    </Card>
  );
}

export default async function RequestPage({ searchParams }: RequestPageProps) {
  const params = await searchParams;
  const nextPath = createRequestNextPath(params);
  const [authenticatedUserId, profile] = await Promise.all([
    getAuthenticatedServerUserId(),
    getCurrentServerUserProfile(),
  ]);
  const initialService = getSearchParam(params?.service) || getSearchParam(params?.match_service);
  const initialDistrict =
    getSearchParam(params?.district) || getSearchParam(params?.match_district);
  const initialBudgetTag = getSearchParam(params?.budget) || getSearchParam(params?.match_budget);
  const initialNotes = getSearchParam(params?.notes) || getSearchParam(params?.match_notes);
  const initialTimePreference = getSearchParam(params?.time) || getSearchParam(params?.match_time);
  const initialOfferAmount =
    getSearchParam(params?.offer_amount) || getSearchParam(params?.match_offer_amount);
  const initialPaymentPreference =
    getSearchParam(params?.payment_preference) ||
    getSearchParam(params?.match_payment_preference);
  const initialApproximateLocation = getSearchParam(params?.approximate_location);

  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#FFF7EC_42%,#ffffff_100%)]">
      <FuwuWatermark className="-right-20 top-10 text-[10rem] opacity-[0.04] sm:text-[13rem]" />
      <Container className="relative grid min-h-[620px] gap-8 py-10 sm:py-14 lg:grid-cols-[0.84fr_1.16fr] lg:items-center lg:py-16">
        <div className="min-w-0 cursor-default select-none">
          <Link
            aria-label="Fuwu ana sayfasına git"
            className="inline-flex cursor-pointer rounded-lg bg-[var(--brand-navy)] px-5 py-4 shadow-[0_24px_70px_rgba(13,20,36,0.18)] transition-colors hover:bg-[var(--brand-navy-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.home}
          >
            <FuwuLogo inverted size="lg" />
          </Link>
          <p className="mt-7 text-sm font-black uppercase tracking-normal text-[var(--brand-orange-dark)]">
            Talep oluştur
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight tracking-normal text-[var(--brand-navy)] sm:text-5xl">
            Talep oluşturmak için hesabınla devam et.
          </h1>
          <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            Ustaları ve profilleri giriş yapmadan inceleyebilirsin. Hizmet talebi oluşturma adımı
            ise adres ve iletişim bilgisi içerdiği için yalnızca giriş yapan kullanıcılarla açılır.
          </p>
        </div>

        {authenticatedUserId ? (
          <RequestForm
            authenticatedUserId={authenticatedUserId}
            initialApproximateLocation={initialApproximateLocation}
            initialBudgetTag={initialBudgetTag}
            initialDistrict={initialDistrict}
            initialNotes={initialNotes}
            initialOfferAmount={initialOfferAmount}
            initialPaymentPreference={initialPaymentPreference}
            initialProfileFullName={profile?.full_name}
            initialProfilePhone={profile?.phone}
            initialService={initialService}
            initialTimePreference={initialTimePreference}
          />
        ) : (
          <LoginRequiredState nextPath={nextPath} />
        )}
      </Container>
    </section>
  );
}
