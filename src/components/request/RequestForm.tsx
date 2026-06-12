"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createEmergencyRequestAction,
  createServiceRequestAction,
} from "@/app/request/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { appRoutes } from "@/lib/constants/navigation";
import { providerBudgetOptions, providerDistricts } from "@/lib/constants/providers";
import { normalizeServiceValue, services } from "@/lib/constants/services";
import { getPublicErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { validateServiceRequestInput } from "@/lib/validations";
import { trackRequestCreated } from "@/services/analytics";
import {
  calculateSuggestedPrice,
  getEmergencyPriceOptions,
  getEmergencyPriceRange,
  getBudgetTagLabel,
  normalizeBudgetTag,
} from "@/services/matching";
import { mapTimePreferenceToRequestIntent } from "@/services/matching/time";
import {
  EMERGENCY_PAYMENT_PREFERENCES,
  PAYMENT_PREFERENCES,
  getPaymentPreferenceLabel,
  ibanAfterProviderAcceptsText,
  normalizePaymentPreference,
  type ServiceRequestPaymentPreference,
} from "@/services/payments";
import type { ServiceRequestSubmitResult } from "@/services/requests";
import { liveTrackingSoonText } from "@/services/tracking";

type UrgencyLevel = "Esnek" | "Bu hafta" | "Acil";

type RequestFormState = {
  approximateLocation: string;
  budgetTag: string;
  serviceCategory: string;
  district: string;
  fullAddress: string;
  offerAmount: string;
  paymentPreference: string;
  urgencyLevel: UrgencyLevel | "";
  urgencyType: "standard" | "emergency";
  preferredDate: string;
  preferredTimeRange: string;
  fullName: string;
  phoneNumber: string;
  shortDescription: string;
};

type RequestField = keyof RequestFormState;
type RequestFormErrors = Partial<Record<RequestField, string>>;
type SubmittedRequest = ServiceRequestSubmitResult;

type RequestFormProps = {
  authenticatedUserId: string;
  initialApproximateLocation?: string;
  initialBudgetTag?: string;
  initialDistrict?: string;
  initialNotes?: string;
  initialOfferAmount?: string;
  initialPaymentPreference?: string;
  initialProfileFullName?: string | null;
  initialProfilePhone?: string | null;
  initialService?: string;
  initialTimePreference?: string;
};

type RequestInitialFormProps = Pick<
  RequestFormProps,
  | "initialApproximateLocation"
  | "initialBudgetTag"
  | "initialDistrict"
  | "initialNotes"
  | "initialOfferAmount"
  | "initialPaymentPreference"
  | "initialProfileFullName"
  | "initialProfilePhone"
  | "initialService"
  | "initialTimePreference"
>;

const initialFormState: RequestFormState = {
  approximateLocation: "",
  budgetTag: "",
  serviceCategory: "",
  district: "",
  fullAddress: "",
  offerAmount: "",
  paymentPreference: "",
  urgencyLevel: "",
  urgencyType: "standard",
  preferredDate: "",
  preferredTimeRange: "",
  fullName: "",
  phoneNumber: "",
  shortDescription: "",
};

const urgencyOptions: Array<{
  value: UrgencyLevel;
  description: string;
}> = [
  {
    value: "Esnek",
    description: "Zamanın uygunsa fiyat ve profil karşılaştırması için ideal.",
  },
  {
    value: "Bu hafta",
    description: "Birkaç gün içinde dönüş almak istiyorsan seç.",
  },
  {
    value: "Acil",
    description: "Bugün veya en kısa sürede destek istiyorsan seç.",
  },
];

const timeRangeOptions = [
  "Sabah (08:00 - 12:00)",
  "Öğle (12:00 - 15:00)",
  "Öğleden sonra (15:00 - 18:00)",
  "Akşam (18:00 - 21:00)",
];

const emergencyPaymentOptions: Array<{
  description: string;
  label: string;
  value: ServiceRequestPaymentPreference;
}> = [
  {
    description: "Usta geldiğinde nakit ödeme niyeti.",
    label: "Nakit",
    value: PAYMENT_PREFERENCES.cash,
  },
  {
    description: ibanAfterProviderAcceptsText,
    label: "IBAN",
    value: PAYMENT_PREFERENCES.iban,
  },
];

const standardBudgetOptions = providerBudgetOptions.filter(
  (option) => option.value !== "acil-hizmet",
);

const standardPaymentOptions: Array<{
  description: string;
  label: string;
  value: ServiceRequestPaymentPreference;
}> = [
  {
    description: "Usta geldiğinde nakit ödeme yapmak istiyorum.",
    label: "Nakit",
    value: PAYMENT_PREFERENCES.cash,
  },
  {
    description: ibanAfterProviderAcceptsText,
    label: "IBAN",
    value: PAYMENT_PREFERENCES.iban,
  },
  {
    description: "Online ödeme açıldığında bilgilendirilmek istiyorum.",
    label: "Online ödeme",
    value: PAYMENT_PREFERENCES.onlineSoon,
  },
];

const emergencyLocationOptions = ["Ev", "İş yeri", "Site / apartman", "Kapı önü"];

const fieldBaseClassName =
  "mt-2 w-full min-w-0 rounded-md border border-[var(--border)] bg-white px-3.5 py-3 text-sm text-[var(--brand-navy)] outline-none transition-colors focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]";

const fieldClassName = `${fieldBaseClassName} cursor-text select-text placeholder:text-[var(--muted)]`;
const selectFieldClassName = `${fieldBaseClassName} min-h-12 cursor-pointer select-none pr-10`;

const labelClassName = "block cursor-default select-none text-sm font-bold text-[var(--brand-navy)]";
const helperClassName = "mt-1.5 cursor-default select-none text-xs leading-5 text-[var(--muted)]";
const errorClassName = "mt-2 cursor-default select-none text-sm font-bold text-red-600";
const sectionClassName = "cursor-default space-y-5 border-t border-[var(--border)] pt-6";
const serviceRequestSuccessMessage = "Talebiniz başarıyla oluşturuldu";
const serviceRequestSubmitErrorMessage =
  "Talep oluşturulamadı. Lütfen tekrar deneyin.";

function parsePriceValue(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalizedValue = value?.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "") ?? "";
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatPrice(value: number | string | null | undefined) {
  const price = parsePriceValue(value);

  if (typeof price !== "number" || price <= 0) {
    return "Seçim bekleniyor";
  }

  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(price)} TL`;
}

function formatProviderNotificationCount(value: number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value} usta`;
  }

  return "Sayım alınamadı";
}

