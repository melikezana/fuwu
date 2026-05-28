"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  WalletCards,
  Zap,
} from "lucide-react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";
import { providerDistricts } from "@/lib/constants/providers";
import { services, type Service } from "@/lib/constants/services";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/services/auth";
import {
  calculateSuggestedPrice,
  getEmergencyPriceOptions,
  getEmergencyPriceRange,
} from "@/services/matching";
import {
  PAYMENT_PREFERENCES,
  getPaymentPreferenceLabel,
  type ServiceRequestPaymentPreference,
} from "@/services/payments";
import { createEmergencyRequest, type ServiceRequestSubmitResult } from "@/services/requests";
import type { ProviderFilterOptions } from "@/services/providers";

type HomeHeroFiltersProps = {
  filterOptions: ProviderFilterOptions;
};

type PaymentOption = {
  description: string;
  label: string;
  value: ServiceRequestPaymentPreference;
};

const emergencyServiceIds = [
  "plumbing",
  "electrical",
  "cleaning",
  "pool",
  "garden",
  "climate-appliance-service",
] as const;

const paymentOptions: PaymentOption[] = [
  {
    description: "Usta geldiğinde öde",
    label: "Nakit",
    value: PAYMENT_PREFERENCES.cash,
  },
  {
    description: "Usta kabul edince paylaşılır",
    label: "IBAN",
    value: PAYMENT_PREFERENCES.iban,
  },
];

function getEmergencyServices() {
  const selectedServices = emergencyServiceIds
    .map((id) => services.find((service) => service.id === id))
    .filter((service): service is Service => Boolean(service));

  return selectedServices.length ? selectedServices : services.slice(0, 6);
}

