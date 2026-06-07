"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createEmergencyRequestAction } from "@/app/request/actions";
import {
  Check,
  CheckCircle2,
  MapPin,
  Search,
  ShieldCheck,
  WalletCards,
  Zap,
} from "lucide-react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { Button } from "@/components/ui/Button";
import { getPublicErrorMessage } from "@/lib/errors";
import { appRoutes } from "@/lib/constants/navigation";
import { providerDistricts } from "@/lib/constants/providers";
import { normalizeServiceValue, services, type Service } from "@/lib/constants/services";
import { cn } from "@/lib/utils";
import {
  getEmergencyPriceOptions,
  getEmergencyPriceRange,
  validateEmergencyPrice,
} from "@/services/matching";
import {
  PAYMENT_PREFERENCES,
  getPaymentPreferenceLabel,
  type ServiceRequestPaymentPreference,
} from "@/services/payments";
import type { ServiceRequestSubmitResult } from "@/services/requests";
import type { ProviderFilterOptions } from "@/services/providers";

type HomeHeroFiltersProps = {
  filterOptions: ProviderFilterOptions;
};

type EmergencyStep = "service" | "district" | "price" | "payment" | "submit";

type PaymentOption = {
  description: string;
  label: string;
  value: ServiceRequestPaymentPreference;
};

type SummaryPillProps = {
  label: string;
  onClick: () => void;
  value: string;
};

type StepShellProps = {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  stepNumber: number;
  title: string;
};

const emergencyServiceIds = [
  "plumbing",
  "electrical",
  "cleaning",
  "pool",
  "garden",
  "climate-appliance-service",
] as const;

const emergencyServiceLabels: Record<string, string> = {
  "climate-appliance-service": "Klima & Beyaz Eşya",
  cleaning: "Temizlik",
  electrical: "Elektrik",
  garden: "Bahçe Bakımı",
  plumbing: "Tesisat",
  pool: "Havuz Bakımı",
};

const paymentOptions: PaymentOption[] = [
  {
    description: "Usta geldiğinde öde",
    label: "Nakit",
    value: PAYMENT_PREFERENCES.cash,
  },
  {
    description: "IBAN bilgisi usta kabulünden sonra paylaşılır.",
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

function getEmergencyServiceLabel(service: Service) {
  return emergencyServiceLabels[service.id] ?? service.title;
}

function formatPrice(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Teklif seç";
  }

  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value)} TL`;
}

function formatProviderNotificationCount(value: number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value} usta`;
  }

  return "Sayım alınamadı";
}

function buildRequestHref({
  district,
  offerAmount,
  paymentPreference,
  serviceLabel,
}: {
  district: string;
  offerAmount: number;
  paymentPreference: ServiceRequestPaymentPreference;
  serviceLabel: string;
}) {
  const params = new URLSearchParams({
    budget: "acil-hizmet",
    district,
    offer_amount: String(offerAmount),
    payment_preference: paymentPreference,
    service: serviceLabel,
    time: "bugun",
  });

  return `${appRoutes.request}?${params.toString()}`;
}

