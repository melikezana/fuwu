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
  title: "Hizmeti Satın Al",
  description:
    "Fuwu premium hizmet satın alma akışı servis, adres, zaman, özet ve ödeme adımlarıyla hazırlanır.",
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
  provider_id?: string | string[];
  provider_name?: string | string[];
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
  const initialProviderId = getSearchParam(params?.provider_id);
  const initialProviderName = getSearchParam(params?.provider_name);
  const isProviderProfileCheckout = Boolean(initialProviderId && initialService);

  return (
    <section className="premium-page-shell relative overflow-hidden border-b border-[var(--border)]">
      <FuwuWatermark className="-right-20 top-10 text-[10rem] opacity-[0.04] sm:text-[13rem]" />
      <Container className="relative min-h-[620px] py-10 sm:py-14 lg:py-16">
        <div className="mb-8 grid min-w-0 cursor-default select-none gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(300px,0.42fr)] lg:items-end">
          <div className="min-w-0">
            <Link
              aria-label="Fuwu ana sayfasına git"
              className="inline-flex cursor-pointer rounded-lg bg-white px-5 py-4 shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(20,33,61,0.08)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={appRoutes.home}
            >
              <FuwuLogo size="lg" />
            </Link>
            <p className="mt-7 text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
              {isProviderProfileCheckout ? "Provider checkout" : "Premium checkout"}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight tracking-normal text-[var(--brand-navy)] sm:text-5xl">
              {isProviderProfileCheckout
                ? `${initialProviderName || "Seçtiğin usta"} için randevunu planla.`
                : "Hizmetini seç, randevunu planla, ödemeye geç."}
            </h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
              {isProviderProfileCheckout
                ? "Profil üzerinden başladığın için servis seçimi tamamlandı; tarih, saat, ek hizmetler, adres, notlar, özet ve online ödeme adımlarıyla devam et."
                : "Fuwu booking akışı artık canlı sipariş özeti, ek hizmetler ve ödeme adımıyla premium marketplace checkout deneyimi sunar."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {(isProviderProfileCheckout
              ? ["Tarihi seç", "Randevuyu netleştir", "Online ödeme"]
              : ["Hizmeti seç", "Randevuyu netleştir", "Ödemeye geç"]
            ).map(
              (item, index) => (
                <div
                  className="rounded-lg border border-[rgba(20,33,61,0.08)] bg-white px-4 py-3 text-sm font-bold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)]"
                  key={item}
                >
                  <span className="mr-2 inline-flex size-7 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-xs text-[var(--brand-orange-dark)]">
                    {index + 1}
                  </span>
                  {item}
                </div>
              ),
            )}
          </div>
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
          initialProviderId={initialProviderId}
          initialProviderName={initialProviderName}
          initialService={initialService}
          initialTimePreference={initialTimePreference}
          insights={insights}
        />
      </Container>
    </section>
  );
}
