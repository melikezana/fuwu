import type { Metadata } from "next";
import Link from "next/link";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import { Container } from "@/components/ui/Container";
import { RequestForm } from "@/components/request/RequestForm";
import { appRoutes } from "@/lib/constants/navigation";
import {
  getAuthenticatedServerUserId,
  getCurrentServerUserProfile,
} from "@/services/auth/server";
import { getRequestFormInsights } from "@/services/requests";

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

export default async function RequestPage({ searchParams }: RequestPageProps) {
  const params = await searchParams;
  const [authenticatedUserId, profile, insights] = await Promise.all([
    getAuthenticatedServerUserId(),
    getCurrentServerUserProfile(),
    getRequestFormInsights(),
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
            className="inline-flex cursor-pointer rounded-lg bg-[var(--brand-navy)] px-5 py-4 shadow-[var(--shadow-elevated)] transition-colors hover:bg-[var(--brand-navy-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.home}
          >
            <FuwuLogo inverted size="lg" />
          </Link>
          <p className="mt-7 text-sm font-medium uppercase tracking-normal text-[var(--brand-orange-dark)]">
            Talep oluştur
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-bold leading-tight tracking-normal text-[var(--brand-navy)] sm:text-5xl">
            Talep oluşturmak için hesabınla devam et.
          </h1>
          <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            Ustaları ve profilleri giriş yapmadan inceleyebilirsin. Hizmet talebi oluşturma adımı
            ise adres ve iletişim bilgisi içerdiği için yalnızca giriş yapan kullanıcılarla açılır.
          </p>
        </div>

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
          insights={insights}
        />
      </Container>
    </section>
  );
}