function SummaryPill({ label, onClick, value }: SummaryPillProps) {
  return (
    <button
      className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-[rgba(255,138,0,0.22)] bg-[#fff8ed] px-3 py-2 text-left text-xs font-semibold text-[var(--brand-navy)] transition-colors hover:border-[var(--brand-orange)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)]"
      onClick={onClick}
      type="button"
    >
      <Check className="size-3.5 shrink-0 text-[var(--brand-orange-dark)]" aria-hidden />
      <span className="shrink-0 text-[var(--brand-orange-dark)]">{label}</span>
      <span className="min-w-0 truncate">{value}</span>
    </button>
  );
}

function StepShell({ children, description, icon, stepNumber, title }: StepShellProps) {
  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-[rgba(13,20,36,0.08)] bg-[#fffdf9] p-4 shadow-[0_16px_42px_rgba(13,20,36,0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--brand-orange)] text-sm font-semibold text-white shadow-[0_10px_22px_rgba(255,138,0,0.2)]">
          {stepNumber}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-wrap-anywhere break-words text-lg font-semibold leading-tight text-[var(--brand-navy)]">
                {title}
              </h3>
              <p className="text-wrap-anywhere mt-1 break-words text-sm font-normal leading-6 text-[var(--muted)]">
                {description}
              </p>
            </div>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-[var(--brand-orange-dark)] ring-1 ring-[rgba(13,20,36,0.08)]">
              {icon}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function HomeHeroFilters({ filterOptions }: HomeHeroFiltersProps) {
  const router = useRouter();
  const emergencyServices = useMemo(getEmergencyServices, []);
  const districtOptions = useMemo(() => {
    const districtsByKey = new Map<string, string>();

    [...providerDistricts, ...filterOptions.districts].forEach((districtOption) => {
      const normalizedDistrict = normalizeServiceValue(districtOption);

      if (normalizedDistrict && !districtsByKey.has(normalizedDistrict)) {
        districtsByKey.set(normalizedDistrict, districtOption);
      }
    });

    return Array.from(districtsByKey.values()).sort((firstDistrict, secondDistrict) =>
      firstDistrict.localeCompare(secondDistrict, "tr"),
    );
  }, [filterOptions.districts]);
  const [activeStep, setActiveStep] = useState<EmergencyStep>("service");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const selectedService = emergencyServices.find((service) => service.id === selectedServiceId);
  const selectedServiceLabel = selectedService ? getEmergencyServiceLabel(selectedService) : "";
  const [district, setDistrict] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [highlightedDistrictIndex, setHighlightedDistrictIndex] = useState(0);
  const [offeredPrice, setOfferedPrice] = useState<number | null>(null);
  const [priceInputValue, setPriceInputValue] = useState("");
  const [paymentPreference, setPaymentPreference] =
    useState<ServiceRequestPaymentPreference | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] =
    useState<ServiceRequestSubmitResult | null>(null);
  const priceOptions = getEmergencyPriceOptions(selectedServiceLabel);
  const priceRange = getEmergencyPriceRange(selectedServiceLabel);
  const priceValidation = validateEmergencyPrice(priceInputValue, selectedServiceLabel);
  const priceError = priceInputValue.trim() && !priceValidation.ok ? priceValidation.message : null;
  const isReadyToSubmit = Boolean(
    selectedServiceLabel &&
      district &&
      typeof offeredPrice === "number" &&
      Number.isFinite(offeredPrice) &&
      paymentPreference,
  );
  const filteredDistrictOptions = useMemo(() => {
    const normalizedSearch = normalizeServiceValue(districtSearch);

    if (!normalizedSearch) {
      return districtOptions;
    }

    return districtOptions.filter((districtOption) =>
      normalizeServiceValue(districtOption).includes(normalizedSearch),
    );
  }, [districtOptions, districtSearch]);
  const requestHref =
    isReadyToSubmit && typeof offeredPrice === "number" && paymentPreference
      ? buildRequestHref({
          district,
          offerAmount: offeredPrice,
          paymentPreference,
          serviceLabel: selectedServiceLabel,
        })
      : appRoutes.request;

  useEffect(() => {
    setHighlightedDistrictIndex(0);
  }, [districtSearch, filteredDistrictOptions.length]);

  function goToStep(step: EmergencyStep) {
    setSubmitError(null);

    if (step === "district") {
      setDistrictSearch("");
    }

    setActiveStep(step);
  }

  function handleServiceSelect(service: Service) {
    setSelectedServiceId(service.id);
    setDistrict("");
    setDistrictSearch("");
    setOfferedPrice(null);
    setPriceInputValue("");
    setPaymentPreference("");
    setSubmitError(null);
    setActiveStep("district");
  }

  function handleDistrictSearchChange(value: string) {
    setDistrictSearch(value);

    if (district) {
      setDistrict("");
      setOfferedPrice(null);
      setPriceInputValue("");
      setPaymentPreference("");
    }
  }

  function handleDistrictSelect(nextDistrict: string) {
    setDistrict(nextDistrict);
    setDistrictSearch(nextDistrict);
    setOfferedPrice(null);
    setPriceInputValue("");
    setPaymentPreference("");
    setSubmitError(null);
    setActiveStep("price");
  }

  function handleDistrictKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedDistrictIndex((currentIndex) =>
        Math.min(currentIndex + 1, Math.max(filteredDistrictOptions.length - 1, 0)),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedDistrictIndex((currentIndex) => Math.max(currentIndex - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      const highlightedDistrict = filteredDistrictOptions[highlightedDistrictIndex];

      if (highlightedDistrict) {
        event.preventDefault();
        handleDistrictSelect(highlightedDistrict);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setDistrictSearch("");
    }
  }

  function handlePriceSelect(nextPrice: number) {
    setOfferedPrice(nextPrice);
    setPriceInputValue(String(nextPrice));
    setPaymentPreference("");
    setSubmitError(null);
    setActiveStep("payment");
  }

  function handlePriceInputChange(value: string) {
    const validation = validateEmergencyPrice(value, selectedServiceLabel);

    setPriceInputValue(value);
    setOfferedPrice(validation.ok ? validation.price : null);
    setPaymentPreference("");
    setSubmitError(null);
  }

  function handleManualPriceContinue() {
    const validation = validateEmergencyPrice(priceInputValue, selectedServiceLabel);

    if (!validation.ok || typeof validation.price !== "number") {
      setSubmitError(validation.message ?? "Geçerli bir teklif tutarı gir.");
      return;
    }

    setOfferedPrice(validation.price);
    setPriceInputValue(String(validation.price));
    setPaymentPreference("");
    setSubmitError(null);
    setActiveStep("payment");
  }

  function handlePaymentSelect(nextPaymentPreference: ServiceRequestPaymentPreference) {
    setPaymentPreference(nextPaymentPreference);
    setSubmitError(null);
    setActiveStep("submit");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmittedRequest(null);

    if (!selectedServiceLabel) {
      setSubmitError("Hizmet seçerek devam et.");
      setActiveStep("service");
      return;
    }

    if (!district) {
      setSubmitError("İlçe seçerek devam et.");
      setActiveStep("district");
      return;
    }

    if (
      typeof offeredPrice !== "number" ||
      !Number.isFinite(offeredPrice) ||
      !validateEmergencyPrice(offeredPrice, selectedServiceLabel).ok
    ) {
      setSubmitError(priceError ?? "Geçerli bir teklif tutarı seç veya yaz.");
      setActiveStep("price");
      return;
    }

    if (!paymentPreference) {
      setSubmitError("Ödeme tercihi seçerek devam et.");
      setActiveStep("payment");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createEmergencyRequestAction(
        {
          approximateLocation: district,
          budgetTag: "acil-hizmet",
          district,
          fullAddress: district,
          fullName: "",
          offerAmount: String(offeredPrice),
          offeredPrice,
          paymentPreference,
          phoneNumber: "",
          preferredDate: "",
          preferredTimeRange: "",
          serviceCategory: selectedServiceLabel,
          shortDescription: `Acil ${selectedServiceLabel} talebi`,
          urgencyLevel: "Acil",
          urgencyType: "emergency",
        },
      );

      if (!response.ok) {
        setSubmitError(response.message);
        return;
      }

      const result = response.data;
      setSubmittedRequest(result);
      const params = new URLSearchParams({ created: "1" });

      if (result.requestId) {
        params.set("requestId", result.requestId);
      }

      router.push(`${appRoutes.accountRequests}?${params.toString()}`);
    } catch (error) {
      setSubmitError(
        getPublicErrorMessage(
          error,
          "Acil çağrı şu anda başlatılamadı. Seçimlerin korunarak devam edebilirsin.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const completedStepPills = [
    selectedServiceLabel
      ? {
          label: "Hizmet",
          onClick: () => goToStep("service"),
          value: selectedServiceLabel,
        }
      : null,
    district
      ? {
          label: "İlçe",
          onClick: () => goToStep("district"),
          value: district,
        }
      : null,
    typeof offeredPrice === "number"
      ? {
          label: "Teklif",
          onClick: () => goToStep("price"),
          value: formatPrice(offeredPrice),
        }
      : null,
    paymentPreference
      ? {
          label: "Ödeme",
          onClick: () => goToStep("payment"),
          value: getPaymentPreferenceLabel(paymentPreference),
        }
      : null,
  ].filter(
    (item): item is { label: string; onClick: () => void; value: string } => Boolean(item),
  );

  if (submittedRequest) {
    return (
      <div className="mt-6 w-full overflow-hidden rounded-xl bg-white p-5 shadow-[0_24px_70px_rgba(13,20,36,0.08)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6 lg:mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-md bg-[var(--trust-green-soft)] px-3 py-1.5 text-xs font-bold text-[var(--trust-green)]">
              <CheckCircle2 className="size-4" aria-hidden />
              Acil talep iletildi
            </span>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-[var(--brand-navy)]">
              Acil talebiniz uygun ustalara iletildi.
            </h2>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--muted)]">
              Henüz usta ataması yapılmadı. İlk uygun usta kabul ettiğinde varış ve güvenli başlangıç durumu aynı akışta görünür.
            </p>
          </div>
          <span className="w-fit rounded-md bg-[#F9FAFB] px-3 py-2 text-xs font-bold text-[var(--brand-navy)] ring-1 ring-[rgba(13,20,36,0.08)]">
            {submittedRequest.requestCode}
          </span>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Tahmini varış", submittedRequest.estimatedArrivalText ?? "Usta kabul edince netleşir"],
            [
              "Bilgilendirilen usta",
              formatProviderNotificationCount(submittedRequest.providerCountNotified),
            ],
            ["Teklif", formatPrice(submittedRequest.offeredPrice ?? offeredPrice)],
            ["Ödeme", getPaymentPreferenceLabel(submittedRequest.paymentPreference ?? paymentPreference)],
            [
              "Doğrulama durumu",
              submittedRequest.confirmationCode ? "Kod üretildi" : "Usta kabul edince paylaşılacak",
            ],
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
      className="mt-6 w-full max-w-[calc(100vw-2rem)] min-w-0 rounded-xl bg-white p-4 shadow-[0_24px_70px_rgba(13,20,36,0.08)] ring-1 ring-[rgba(13,20,36,0.08)] sm:max-w-full sm:p-5 lg:mt-8"
      onSubmit={handleSubmit}
    >
      <div className="border-b border-[rgba(13,20,36,0.08)] pb-4">
        <h2 className="text-wrap-anywhere break-words text-xl font-semibold leading-tight text-[var(--brand-navy)]">
          Acil usta çağır
        </h2>
        <p className="mt-2 max-w-2xl text-sm font-normal leading-6 text-[var(--muted)]">
          Hizmetini, ilçeni ve teklifini seç. Uygun ustalara hemen iletelim.
        </p>
      </div>

      {completedStepPills.length > 0 ? (
        <div
          aria-label="Tamamlanan acil eşleşme adımları"
          className="mt-4 flex flex-wrap gap-2"
        >
          {completedStepPills.map((pill) => (
            <SummaryPill
              key={pill.label}
              label={pill.label}
              onClick={pill.onClick}
              value={pill.value}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-4">
        {activeStep === "service" ? (
          <StepShell
            description="Acil destek almak istediğin hizmeti seç."
            icon={<Zap className="size-4" aria-hidden />}
            stepNumber={1}
            title="Hizmet seç"
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {emergencyServices.map((service) => {
                const serviceLabel = getEmergencyServiceLabel(service);
                const isSelected = service.id === selectedServiceId;

                return (
                  <button
                    aria-pressed={isSelected}
                    className={cn(
                      "group flex min-h-20 min-w-0 flex-col items-start justify-between rounded-lg border bg-white p-3 text-left transition-all sm:min-h-24",
                      isSelected
                        ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[0_12px_30px_rgba(255,138,0,0.16)]"
                        : "border-[rgba(13,20,36,0.08)] hover:border-[rgba(255,138,0,0.5)] hover:bg-[#fffaf3]",
                    )}
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    type="button"
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-md transition-colors",
                        isSelected
                          ? "bg-[var(--brand-orange)] text-white"
                          : "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] group-hover:bg-[var(--brand-orange)] group-hover:text-white",
                      )}
                    >
                      <ServiceIcon className="size-5" name={service.iconName} />
                    </span>
                    <span className="mt-3 min-w-0 text-sm font-semibold leading-5 text-[var(--brand-navy)]">
                      {serviceLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </StepShell>
        ) : null}

        {activeStep === "district" ? (
          <StepShell
            description="İstanbul içindeki ilçeni yaz, uygun seçenekleri hemen filtreleyelim."
            icon={<MapPin className="size-4" aria-hidden />}
            stepNumber={2}
            title="İlçe seç"
          >
            <div className="rounded-lg bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
              <label className="relative block">
                <span className="sr-only">İlçe ara</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
                  aria-hidden
                />
                <input
                  aria-activedescendant={
                    filteredDistrictOptions[highlightedDistrictIndex]
                      ? `emergency-district-${highlightedDistrictIndex}`
                      : undefined
                  }
                  aria-autocomplete="list"
                  aria-controls="emergency-district-list"
                  aria-expanded="true"
                  className="h-12 w-full rounded-md border border-[rgba(13,20,36,0.1)] bg-white pl-10 pr-3 text-base font-semibold text-[var(--brand-navy)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]"
                  onChange={(event) => handleDistrictSearchChange(event.target.value)}
                  onKeyDown={handleDistrictKeyDown}
                  placeholder="Kadıköy, Kağıthane, Kartal..."
                  role="combobox"
                  type="text"
                  value={districtSearch}
                />
              </label>

              <div
                className="mt-3 max-h-60 overflow-y-auto rounded-md border border-[rgba(13,20,36,0.08)] bg-[#F9FAFB] p-1"
                id="emergency-district-list"
                role="listbox"
              >
                {filteredDistrictOptions.length > 0 ? (
                  filteredDistrictOptions.map((districtOption, index) => {
                    const isHighlighted = index === highlightedDistrictIndex;
                    const isSelected = districtOption === district;

                    return (
                      <button
                        aria-selected={isSelected}
                        className={cn(
                          "flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors",
                          isSelected || isHighlighted
                            ? "bg-[var(--brand-orange-soft)] text-[var(--brand-navy)]"
                            : "text-[var(--muted)] hover:bg-white hover:text-[var(--brand-navy)]",
                        )}
                        id={`emergency-district-${index}`}
                        key={districtOption}
                        onClick={() => handleDistrictSelect(districtOption)}
                        onMouseEnter={() => setHighlightedDistrictIndex(index)}
                        role="option"
                        type="button"
                      >
                        <span className="min-w-0 truncate">{districtOption}</span>
                        {isSelected ? (
                          <Check className="size-4 shrink-0 text-[var(--brand-orange-dark)]" aria-hidden />
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-4 text-sm font-semibold text-[var(--muted)]">
                    Bu aramayla eşleşen İstanbul ilçesi bulunamadı.
                  </p>
                )}
              </div>
            </div>
          </StepShell>
        ) : null}

        {activeStep === "price" ? (
          <StepShell
            description="Önerilen tutarlardan seçebilir veya farklı teklif tutarı girebilirsin."
            icon={<WalletCards className="size-4" aria-hidden />}
            stepNumber={3}
            title="Teklif tutarı seç/yaz"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)]">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-[var(--muted)]">
                  Önerilen teklifler
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                  {priceOptions.map((option) => {
                    const isSelected = option.value === offeredPrice;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={cn(
                          "min-h-12 rounded-md border px-3 text-sm font-semibold transition-all",
                          isSelected
                            ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] text-[var(--brand-navy)] shadow-[0_10px_24px_rgba(255,138,0,0.12)]"
                            : "border-[rgba(13,20,36,0.08)] bg-white text-[var(--muted)] hover:border-[var(--brand-orange)] hover:text-[var(--brand-navy)]",
                        )}
                        key={option.value}
                        onClick={() => handlePriceSelect(option.value)}
                        type="button"
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm font-normal leading-6 text-[var(--muted)]">
                  {selectedServiceLabel} için hızlı başlangıç tutarları.
                </p>
              </div>

              <div className="min-w-0 rounded-lg border border-[rgba(13,20,36,0.08)] bg-white p-3">
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--brand-navy)]">
                    Farklı tutar gir
                  </span>
                  <span className="relative mt-2 block">
                    <input
                      aria-describedby="emergency-price-help"
                      aria-invalid={Boolean(priceError)}
                      className={cn(
                        "h-12 w-full rounded-md border bg-white px-3 pr-10 text-base font-semibold text-[var(--brand-navy)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]",
                        priceError
                          ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                          : "border-[rgba(13,20,36,0.1)]",
                      )}
                      inputMode="numeric"
                      onChange={(event) => handlePriceInputChange(event.target.value)}
                      placeholder="Teklif tutarı"
                      type="text"
                      value={priceInputValue}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--muted)]">
                      TL
                    </span>
                  </span>
                </label>
                <p
                  className={cn(
                    "mt-2 text-xs font-medium leading-5",
                    priceError ? "text-red-700" : "text-[var(--muted)]",
                  )}
                  id="emergency-price-help"
                >
                  {priceError ??
                    `${formatPrice(priceRange.minimumPrice)} - ${formatPrice(priceRange.maximumPrice)} aralığında teklif ver.`}
                </p>
                <button
                  className={cn(
                    "mt-3 h-11 w-full rounded-md px-4 text-sm font-semibold transition-all",
                    offeredPrice && !priceError
                      ? "bg-[var(--brand-orange)] text-white shadow-[0_12px_24px_rgba(255,138,0,0.22)] hover:bg-[var(--brand-orange-dark)]"
                      : "bg-[#F3F4F6] text-[var(--muted)]",
                  )}
                  disabled={!offeredPrice || Boolean(priceError)}
                  onClick={handleManualPriceContinue}
                  type="button"
                >
                  Ödeme tercihine geç
                </button>
              </div>
            </div>
          </StepShell>
        ) : null}

        {activeStep === "payment" ? (
          <StepShell
            description="Ustaya nasıl ödeme yapmak istediğini seç."
            icon={<WalletCards className="size-4" aria-hidden />}
            stepNumber={4}
            title="Ödeme tercihi"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {paymentOptions.map((option) => {
                const isSelected = option.value === paymentPreference;

                return (
                  <button
                    aria-pressed={isSelected}
                    className={cn(
                      "rounded-md border px-4 py-3 text-left transition-all",
                      isSelected
                        ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[0_10px_24px_rgba(255,138,0,0.12)]"
                        : "border-[rgba(13,20,36,0.08)] bg-white hover:border-[var(--brand-orange)]",
                    )}
                    key={option.value}
                    onClick={() => handlePaymentSelect(option.value)}
                    type="button"
                  >
                    <span className="block text-base font-semibold text-[var(--brand-navy)]">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-sm font-medium leading-5 text-[var(--muted)]">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </StepShell>
        ) : null}

        {activeStep === "submit" && paymentPreference ? (
          <section className="rounded-lg border border-[rgba(255,138,0,0.34)] bg-[#fffdf9] p-4 shadow-[0_18px_48px_rgba(13,20,36,0.07)] ring-2 ring-[rgba(255,138,0,0.16)] sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-[var(--brand-orange-dark)]">
                  Çağrı hazır
                </p>
                <h3 className="mt-1 text-2xl font-semibold leading-tight text-[var(--brand-navy)]">
                  Acil Usta Çağır
                </h3>
                <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted)]">
                  {selectedServiceLabel} · {district} · {formatPrice(offeredPrice)} ·{" "}
                  {getPaymentPreferenceLabel(paymentPreference)}
                </p>
                {paymentPreference === PAYMENT_PREFERENCES.iban ? (
                  <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-semibold leading-6 text-[var(--brand-navy)] ring-1 ring-[rgba(13,20,36,0.08)]">
                    IBAN bilgisi usta kabulünden sonra paylaşılır.
                  </p>
                ) : null}
              </div>
              <Button
                className="h-12 min-h-12 w-full px-7 text-base shadow-[0_16px_34px_rgba(255,138,0,0.28)] lg:w-fit"
                disabled={isSubmitting || !isReadyToSubmit}
                type="submit"
              >
                {isSubmitting ? "Çağrı açılıyor..." : "Acil Usta Çağır"}
              </Button>
            </div>
            <div className="mt-4 flex min-w-0 items-start gap-3 rounded-lg bg-white p-3 ring-1 ring-[rgba(13,20,36,0.06)]">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--trust-green)]" aria-hidden />
              <p className="text-sm font-medium leading-6 text-[var(--muted)]">
                Usta kabul edince geçici doğrulama üretilir. Nakit veya IBAN tercihin kayıt altında kalır.
              </p>
            </div>
          </section>
        ) : null}
      </div>

      {submitError ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {submitError}{" "}
          <a className="font-bold underline underline-offset-2" href={requestHref}>
            Güvenli akışla devam et
          </a>
        </p>
      ) : null}
    </form>
  );
}