function formatPreferredDateFromOffset(offsetDays: number | null) {
  if (typeof offsetDays !== "number") {
    return "";
  }

  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayDateInput() {
  return formatPreferredDateFromOffset(0);
}

function createEmergencySummary(values: RequestFormState) {
  return `Acil ${values.serviceCategory || "hizmet"} talebi`;
}

function normalizeForm(values: RequestFormState): RequestFormState {
  const isEmergencyRequest =
    values.urgencyType === "emergency" || values.budgetTag === "acil-hizmet";
  const district = values.district.trim();
  const approximateLocation = values.approximateLocation.trim();
  const emergencyAddress = [district, approximateLocation].filter(Boolean).join(" - ");

  return {
    approximateLocation,
    budgetTag: isEmergencyRequest ? "acil-hizmet" : values.budgetTag.trim(),
    serviceCategory: values.serviceCategory.trim(),
    district,
    fullAddress: isEmergencyRequest
      ? values.fullAddress.trim() || emergencyAddress || "Acil hizmet konumu"
      : values.fullAddress.trim(),
    offerAmount: values.offerAmount.trim(),
    paymentPreference: values.paymentPreference,
    urgencyLevel: isEmergencyRequest ? "Acil" : values.urgencyLevel,
    urgencyType: isEmergencyRequest ? "emergency" : "standard",
    preferredDate: isEmergencyRequest
      ? values.preferredDate.trim() || getTodayDateInput()
      : values.preferredDate.trim(),
    preferredTimeRange: isEmergencyRequest
      ? "En kısa süre"
      : values.preferredTimeRange.trim(),
    fullName: values.fullName.trim(),
    phoneNumber: values.phoneNumber.trim(),
    shortDescription: isEmergencyRequest
      ? values.shortDescription.trim() || createEmergencySummary(values)
      : values.shortDescription.trim(),
  };
}

function createInitialFormState({
  initialApproximateLocation = "",
  initialBudgetTag = "",
  initialDistrict = "",
  initialNotes = "",
  initialOfferAmount = "",
  initialPaymentPreference = "",
  initialProfileFullName = "",
  initialProfilePhone = "",
  initialService = "",
  initialTimePreference = "",
}: RequestInitialFormProps): RequestFormState {
  const trimmedInitialService = initialService.trim();
  const normalizedInitialService = normalizeServiceValue(trimmedInitialService);
  const matchedService = services.find((service) =>
    [
      service.title,
      `${service.category} - ${service.title}`,
      service.href.replace("/providers?category=", ""),
    ]
      .map(normalizeServiceValue)
      .includes(normalizedInitialService),
  );
  const normalizedBudgetTag = normalizeBudgetTag(initialBudgetTag);
  const isEmergencyFlow = normalizedBudgetTag === "acil-hizmet";
  const serviceCategory = matchedService
    ? `${matchedService.category} - ${matchedService.title}`
    : trimmedInitialService.includes(" - ")
      ? trimmedInitialService
      : "";
  const district = initialDistrict.trim();
  const budgetLabel = getBudgetTagLabel(normalizedBudgetTag);
  const timeIntent = mapTimePreferenceToRequestIntent(initialTimePreference);
  const normalizedNotes = normalizeServiceValue(initialNotes);
  const shouldAppendBudgetNote =
    !isEmergencyFlow && budgetLabel && !normalizedNotes.includes("butce tercihi");
  const shouldAppendTimeNote =
    !isEmergencyFlow && timeIntent.requestNote && !normalizedNotes.includes("zaman tercihi");
  const shortDescription = isEmergencyFlow
    ? ""
    : [
        initialNotes.trim(),
        shouldAppendBudgetNote ? `Bütçe tercihi: ${budgetLabel}` : "",
        shouldAppendTimeNote ? timeIntent.requestNote : "",
      ]
        .filter(Boolean)
        .join("\n");
  const suggestedEmergencyPrice = isEmergencyFlow
    ? calculateSuggestedPrice({
        budgetTag: "acil-hizmet",
        district,
        service: serviceCategory,
      })
    : 0;
  const normalizedPaymentPreference = normalizePaymentPreference(initialPaymentPreference);
  const canPrefillPaymentPreference = Boolean(
    normalizedPaymentPreference &&
    (!isEmergencyFlow ||
      (EMERGENCY_PAYMENT_PREFERENCES as readonly string[]).includes(normalizedPaymentPreference)),
  );

  return {
    ...initialFormState,
    approximateLocation: initialApproximateLocation.trim(),
    budgetTag: normalizedBudgetTag ?? "",
    serviceCategory,
    district,
    fullName: initialProfileFullName?.trim() ?? "",
    phoneNumber: initialProfilePhone?.trim() ?? "",
    offerAmount: initialOfferAmount.trim() || (suggestedEmergencyPrice ? String(suggestedEmergencyPrice) : ""),
    paymentPreference: canPrefillPaymentPreference ? normalizedPaymentPreference ?? "" : "",
    preferredDate:
      formatPreferredDateFromOffset(timeIntent.preferredDateOffsetDays) ||
      (isEmergencyFlow ? getTodayDateInput() : ""),
    preferredTimeRange: isEmergencyFlow ? "En kısa süre" : "",
    urgencyLevel:
      timeIntent.urgencyLevel ||
      (normalizedBudgetTag === "acil-hizmet" ? "Acil" : ""),
    urgencyType: isEmergencyFlow ? "emergency" : "standard",
    shortDescription,
  };
}

function validateForm(values: RequestFormState) {
  const validationResult = validateServiceRequestInput(values);

  return validationResult.ok ? {} : validationResult.fieldErrors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className={errorClassName} id={id} role="alert">
      {message}
    </p>
  );
}