function formatPrice(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Teklif seç";
  }

  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value)} TL`;
}

function buildRequestHref({
  district,
  offerAmount,
  paymentPreference,
  service,
}: {
  district: string;
  offerAmount: number;
  paymentPreference: ServiceRequestPaymentPreference;
  service: Service;
}) {
  const params = new URLSearchParams({
    budget: "acil-hizmet",
    district,
    offer_amount: String(offerAmount),
    payment_preference: paymentPreference,
    service: service.title,
    time: "bugun",
  });

  return `${appRoutes.request}?${params.toString()}`;
}

export function HomeHeroFilters({ filterOptions }: HomeHeroFiltersProps) {
  const router = useRouter();
  const emergencyServices = useMemo(getEmergencyServices, []);
  const districtOptions = useMemo(
    () =>
      Array.from(new Set([...providerDistricts, ...filterOptions.districts])).sort(
        (firstDistrict, secondDistrict) => firstDistrict.localeCompare(secondDistrict, "tr"),
      ),
    [filterOptions.districts],
  );
  const [selectedServiceId, setSelectedServiceId] = useState(
    emergencyServices[0]?.id ?? services[0]?.id ?? "",
  );
  const selectedService =
    emergencyServices.find((service) => service.id === selectedServiceId) ??
    emergencyServices[0] ??
    services[0];
  const [district, setDistrict] = useState("");
  const [offeredPrice, setOfferedPrice] = useState(() =>
    calculateSuggestedPrice({
      budgetTag: "acil-hizmet",
      service: selectedService?.title,
    }),
  );
  const [paymentPreference, setPaymentPreference] =
    useState<ServiceRequestPaymentPreference>(PAYMENT_PREFERENCES.cash);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] =
    useState<ServiceRequestSubmitResult | null>(null);
  const priceRange = getEmergencyPriceRange(selectedService?.title);
  const priceOptions = getEmergencyPriceOptions(selectedService?.title);
  const requestHref = selectedService
    ? buildRequestHref({
        district,
        offerAmount: offeredPrice || priceRange.suggestedPrice,
        paymentPreference,
        service: selectedService,
      })
    : appRoutes.request;

  useEffect(() => {
    if (!selectedService) {
      return;
    }

    const nextPrice = calculateSuggestedPrice({
      budgetTag: "acil-hizmet",
      district,
      service: selectedService.title,
    });

    setOfferedPrice(nextPrice || priceRange.suggestedPrice);
  }, [district, priceRange.suggestedPrice, selectedService]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmittedRequest(null);

    if (!selectedService || !district) {
      setSubmitError("Hizmet ve ilçe seçerek devam et.");
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await getCurrentUser();

      if (!user) {
        router.push(requestHref);
        return;
      }

      const result = await createEmergencyRequest(
        {
          approximateLocation: district,
          budgetTag: "acil-hizmet",
          district,
          fullAddress: district,
          fullName: "",
          offerAmount: String(offeredPrice || priceRange.suggestedPrice),
          offeredPrice: offeredPrice || priceRange.suggestedPrice,
          paymentPreference,
          phoneNumber: "",
          preferredDate: "",
          preferredTimeRange: "",
          serviceCategory: selectedService.title,
          shortDescription: `Acil ${selectedService.title} talebi`,
          urgencyLevel: "Acil",
          urgencyType: "emergency",
        },
        user.id,
      );

      setSubmittedRequest(result);
    } catch {
      setSubmitError("Acil çağrı şu anda başlatılamadı. Seçimlerin korunarak devam edebilirsin.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedRequest) {
    return (
      <div className="mt-6 w-full overflow-hidden rounded-xl bg-white p-5 shadow-[0_24px_70px_rgba(13,20,36,0.08)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6 lg:mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-md bg-[var(--trust-green-soft)] px-3 py-1.5 text-xs font-bold text-[var(--trust-green)]">
              <CheckCircle2 className="size-4" aria-hidden />
              Uygun ustalara bildirim gönderildi
            </span>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-[var(--brand-navy)]">
              Ustan gelsin
            </h2>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--muted)]">
              İlk uygun usta kabul ettiğinde varış bilgisi ve güvenli başlangıç doğrulaması aynı akışta görünür.
            </p>
          </div>
          <span className="w-fit rounded-md bg-[#F9FAFB] px-3 py-2 text-xs font-bold text-[var(--brand-navy)] ring-1 ring-[rgba(13,20,36,0.08)]">
            {submittedRequest.requestCode}
          </span>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Tahmini varış", submittedRequest.estimatedArrivalText ?? "Usta kabul edince netleşir"],
            ["Teklif", formatPrice(submittedRequest.offeredPrice ?? offeredPrice)],
            ["Ödeme", getPaymentPreferenceLabel(submittedRequest.paymentPreference ?? paymentPreference)],
            ["Başlangıç", "Doğrulama ile güvenli"],
          ].map(([label, value]) => (
            <div
              className="rounded-lg bg-[#F9FAFB] p-3 ring-1 ring-[rgba(13,20,36,0.06)]"
              key={label}
            >
              <dt className="text-[0.68rem] font-bold uppercase text-[var(--muted)]">
                {label}
              </dt>
              <dd className="mt-1 text-sm font-semibold leading-5 text-[var(--brand-navy)]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <form
      className="mt-6 w-full overflow-hidden rounded-xl bg-white p-4 shadow-[0_24px_70px_rgba(13,20,36,0.08)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-5 lg:mt-8"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-2 border-b border-[rgba(13,20,36,0.08)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-[var(--brand-orange-dark)]">
            Acil eşleşme
          </p>
          <h2 className="mt-1 text-xl font-semibold leading-tight text-[var(--brand-navy)]">
            Hizmeti seç, ilçeyi belirle, çağrıyı başlat.
          </h2>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md bg-[#F9FAFB] px-3 py-2 text-xs font-bold text-[var(--muted)] ring-1 ring-[rgba(13,20,36,0.06)]">
          <Clock3 className="size-4 text-[var(--brand-orange-dark)]" aria-hidden />
          TAG tarzı hızlı akış
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_0.9fr_1fr_0.9fr]">
        <section className="rounded-lg bg-[#F9FAFB] p-3 ring-1 ring-[rgba(13,20,36,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase text-[var(--muted)]">Hizmet</span>
            <Zap className="size-4 text-[var(--brand-orange-dark)]" aria-hidden />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {emergencyServices.map((service) => {
              const isSelected = service.id === selectedServiceId;

              return (
                <button
                  aria-pressed={isSelected}
                  className={cn(
                    "group flex min-h-16 min-w-0 items-center gap-2 rounded-lg border bg-white p-2.5 text-left transition-all",
                    isSelected
                      ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[0_12px_30px_rgba(255,138,0,0.16)]"
                      : "border-[rgba(13,20,36,0.08)] hover:border-[rgba(255,138,0,0.5)] hover:bg-[#fffaf3]",
                  )}
                  key={service.id}
                  onClick={() => setSelectedServiceId(service.id)}
                  type="button"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-md transition-colors",
                      isSelected
                        ? "bg-[var(--brand-orange)] text-white"
                        : "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] group-hover:bg-[var(--brand-orange)] group-hover:text-white",
                    )}
                  >
                    <ServiceIcon className="size-4" name={service.iconName} />
                  </span>
                  <span className="min-w-0 text-sm font-semibold leading-4 text-[var(--brand-navy)]">
                    {service.title}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <label className="rounded-lg bg-[#F9FAFB] p-3 ring-1 ring-[rgba(13,20,36,0.06)]">
          <span className="flex items-center justify-between gap-3 text-xs font-bold uppercase text-[var(--muted)]">
            İlçe
            <MapPin className="size-4 text-[var(--brand-orange-dark)]" aria-hidden />
          </span>
          <select
            className="mt-3 h-12 w-full rounded-md border border-[rgba(13,20,36,0.1)] bg-white px-3 text-sm font-semibold text-[var(--brand-navy)] outline-none transition-colors focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]"
            onChange={(event) => setDistrict(event.target.value)}
            required
            value={district}
          >
            <option value="">İlçe seç</option>
            {districtOptions.map((districtOption) => (
              <option key={districtOption} value={districtOption}>
                {districtOption}
              </option>
            ))}
          </select>
          <span className="mt-2 block text-xs font-medium text-[var(--muted)]">
            İstanbul geneli desteklenir.
          </span>
        </label>

        <section className="rounded-lg bg-[#F9FAFB] p-3 ring-1 ring-[rgba(13,20,36,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase text-[var(--muted)]">Teklif</span>
            <span className="text-xs font-semibold text-[var(--brand-navy)]">
              {formatPrice(priceRange.minimumPrice)} - {formatPrice(priceRange.maximumPrice)}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {priceOptions.map((option) => {
              const isSelected = option.value === offeredPrice;

              return (
                <button
                  aria-pressed={isSelected}
                  className={cn(
                    "min-h-10 rounded-md border px-2 text-sm font-semibold transition-all",
                    isSelected
                      ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] text-[var(--brand-navy)] shadow-[0_10px_24px_rgba(255,138,0,0.12)]"
                      : "border-[rgba(13,20,36,0.08)] bg-white text-[var(--muted)] hover:border-[var(--brand-orange)] hover:text-[var(--brand-navy)]",
                  )}
                  key={option.value}
                  onClick={() => setOfferedPrice(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg bg-[#F9FAFB] p-3 ring-1 ring-[rgba(13,20,36,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase text-[var(--muted)]">Ödeme</span>
            <WalletCards className="size-4 text-[var(--brand-orange-dark)]" aria-hidden />
          </div>
          <div className="mt-3 grid gap-2">
            {paymentOptions.map((option) => {
              const isSelected = option.value === paymentPreference;

              return (
                <button
                  aria-pressed={isSelected}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left transition-all",
                    isSelected
                      ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[0_10px_24px_rgba(255,138,0,0.12)]"
                      : "border-[rgba(13,20,36,0.08)] bg-white hover:border-[var(--brand-orange)]",
                  )}
                  key={option.value}
                  onClick={() => setPaymentPreference(option.value)}
                  type="button"
                >
                  <span className="block text-sm font-semibold text-[var(--brand-navy)]">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium leading-4 text-[var(--muted)]">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {submitError ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {submitError}{" "}
          <a className="font-bold underline underline-offset-2" href={requestHref}>
            Güvenli akışla devam et
          </a>
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex min-w-0 items-start gap-3 rounded-lg bg-[#F9FAFB] p-3 ring-1 ring-[rgba(13,20,36,0.06)]">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--trust-green)]" aria-hidden />
          <p className="text-sm font-medium leading-6 text-[var(--muted)]">
            Usta kabul edince geçici doğrulama üretilir. Nakit veya IBAN tercihin kayıt altında kalır.
          </p>
        </div>
        <Button
          className="h-12 min-h-12 w-full px-7 text-base shadow-[0_16px_34px_rgba(255,138,0,0.28)] lg:w-fit"
          disabled={isSubmitting || !district}
          type="submit"
        >
          {isSubmitting ? "Çağrı açılıyor..." : "Acil Usta Çağır"}
        </Button>
      </div>
    </form>
  );
}