function EmergencyStepLabel({ children, step }: { children: string; step: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase text-[var(--brand-orange-dark)]">
      <span className="flex size-6 items-center justify-center rounded-md bg-[var(--brand-orange)] text-white">
        {step}
      </span>
      {children}
    </span>
  );
}

export function RequestForm({
  authenticatedUserId,
  initialApproximateLocation,
  initialBudgetTag,
  initialDistrict,
  initialNotes,
  initialOfferAmount,
  initialPaymentPreference,
  initialProfileFullName,
  initialProfilePhone,
  initialService,
  initialTimePreference,
}: RequestFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<RequestFormState>(() =>
    createInitialFormState({
      initialApproximateLocation,
      initialBudgetTag,
      initialDistrict,
      initialNotes,
      initialOfferAmount,
      initialPaymentPreference,
      initialProfileFullName,
      initialProfilePhone,
      initialService,
      initialTimePreference,
    }),
  );
  const [errors, setErrors] = useState<RequestFormErrors>({});
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedRequest | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const isEmergencyFlow = formState.urgencyType === "emergency";
  const suggestedEmergencyPrice = useMemo(
    () =>
      isEmergencyFlow
        ? calculateSuggestedPrice({
            budgetTag: "acil-hizmet",
            district: formState.district,
            service: formState.serviceCategory,
          })
        : 0,
    [formState.district, formState.serviceCategory, isEmergencyFlow],
  );
  const emergencyPriceRange = useMemo(
    () => getEmergencyPriceRange(formState.serviceCategory),
    [formState.serviceCategory],
  );
  const emergencyPriceOptions = useMemo(
    () => getEmergencyPriceOptions(formState.serviceCategory),
    [formState.serviceCategory],
  );
  const hasSmartMatchPrefill = Boolean(
    initialApproximateLocation?.trim() ||
      initialBudgetTag?.trim() ||
      initialDistrict?.trim() ||
      initialNotes?.trim() ||
      initialOfferAmount?.trim() ||
      initialPaymentPreference?.trim() ||
      initialService?.trim() ||
      initialTimePreference?.trim(),
  );

  useEffect(() => {
    if (isEmergencyFlow && suggestedEmergencyPrice > 0 && !formState.offerAmount) {
      setFormState((currentState) => ({
        ...currentState,
        offerAmount: String(suggestedEmergencyPrice),
      }));
    }
  }, [formState.offerAmount, isEmergencyFlow, suggestedEmergencyPrice]);

  function updateField(field: keyof RequestFormState, value: string) {
    setFormState((currentState) => {
      const nextState = {
        ...currentState,
        [field]: value,
      };

      if (
        currentState.urgencyType === "emergency" &&
        (field === "serviceCategory" || field === "district")
      ) {
        const nextSuggestedPrice = calculateSuggestedPrice({
          budgetTag: "acil-hizmet",
          district: nextState.district,
          service: nextState.serviceCategory,
        });

        if (nextSuggestedPrice > 0) {
          nextState.offerAmount = String(nextSuggestedPrice);
        }
      }

      return nextState;
    });
    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setSubmittedRequest(null);
    setSubmitError(null);
  }

  function handleUseApproximateLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Tarayıcı yaklaşık konum paylaşımını desteklemiyor.");
      return;
    }

    setLocationStatus("Konum izni bekleniyor.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(3);
        const longitude = position.coords.longitude.toFixed(3);
        updateField("approximateLocation", `${latitude}, ${longitude}`);
        setLocationStatus("Yaklaşık konum eklendi.");
      },
      () => {
        setLocationStatus("Konum izni verilmedi. İlçe seçimiyle devam edebilirsin.");
      },
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 8000,
      },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedRequest = normalizeForm(formState);
    const validationErrors = validateForm(normalizedRequest);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmittedRequest(null);
      setSubmitError(null);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const response = isEmergencyFlow
        ? await createEmergencyRequestAction(normalizedRequest)
        : await createServiceRequestAction(normalizedRequest);
      if (!response.ok) {
        setSubmitError(response.message);
        return;
      }

      const result = response.data;
      trackRequestCreated({
        category: normalizedRequest.serviceCategory,
        district: normalizedRequest.district,
        requestCode: result.requestCode,
        urgencyLevel: normalizedRequest.urgencyLevel,
      });
      const params = new URLSearchParams({ created: "1" });

      if (result.requestId) {
        params.set("requestId", result.requestId);
      }

      router.push(`${appRoutes.dashboardRequests}?${params.toString()}`);
      return;
    } catch (error) {
      setSubmittedRequest(null);
      setSubmitError(getPublicErrorMessage(error, serviceRequestSubmitErrorMessage));
    } finally {
      setIsSubmitting(false);
    }
  }

  function getFieldClassName(field: RequestField) {
    return cn(
      fieldClassName,
      errors[field] && "border-red-500 focus:border-red-500 focus:ring-red-100",
    );
  }

  function getSelectFieldClassName(field: RequestField) {
    return cn(
      selectFieldClassName,
      errors[field] && "border-red-500 focus:border-red-500 focus:ring-red-100",
    );
  }

  return (
    <Card className="min-w-0">
      <form className="space-y-6" noValidate onSubmit={handleSubmit}>
        <div className="cursor-default select-none border-b border-[var(--border)] pb-5">
          <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
            {isEmergencyFlow ? "Acil hizmet" : "Talep özeti"}
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
            {isEmergencyFlow
              ? "Hızlı seçimle acil usta çağır."
              : "Bilgilerini gönder, uygun ustaya hazır ol."}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {isEmergencyFlow
              ? "Hizmet, ilçe, fiyat ve ödeme tercihini tek ekranda seç."
              : "Hizmet, konum, zamanlama ve notları tek yerde netleştir."}
          </p>
          <p className="mt-3 rounded-md border border-[rgba(255,138,0,0.24)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
            Bu form şifre toplamaz. Talep bilgilerin giriş yapan hesabınla güvenli şekilde
            kaydedilir.
          </p>
          {hasSmartMatchPrefill ? (
            <p className="mt-3 rounded-md border border-[rgba(13,20,36,0.08)] bg-white px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
              Hızlı Eşleşme seçimlerin forma eklendi.
            </p>
          ) : null}
        </div>

        {submittedRequest ? (
          <div
            aria-live="polite"
            className="cursor-default select-none overflow-hidden rounded-lg border border-[rgba(255,138,0,0.28)] bg-[#fffdf9] text-[var(--brand-navy)] shadow-[0_18px_50px_rgba(13,20,36,0.08)]"
          >
            <div className="h-1 bg-[var(--brand-orange)]" />
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
                    {submittedRequest.urgencyType === "emergency" ? "Acil talep" : "Talep alındı"}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
                    {submittedRequest.urgencyType === "emergency"
                      ? "Acil talebiniz uygun ustalara iletildi."
                      : "Talebin alındı"}
                  </h3>
                </div>
                <div className="w-fit rounded-md bg-white px-3 py-2 text-xs font-bold text-[var(--brand-navy)] ring-1 ring-[rgba(13,20,36,0.08)]">
                  {submittedRequest.requestCode}
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                {submittedRequest.urgencyType === "emergency"
                  ? "Henüz usta ataması yapılmadı. İlk uygun usta kabul ettiğinde canlı durum bilgisi bu talep üzerinden ilerler."
                  : serviceRequestSuccessMessage}
              </p>
              <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-2">
                <div className="rounded-md bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
                  <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                    Durum
                  </dt>
                  <dd className="mt-1 text-sm font-bold">
                    {submittedRequest.urgencyType === "emergency"
                      ? "Usta kabulü bekleniyor"
                      : "Eşleşme bekliyor"}
                  </dd>
                </div>
                <div className="rounded-md bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
                  <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                    Teklif
                  </dt>
                  <dd className="mt-1 text-sm font-bold">
                    {submittedRequest.offeredPrice
                      ? formatPrice(submittedRequest.offeredPrice)
                      : "Kaydedildi"}
                  </dd>
                </div>
                {submittedRequest.urgencyType === "emergency" ? (
                  <>
                    <div className="rounded-md bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
                      <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                        Tahmini varış
                      </dt>
                      <dd className="mt-1 text-sm font-bold">
                        {submittedRequest.estimatedArrivalText ?? liveTrackingSoonText}
                      </dd>
                    </div>
                    <div className="rounded-md bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
                      <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                        Bilgilendirilen usta
                      </dt>
                      <dd className="mt-1 text-sm font-bold">
                        {formatProviderNotificationCount(submittedRequest.providerCountNotified)}
                      </dd>
                    </div>
                    <div className="rounded-md bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
                      <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                        Doğrulama durumu
                      </dt>
                      <dd className="mt-1 text-sm font-bold text-[var(--brand-orange-dark)]">
                        {submittedRequest.confirmationCode
                          ? "Kod üretildi"
                          : "Usta kabul edince paylaşılacak"}
                      </dd>
                    </div>
                    <div className="rounded-md bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
                      <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                        Ödeme tercihi
                      </dt>
                      <dd className="mt-1 text-sm font-bold">
                        {getPaymentPreferenceLabel(submittedRequest.paymentPreference)}
                      </dd>
                    </div>
                    {submittedRequest.paymentPreference === PAYMENT_PREFERENCES.iban ? (
                      <div className="rounded-md bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
                        <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                          IBAN
                        </dt>
                        <dd className="mt-1 text-sm font-bold">{ibanAfterProviderAcceptsText}</dd>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </dl>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button className="w-full sm:w-fit" href={appRoutes.providers}>
                  Usta Bul
                </Button>
                <Button className="w-full sm:w-fit" href={appRoutes.home} variant="secondary">
                  Ana Sayfaya Dön
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {submitError ? (
          <p
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700"
            role="alert"
          >
            {submitError}
          </p>
        ) : null}

        <fieldset className="space-y-5">
          <legend className="cursor-default select-none">
            <span className="block text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
              Adım 1
            </span>
            <span className="mt-1 block text-xl font-bold leading-tight text-[var(--brand-navy)]">
              Hizmet ve konum
            </span>
          </legend>

          <div>
            <label className={labelClassName} htmlFor="serviceCategory">
              Hizmet kategorisi
            </label>
            <select
              aria-describedby={
                errors.serviceCategory ? "serviceCategory-error" : "serviceCategory-helper"
              }
              aria-invalid={Boolean(errors.serviceCategory)}
              className={getSelectFieldClassName("serviceCategory")}
              id="serviceCategory"
              name="serviceCategory"
              onChange={(event) => updateField("serviceCategory", event.target.value)}
              required
              value={formState.serviceCategory}
            >
              <option value="">İhtiyacını belirle</option>
              {services.map((service) => (
                <option key={service.id} value={`${service.category} - ${service.title}`}>
                  {service.category} - {service.title}
                </option>
              ))}
            </select>
            <p className={helperClassName} id="serviceCategory-helper">
              Doğru usta listesini hazırlamak için en yakın hizmeti seç.
            </p>
            <FieldError id="serviceCategory-error" message={errors.serviceCategory} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="district">
                İlçe
              </label>
              {isEmergencyFlow ? (
                <select
                  aria-describedby={errors.district ? "district-error" : "district-helper"}
                  aria-invalid={Boolean(errors.district)}
                  className={getSelectFieldClassName("district")}
                  id="district"
                  name="district"
                  onChange={(event) => updateField("district", event.target.value)}
                  required
                  value={formState.district}
                >
                  <option value="">İlçe seç</option>
                  {providerDistricts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  aria-describedby={errors.district ? "district-error" : "district-helper"}
                  aria-invalid={Boolean(errors.district)}
                  autoComplete="address-level2"
                  className={getFieldClassName("district")}
                  id="district"
                  name="district"
                  onChange={(event) => updateField("district", event.target.value)}
                  placeholder="Örn. Kadıköy"
                  required
                  type="text"
                  value={formState.district}
                />
              )}
              <p className={helperClassName} id="district-helper">
                İstanbul içindeki ilçe veya semti seç.
              </p>
              <FieldError id="district-error" message={errors.district} />
            </div>

            {isEmergencyFlow ? (
              <div className="rounded-md border border-[rgba(255,138,0,0.22)] bg-[var(--brand-orange-soft)] p-4">
                <span className={labelClassName}>Konum tipi</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {emergencyLocationOptions.map((option) => {
                    const isSelected = formState.approximateLocation === option;

                    return (
                      <button
                        className={cn(
                          "min-h-11 rounded-md border px-3 text-sm font-bold transition-colors",
                          isSelected
                            ? "border-[var(--brand-orange)] bg-[var(--brand-orange)] text-white"
                            : "border-[rgba(13,20,36,0.08)] bg-white text-[var(--brand-navy)] hover:border-[var(--brand-orange)]",
                        )}
                        key={option}
                        onClick={() => updateField("approximateLocation", option)}
                        type="button"
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                <Button
                  className="mt-3 w-full"
                  onClick={handleUseApproximateLocation}
                  type="button"
                  variant="secondary"
                >
                  Konumumu Ekle
                </Button>
                {locationStatus ? (
                  <p className="mt-2 text-xs font-bold text-[var(--brand-navy)]">
                    {locationStatus}
                  </p>
                ) : null}
              </div>
            ) : (
              <div>
                <label className={labelClassName} htmlFor="fullAddress">
                  Açık adres
                </label>
                <input
                  aria-describedby={errors.fullAddress ? "fullAddress-error" : "fullAddress-helper"}
                  aria-invalid={Boolean(errors.fullAddress)}
                  autoComplete="street-address"
                  className={getFieldClassName("fullAddress")}
                  id="fullAddress"
                  name="fullAddress"
                  onChange={(event) => updateField("fullAddress", event.target.value)}
                  placeholder="Sokak, bina, daire, kat"
                  required
                  type="text"
                  value={formState.fullAddress}
                />
                <p className={helperClassName} id="fullAddress-helper">
                  Ustanın hazırlıklı gelmesi için erişim detaylarını ekle.
                </p>
                <FieldError id="fullAddress-error" message={errors.fullAddress} />
              </div>
            )}
          </div>
        </fieldset>

        <fieldset className={sectionClassName}>
          <legend className="cursor-default select-none">
            <span className="block text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
              Adım 2
            </span>
            <span className="mt-1 block text-xl font-bold leading-tight text-[var(--brand-navy)]">
              {isEmergencyFlow ? "Fiyat ve ödeme" : "Zamanlama"}
            </span>
          </legend>

          {isEmergencyFlow ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-[rgba(255,138,0,0.22)] bg-[#fffdf9] p-4 shadow-[0_12px_34px_rgba(13,20,36,0.05)]">
                <EmergencyStepLabel step={3}>Sistem fiyat önerir</EmergencyStepLabel>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md bg-white p-4 ring-1 ring-[rgba(13,20,36,0.08)]">
                    <p className="text-xs font-bold uppercase text-[var(--muted)]">
                      Tahmini fiyat
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[var(--brand-navy)]">
                      {formatPrice(suggestedEmergencyPrice)}
                    </p>
                  </div>
                  <div className="rounded-md bg-white p-4 ring-1 ring-[rgba(13,20,36,0.08)]">
                    <p className="text-xs font-bold uppercase text-[var(--muted)]">
                      Teklifin
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[var(--brand-orange-dark)]">
                      {formatPrice(formState.offerAmount || suggestedEmergencyPrice)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-md bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-bold uppercase text-[var(--muted)]">
                      Kategori aralığı
                    </p>
                    <p className="text-xs font-bold text-[var(--brand-navy)]">
                      {formatPrice(emergencyPriceRange.minimumPrice)} - {formatPrice(emergencyPriceRange.maximumPrice)}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {emergencyPriceOptions.map((option) => {
                      const isSelected =
                        parsePriceValue(formState.offerAmount || suggestedEmergencyPrice) ===
                        option.value;

                      return (
                        <button
                          aria-pressed={isSelected}
                          className={cn(
                            "min-h-11 rounded-md border px-3 text-sm font-bold transition-all",
                            isSelected
                              ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] text-[var(--brand-navy)] shadow-[0_10px_24px_rgba(255,138,0,0.14)]"
                              : "border-[rgba(13,20,36,0.08)] bg-white text-[var(--muted)] hover:border-[var(--brand-orange)] hover:text-[var(--brand-navy)]",
                          )}
                          key={option.value}
                          onClick={() => updateField("offerAmount", String(option.value))}
                          type="button"
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <FieldError id="offerAmount-error" message={errors.offerAmount} />
              </div>

              <div>
                <EmergencyStepLabel step={5}>Ödeme tercihi seç</EmergencyStepLabel>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {emergencyPaymentOptions.map((option) => {
                    const isSelected = formState.paymentPreference === option.value;

                    return (
                      <label
                        className={cn(
                          "flex min-h-24 cursor-pointer flex-col justify-between rounded-md border bg-white p-4 transition-colors focus-within:ring-2 focus-within:ring-[var(--brand-orange)] focus-within:ring-offset-2",
                          isSelected
                            ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[0_12px_28px_rgba(255,138,0,0.14)]"
                            : "border-[var(--border)] hover:border-[var(--brand-orange)]",
                          errors.paymentPreference && "border-red-500",
                        )}
                        key={option.value}
                      >
                        <input
                          checked={isSelected}
                          className="sr-only"
                          name="paymentPreference"
                          onChange={(event) => updateField("paymentPreference", event.target.value)}
                          required
                          type="radio"
                          value={option.value}
                        />
                        <span className="text-sm font-bold text-[var(--brand-navy)]">
                          {option.label}
                        </span>
                        <span className="mt-3 text-xs leading-5 text-[var(--muted)]">
                          {option.description}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <FieldError id="paymentPreference-error" message={errors.paymentPreference} />
              </div>
            </div>
          ) : (
            <>
              <div>
                <span className={labelClassName}>Aciliyet</span>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {urgencyOptions.map((option) => {
                    const isSelected = formState.urgencyLevel === option.value;

                    return (
                      <label
                        className={cn(
                          "flex min-h-28 cursor-pointer flex-col justify-between rounded-md border bg-white p-4 transition-colors focus-within:ring-2 focus-within:ring-[var(--brand-orange)] focus-within:ring-offset-2",
                          isSelected
                            ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[0_12px_28px_rgba(255,138,0,0.14)]"
                            : "border-[var(--border)] hover:border-[var(--brand-orange)]",
                          errors.urgencyLevel && "border-red-500",
                        )}
                        key={option.value}
                      >
                        <input
                          aria-describedby={
                            errors.urgencyLevel ? "urgencyLevel-error" : "urgencyLevel-helper"
                          }
                          checked={isSelected}
                          className="sr-only"
                          name="urgencyLevel"
                          onChange={(event) => updateField("urgencyLevel", event.target.value)}
                          required
                          type="radio"
                          value={option.value}
                        />
                        <span className="text-sm font-bold text-[var(--brand-navy)]">
                          {option.value}
                        </span>
                        <span className="mt-3 text-xs leading-5 text-[var(--muted)]">
                          {option.description}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className={helperClassName} id="urgencyLevel-helper">
                  Aciliyet, uygun ustaları önceliklendirmeye yardımcı olur.
                </p>
                <FieldError id="urgencyLevel-error" message={errors.urgencyLevel} />
              </div>

              <div>
                <span className={labelClassName}>Bütçe</span>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {standardBudgetOptions.map((option) => {
                    const isSelected = formState.budgetTag === option.value;

                    return (
                      <label
                        className={cn(
                          "flex min-h-24 cursor-pointer flex-col justify-between rounded-md border bg-white p-4 transition-colors focus-within:ring-2 focus-within:ring-[var(--brand-orange)] focus-within:ring-offset-2",
                          isSelected
                            ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[0_12px_28px_rgba(255,138,0,0.14)]"
                            : "border-[var(--border)] hover:border-[var(--brand-orange)]",
                          errors.budgetTag && "border-red-500",
                        )}
                        key={option.value}
                      >
                        <input
                          checked={isSelected}
                          className="sr-only"
                          name="budgetTag"
                          onChange={(event) => updateField("budgetTag", event.target.value)}
                          required
                          type="radio"
                          value={option.value}
                        />
                        <span className="text-sm font-bold text-[var(--brand-navy)]">
                          {option.label}
                        </span>
                        <span className="mt-3 text-xs leading-5 text-[var(--muted)]">
                          Talebin için tercih ettiğin fiyat aralığı.
                        </span>
                      </label>
                    );
                  })}
                </div>
                <FieldError id="budgetTag-error" message={errors.budgetTag} />
              </div>

              <div>
                <span className={labelClassName}>Ödeme yöntemi</span>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {standardPaymentOptions.map((option) => {
                    const isSelected = formState.paymentPreference === option.value;

                    return (
                      <label
                        className={cn(
                          "flex min-h-24 cursor-pointer flex-col justify-between rounded-md border bg-white p-4 transition-colors focus-within:ring-2 focus-within:ring-[var(--brand-orange)] focus-within:ring-offset-2",
                          isSelected
                            ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[0_12px_28px_rgba(255,138,0,0.14)]"
                            : "border-[var(--border)] hover:border-[var(--brand-orange)]",
                          errors.paymentPreference && "border-red-500",
                        )}
                        key={option.value}
                      >
                        <input
                          checked={isSelected}
                          className="sr-only"
                          name="paymentPreference"
                          onChange={(event) => updateField("paymentPreference", event.target.value)}
                          required
                          type="radio"
                          value={option.value}
                        />
                        <span className="text-sm font-bold text-[var(--brand-navy)]">
                          {option.label}
                        </span>
                        <span className="mt-3 text-xs leading-5 text-[var(--muted)]">
                          {option.description}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <FieldError id="paymentPreference-error" message={errors.paymentPreference} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClassName} htmlFor="preferredDate">
                    Tercih edilen tarih
                  </label>
                  <input
                    aria-describedby={
                      errors.preferredDate ? "preferredDate-error" : "preferredDate-helper"
                    }
                    aria-invalid={Boolean(errors.preferredDate)}
                    className={getFieldClassName("preferredDate")}
                    id="preferredDate"
                    name="preferredDate"
                    onChange={(event) => updateField("preferredDate", event.target.value)}
                    required
                    type="date"
                    value={formState.preferredDate}
                  />
                  <p className={helperClassName} id="preferredDate-helper">
                    Ustanın gelebileceği en uygun tarihi seç.
                  </p>
                  <FieldError id="preferredDate-error" message={errors.preferredDate} />
                </div>

                <div>
                  <label className={labelClassName} htmlFor="preferredTimeRange">
                    Tercih edilen saat aralığı
                  </label>
                  <select
                    aria-describedby={
                      errors.preferredTimeRange
                        ? "preferredTimeRange-error"
                        : "preferredTimeRange-helper"
                    }
                    aria-invalid={Boolean(errors.preferredTimeRange)}
                    className={getSelectFieldClassName("preferredTimeRange")}
                    id="preferredTimeRange"
                    name="preferredTimeRange"
                    onChange={(event) => updateField("preferredTimeRange", event.target.value)}
                    required
                    value={formState.preferredTimeRange}
                  >
                    <option value="">Saat aralığı seç</option>
                    {timeRangeOptions.map((timeRange) => (
                      <option key={timeRange} value={timeRange}>
                        {timeRange}
                      </option>
                    ))}
                  </select>
                  <p className={helperClassName} id="preferredTimeRange-helper">
                    Geniş zaman aralıkları daha hızlı eşleşme sağlar.
                  </p>
                  <FieldError id="preferredTimeRange-error" message={errors.preferredTimeRange} />
                </div>
              </div>
            </>
          )}
        </fieldset>

        {isEmergencyFlow ? (
          <fieldset className={sectionClassName}>
            <legend className="cursor-default select-none">
              <span className="block text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
                Adım 3
              </span>
              <span className="mt-1 block text-xl font-bold leading-tight text-[var(--brand-navy)]">
                Çağrı özeti
              </span>
            </legend>
            <div className="grid gap-3 rounded-lg bg-[#fffdf9] p-4 ring-1 ring-[rgba(13,20,36,0.08)]">
              {[
                ["Hizmet", formState.serviceCategory || "Seçim bekleniyor"],
                ["İlçe", formState.district || "Seçim bekleniyor"],
                ["Konum", formState.approximateLocation || "İlçe üzerinden"],
                ["Teklif", formatPrice(formState.offerAmount || suggestedEmergencyPrice)],
                ["Ödeme", getPaymentPreferenceLabel(formState.paymentPreference)],
              ].map(([label, value]) => (
                <div
                  className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-white px-3 py-2 ring-1 ring-[rgba(13,20,36,0.06)]"
                  key={label}
                >
                  <span className="text-xs font-bold uppercase text-[var(--muted)]">{label}</span>
                  <span className="min-w-0 text-right text-sm font-bold text-[var(--brand-navy)]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </fieldset>
        ) : (
          <fieldset className={sectionClassName}>
            <legend className="cursor-default select-none">
              <span className="block text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
                Adım 3
              </span>
              <span className="mt-1 block text-xl font-bold leading-tight text-[var(--brand-navy)]">
                İletişim ve notlar
              </span>
            </legend>
            <p className="cursor-default select-none text-sm leading-6 text-[var(--muted)]">
              Ustanın seni doğru bilgilerle araması için iletişim kişisini ve kısa notu ekle.
            </p>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClassName} htmlFor="fullName">
                  Ad soyad
                </label>
                <input
                  aria-describedby={errors.fullName ? "fullName-error" : "fullName-helper"}
                  aria-invalid={Boolean(errors.fullName)}
                  autoComplete="name"
                  className={getFieldClassName("fullName")}
                  id="fullName"
                  name="fullName"
                  onChange={(event) => updateField("fullName", event.target.value)}
                  placeholder="Adını ve soyadını yaz"
                  required
                  type="text"
                  value={formState.fullName}
                />
                <p className={helperClassName} id="fullName-helper">
                  Usta seninle bu isimle iletişime geçer.
                </p>
                <FieldError id="fullName-error" message={errors.fullName} />
              </div>

              <div>
                <label className={labelClassName} htmlFor="phoneNumber">
                  Telefon numarası
                </label>
                <input
                  aria-describedby={errors.phoneNumber ? "phoneNumber-error" : "phoneNumber-helper"}
                  aria-invalid={Boolean(errors.phoneNumber)}
                  autoComplete="tel"
                  className={getFieldClassName("phoneNumber")}
                  id="phoneNumber"
                  inputMode="tel"
                  name="phoneNumber"
                  onChange={(event) => updateField("phoneNumber", event.target.value)}
                  placeholder="+90 5xx xxx xx xx"
                  required
                  type="tel"
                  value={formState.phoneNumber}
                />
                <p className={helperClassName} id="phoneNumber-helper">
                  Hızlı dönüş için aktif bir numara yaz.
                </p>
                <FieldError id="phoneNumber-error" message={errors.phoneNumber} />
              </div>
            </div>

            <div>
              <label className={labelClassName} htmlFor="shortDescription">
                Açıklama
              </label>
              <textarea
                aria-describedby={
                  errors.shortDescription ? "shortDescription-error" : "shortDescription-helper"
                }
                aria-invalid={Boolean(errors.shortDescription)}
                className={`${getFieldClassName("shortDescription")} min-h-36 resize-y leading-6`}
                id="shortDescription"
                name="shortDescription"
                onChange={(event) => updateField("shortDescription", event.target.value)}
                placeholder="İşi, mevcut durumu, erişim notlarını ve özel beklentilerini yaz."
                required
                value={formState.shortDescription}
              />
              <p className={helperClassName} id="shortDescription-helper">
                Net notlar daha doğru fiyat aralığı ve hızlı dönüş sağlar.
              </p>
              <FieldError id="shortDescription-error" message={errors.shortDescription} />
            </div>
          </fieldset>
        )}

        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="cursor-default select-none text-sm leading-6 text-[var(--muted)]">
            {isEmergencyFlow
              ? "Doğrulama, usta ve müşteri aynı yerdeyken güvenli başlangıç için kullanılır; ödeme tamamlandı sayılmaz."
              : "Şifre talep edilmez; bilgiler yalnızca talep eşleşmesi için kullanılır."}
          </p>
          <Button className="w-full sm:w-fit" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? "Gönderiliyor..."
              : isEmergencyFlow
                ? "Acil Usta Çağır"
                : "Talebi Gönder"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
