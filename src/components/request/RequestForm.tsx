"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  PackagePlus,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  Tag,
  UploadCloud,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  createEmergencyRequestAction,
  createServiceRequestAction,
} from "@/app/request/actions";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";
import { providerBudgetOptions, providerDistricts } from "@/lib/constants/providers";
import {
  normalizeServiceValue,
  serviceCategories,
  type Service,
} from "@/lib/constants/services";
import { getPublicErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { validateServiceRequestInput } from "@/lib/validations";
import { trackRequestCreated } from "@/services/analytics";
import {
  calculateSuggestedPrice,
  getBudgetTagLabel,
  getEmergencyPriceOptions,
  getEmergencyPriceRange,
  normalizeBudgetTag,
} from "@/services/matching";
import { mapTimePreferenceToRequestIntent } from "@/services/matching/time";
import {
  EMERGENCY_PAYMENT_PREFERENCES,
  PAYMENT_PREFERENCES,
  getPaymentPreferenceLabel,
  normalizePaymentPreference,
  type ServiceRequestPaymentPreference,
} from "@/services/payments";
import type { ServiceRequestSubmitResult } from "@/services/requests";
import { liveTrackingSoonText } from "@/services/tracking";
import type { RequestFormInsights } from "@/types/request";

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
  shortDescription: string;
};

type RequestField = keyof RequestFormState;
type RequestFormErrors = Partial<Record<RequestField, string>>;
type SubmittedRequest = ServiceRequestSubmitResult;

type RequestFormProps = {
  authenticatedUserId?: string | null;
  initialApproximateLocation?: string;
  initialBudgetTag?: string;
  initialDistrict?: string;
  initialNotes?: string;
  initialOfferAmount?: string;
  initialPaymentPreference?: string;
  initialProfileFullName?: string | null;
  initialProviderId?: string;
  initialProviderName?: string;
  initialService?: string;
  initialTimePreference?: string;
  insights: RequestFormInsights;
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
  | "initialProviderId"
  | "initialProviderName"
  | "initialService"
  | "initialTimePreference"
>;

type CheckoutStepId =
  | "service"
  | "address"
  | "date"
  | "time"
  | "extras"
  | "notes"
  | "summary"
  | "payment";

type CheckoutStep = {
  id: CheckoutStepId;
  icon: LucideIcon;
  kicker: string;
  title: string;
};

type CheckoutExtraId = "priority" | "materials" | "cleanup" | "warranty";

type CheckoutExtra = {
  id: CheckoutExtraId;
  label: string;
  description: string;
  durationMinutes: number;
  price: number;
};

type ServiceEstimate = {
  durationMinutes: number;
  price: number;
};

const initialFormState: RequestFormState = {
  approximateLocation: "",
  budgetTag: "",
  serviceCategory: "",
  district: "",
  fullAddress: "",
  offerAmount: "",
  paymentPreference: PAYMENT_PREFERENCES.onlineSoon,
  urgencyLevel: "",
  urgencyType: "standard",
  preferredDate: "",
  preferredTimeRange: "",
  fullName: "",
  shortDescription: "",
};

const checkoutSteps: CheckoutStep[] = [
  { id: "service", icon: ShoppingBag, kicker: "1", title: "Service" },
  { id: "date", icon: CalendarDays, kicker: "2", title: "Date" },
  { id: "time", icon: Clock3, kicker: "3", title: "Time" },
  { id: "extras", icon: PackagePlus, kicker: "4", title: "Extra Services" },
  { id: "address", icon: MapPin, kicker: "5", title: "Address" },
  { id: "notes", icon: Camera, kicker: "6", title: "Notes & Photos" },
  { id: "summary", icon: ReceiptText, kicker: "7", title: "Order Summary" },
  { id: "payment", icon: CreditCard, kicker: "8", title: "Payment" },
];

const providerProfileCheckoutSteps: CheckoutStep[] = [
  { id: "date", icon: CalendarDays, kicker: "1", title: "Date" },
  { id: "time", icon: Clock3, kicker: "2", title: "Time" },
  { id: "extras", icon: PackagePlus, kicker: "3", title: "Extras" },
  { id: "address", icon: MapPin, kicker: "4", title: "Address" },
  { id: "notes", icon: Camera, kicker: "5", title: "Notes / Photos" },
  { id: "summary", icon: ReceiptText, kicker: "6", title: "Order Summary" },
  { id: "payment", icon: CreditCard, kicker: "7", title: "Payment" },
];

const urgencyOptions: Array<{
  value: UrgencyLevel;
  description: string;
}> = [
  {
    value: "Esnek",
    description: "Daha rahat planlama ve daha fazla profil karşılaştırması.",
  },
  {
    value: "Bu hafta",
    description: "Yakın tarihli randevu için dengeli seçenek.",
  },
  {
    value: "Acil",
    description: "Bugün veya en kısa sürede destek önceliği.",
  },
];

const timeRangeOptions = [
  "Sabah (08:00 - 12:00)",
  "Öğle (12:00 - 15:00)",
  "Öğleden sonra (15:00 - 18:00)",
  "Akşam (18:00 - 21:00)",
];

const onlinePaymentOption: {
  description: string;
  label: string;
  value: ServiceRequestPaymentPreference;
} = {
  description:
    "Kartla online ödeme alınır; tutar doğrulama kodu girilene kadar emanet hesapta tutulur.",
  label: "Online Ödeme",
  value: PAYMENT_PREFERENCES.onlineSoon,
};

const emergencyPaymentOptions = [onlinePaymentOption];

const standardBudgetOptions = providerBudgetOptions.filter(
  (option) => option.value !== "acil-hizmet",
);

const standardPaymentOptions: Array<{
  description: string;
  label: string;
  value: ServiceRequestPaymentPreference;
}> = [onlinePaymentOption];

const emergencyLocationOptions = ["Ev", "İş yeri", "Site / apartman", "Kapı önü"];

const checkoutExtraOptions: CheckoutExtra[] = [
  {
    id: "priority",
    label: "Öncelikli eşleşme",
    description: "Uygun profiller içinde daha hızlı sıraya alınır.",
    durationMinutes: 0,
    price: 350,
  },
  {
    id: "materials",
    label: "Malzeme hazırlığı",
    description: "Temel sarf malzeme ve küçük parça hazırlığı.",
    durationMinutes: 20,
    price: 250,
  },
  {
    id: "cleanup",
    label: "İş sonrası toparlama",
    description: "Alan teslimi için hafif temizlik ve düzen desteği.",
    durationMinutes: 15,
    price: 180,
  },
  {
    id: "warranty",
    label: "30 gün kontrol",
    description: "Aynı iş için kısa takip kontrolü not edilir.",
    durationMinutes: 10,
    price: 220,
  },
];

const serviceEstimates: Record<string, ServiceEstimate> = {
  electrical: { durationMinutes: 75, price: 850 },
  plumbing: { durationMinutes: 85, price: 950 },
  cleaning: { durationMinutes: 180, price: 1200 },
  painting: { durationMinutes: 360, price: 3000 },
  "climate-appliance-service": { durationMinutes: 90, price: 1250 },
  locksmith: { durationMinutes: 45, price: 900 },
  "furniture-assembly": { durationMinutes: 120, price: 1000 },
  "moving-help": { durationMinutes: 180, price: 2500 },
  "carpet-cleaning": { durationMinutes: 60, price: 800 },
  "pool-garden": { durationMinutes: 180, price: 4000 },
  renovation: { durationMinutes: 360, price: 5000 },
};

const subServiceOptionsByServiceId: Record<string, string[]> = {
  electrical: ["Arıza tespiti", "Priz / anahtar", "Aydınlatma montajı"],
  plumbing: ["Su kaçağı", "Musluk / batarya", "Gider açma"],
  cleaning: ["Ev temizliği", "Ofis temizliği", "Taşınma sonrası"],
  painting: ["Oda boyama", "Tüm ev boya", "Rötuş / tamir"],
  "climate-appliance-service": ["Klima servis", "Beyaz eşya arıza", "Bakım"],
  locksmith: ["Kapı açma", "Kilit değişimi", "Oto çilingir"],
  "furniture-assembly": ["Dolap montajı", "Yatak / masa", "Raf montajı"],
  "moving-help": ["Küçük eşya", "Koli taşıma", "Apartman içi"],
  "carpet-cleaning": ["Teslim almalı", "Leke çıkarma", "Yerinde yıkama"],
  "pool-garden": ["Bahçe bakım", "Havuz temizlik", "Peyzaj destek"],
  renovation: ["Küçük tadilat", "Banyo / mutfak", "Genel keşif"],
};

const couponDiscountRates: Record<string, number> = {
  FUWU10: 0.1,
  MERHABA10: 0.1,
};

const fieldBaseClassName =
  "premium-control mt-2 w-full min-w-0 px-4 py-3 text-sm font-semibold outline-none";
const fieldClassName = `${fieldBaseClassName} cursor-text select-text placeholder:text-[var(--muted)]`;
const selectFieldClassName = `${fieldBaseClassName} min-h-12 cursor-pointer select-none pr-10`;
const labelClassName = "block cursor-default select-none text-sm font-bold text-[var(--brand-navy)]";
const helperClassName = "mt-2 cursor-default select-none text-xs leading-5 text-[var(--muted)]";
const errorClassName = "mt-2 cursor-default select-none text-sm font-medium text-red-600";
const stepCardClassName =
  "premium-reveal rounded-lg border bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-300 sm:p-6";
const serviceRequestSuccessMessage = "Siparişiniz başarıyla alındı";
const serviceRequestSubmitErrorMessage =
  "Ödemeye geçilemedi. Lütfen tekrar deneyin.";
const emptyRequestFormInsights: RequestFormInsights = {
  averageResponseMinutesByCategory: {},
  providerCountByCategory: {},
  providerCountByCategoryAndDistrict: {},
  source: "fallback",
};

const pendingRequestFormStorageKey = "fuwu:pending-request-form";

function parseStoredRequestForm(value: string): RequestFormState | null {
  try {
    const storedValue = JSON.parse(value) as Partial<Record<RequestField, unknown>>;
    const restoredState = { ...initialFormState };

    for (const field of Object.keys(initialFormState) as RequestField[]) {
      if (typeof storedValue[field] === "string") {
        restoredState[field] = storedValue[field] as never;
      }
    }

    if (
      restoredState.urgencyType !== "standard" &&
      restoredState.urgencyType !== "emergency"
    ) {
      restoredState.urgencyType = "standard";
    }

    const validationResult = validateServiceRequestInput(restoredState);

    return validationResult.ok ? restoredState : null;
  } catch {
    return null;
  }
}

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

function formatDateForSummary(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "short",
  }).format(date);
}

function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "Seçim bekleniyor";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours} saat ${remainingMinutes} dk`;
  }

  if (hours > 0) {
    return `${hours} saat`;
  }

  return `${remainingMinutes} dk`;
}

function roundToNearestTen(value: number) {
  return Math.max(0, Math.round(value / 10) * 10);
}

function createEmergencySummary(values: RequestFormState) {
  return `Acil ${values.serviceCategory || "hizmet"} siparişi`;
}

function parseServiceCategoryName(serviceCategory: string) {
  const categoryParts = serviceCategory.split(" - ");
  return categoryParts[categoryParts.length - 1]?.trim() ?? serviceCategory.trim();
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
      ? values.preferredTimeRange.trim() || "En kısa süre"
      : values.preferredTimeRange.trim(),
    fullName: values.fullName.trim(),
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
  initialService = "",
  initialTimePreference = "",
}: RequestInitialFormProps): RequestFormState {
  const trimmedInitialService = initialService.trim();
  const normalizedInitialService = normalizeServiceValue(trimmedInitialService);
  const matchedService = serviceCategories.find((service) =>
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
    offerAmount: initialOfferAmount.trim() || (suggestedEmergencyPrice ? String(suggestedEmergencyPrice) : ""),
    paymentPreference: canPrefillPaymentPreference
      ? normalizedPaymentPreference ?? PAYMENT_PREFERENCES.onlineSoon
      : PAYMENT_PREFERENCES.onlineSoon,
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

function getServiceValue(service: Service) {
  return `${service.category} - ${service.title}`;
}

function getSelectedService(serviceCategory: string) {
  const normalizedValue = normalizeServiceValue(parseServiceCategoryName(serviceCategory));

  return serviceCategories.find((service) => {
    const serviceSlug = service.href.replace("/providers?category=", "");

    return [
      service.title,
      serviceSlug,
      `${service.title} hizmeti`,
      getServiceValue(service),
    ]
      .map(normalizeServiceValue)
      .includes(normalizedValue);
  });
}

function getServiceInsightKeys(serviceCategory: string, selectedService?: Service) {
  const serviceName = parseServiceCategoryName(serviceCategory);
  const serviceSlug = selectedService?.href.replace("/providers?category=", "") ?? "";

  return Array.from(
    new Set(
      [
        serviceName,
        serviceSlug,
        selectedService?.title,
        selectedService ? `${selectedService.title} hizmeti` : "",
      ]
        .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
        .map(normalizeServiceValue),
    ),
  );
}

function getFirstInsightNumber(keys: string[], values: Record<string, number>) {
  for (const key of keys) {
    const value = values[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function getCategoryProviderCount(insights: RequestFormInsights, keys: string[]) {
  return getFirstInsightNumber(keys, insights.providerCountByCategory);
}

function getDistrictProviderCount(
  insights: RequestFormInsights,
  categoryKeys: string[],
  district: string,
) {
  const districtKey = normalizeServiceValue(district);

  if (!districtKey) {
    return null;
  }

  return getFirstInsightNumber(
    categoryKeys.map((categoryKey) => `${categoryKey}|${districtKey}`),
    insights.providerCountByCategoryAndDistrict,
  );
}

function getAverageResponseMinutes(insights: RequestFormInsights, keys: string[]) {
  return getFirstInsightNumber(keys, insights.averageResponseMinutesByCategory);
}

function getSubServiceOptions(selectedService?: Service) {
  if (!selectedService) {
    return [];
  }

  return subServiceOptionsByServiceId[selectedService.id] ?? [selectedService.title];
}

function getBudgetPriceMultiplier(budgetTag: string) {
  const normalizedBudget = normalizeBudgetTag(budgetTag);

  if (normalizedBudget === "ekonomik") {
    return 0.9;
  }

  if (normalizedBudget === "premium") {
    return 1.28;
  }

  return 1;
}

function getCheckoutStepForField(field: RequestField): CheckoutStepId {
  if (field === "serviceCategory") {
    return "service";
  }

  if (["approximateLocation", "district", "fullAddress"].includes(field)) {
    return "address";
  }

  if (["preferredDate", "urgencyLevel"].includes(field)) {
    return "date";
  }

  if (field === "preferredTimeRange") {
    return "time";
  }

  if (["fullName", "shortDescription"].includes(field)) {
    return "notes";
  }

  return "payment";
}

function buildCheckoutDescription({
  couponCode,
  photoNames,
  providerId,
  providerName,
  selectedExtras,
  selectedSubService,
  shortDescription,
}: {
  couponCode: string;
  photoNames: string[];
  providerId?: string;
  providerName?: string;
  selectedExtras: CheckoutExtra[];
  selectedSubService: string;
  shortDescription: string;
}) {
  const checkoutLines = [
    providerName ? `Seçilen usta: ${providerName}` : "",
    providerId ? `Seçilen usta ID: ${providerId}` : "",
    selectedSubService ? `Alt hizmet: ${selectedSubService}` : "",
    selectedExtras.length > 0
      ? `Ek hizmetler: ${selectedExtras.map((extra) => extra.label).join(", ")}`
      : "",
    couponCode.trim() ? `Kupon: ${couponCode.trim()}` : "",
    photoNames.length > 0 ? `Fotoğraf notu: ${photoNames.length} görsel seçildi.` : "",
  ].filter(Boolean);

  return [shortDescription.trim(), ...checkoutLines].filter(Boolean).join("\n");
}

function getCheckoutStepDefinition(
  stepId: CheckoutStepId,
  steps: CheckoutStep[],
) {
  return steps.find((step) => step.id === stepId) ?? checkoutSteps.find((step) => step.id === stepId)!;
}

function getCheckoutStepOrderClassName(
  stepId: CheckoutStepId,
  isProviderProfileCheckout: boolean,
) {
  const providerStepOrder: Partial<Record<CheckoutStepId, string>> = {
    date: "order-1",
    time: "order-2",
    extras: "order-3",
    address: "order-4",
    notes: "order-5",
    summary: "order-6",
    payment: "order-7",
  };
  const standardStepOrder: Record<CheckoutStepId, string> = {
    service: "order-1",
    date: "order-2",
    time: "order-3",
    extras: "order-4",
    address: "order-5",
    notes: "order-6",
    summary: "order-7",
    payment: "order-8",
  };

  return isProviderProfileCheckout
    ? providerStepOrder[stepId] ?? "hidden"
    : standardStepOrder[stepId];
}

function InsightNote({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "green" | "neutral" | "orange";
}) {
  const className =
    tone === "green"
      ? "border-[rgba(23,116,95,0.22)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]"
      : tone === "orange"
        ? "border-[rgba(255,138,0,0.26)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"
        : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--muted)]";

  return (
    <p className={`rounded-full border px-3 py-2 text-xs font-semibold leading-5 ${className}`}>
      {children}
    </p>
  );
}

function CheckoutStepCard({
  children,
  className,
  isActive,
  isComplete,
  onActivate,
  step,
}: {
  children: ReactNode;
  className?: string;
  isActive: boolean;
  isComplete: boolean;
  onActivate: () => void;
  step: CheckoutStep;
}) {
  const Icon = step.icon;

  return (
    <fieldset
      className={cn(
        stepCardClassName,
        isActive
          ? "border-[rgba(255,101,0,0.34)] shadow-[var(--shadow-elevated)] ring-2 ring-[rgba(255,101,0,0.08)]"
          : "border-[rgba(10,37,64,0.08)]",
        className,
      )}
      onFocusCapture={onActivate}
    >
      <legend className="cursor-default select-none">
        <span className="inline-flex items-center gap-3 rounded-full bg-white pr-3 text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
          <span
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-md border",
              isComplete
                ? "border-[rgba(23,116,95,0.25)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]"
                : "border-[rgba(255,101,0,0.22)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]",
            )}
          >
            {isComplete ? <CheckCircle2 aria-hidden="true" className="size-4" /> : step.kicker}
          </span>
          <Icon aria-hidden="true" className="size-4" />
          {step.title}
        </span>
      </legend>
      <div className="mt-5">{children}</div>
    </fieldset>
  );
}

function SummaryLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 border-b border-[rgba(10,37,64,0.08)] py-3 last:border-b-0">
      <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">{label}</dt>
      <dd
        className={cn(
          "min-w-0 max-w-[62%] text-right text-sm leading-5 text-[var(--brand-navy)]",
          strong ? "font-extrabold" : "font-semibold",
        )}
      >
        {value || "Seçim bekleniyor"}
      </dd>
    </div>
  );
}

function OrderSummaryPanel({
  addressSummary,
  couponCode,
  couponDiscount,
  couponFeedback,
  dateSummary,
  estimatedDuration,
  estimatedPrice,
  extrasSummary,
  isSubmitting,
  onCouponChange,
  paymentSummary,
  selectedService,
  selectedSubService,
  subtotal,
  timeSummary,
  total,
}: {
  addressSummary: string;
  couponCode: string;
  couponDiscount: number;
  couponFeedback: string;
  dateSummary: string;
  estimatedDuration: string;
  estimatedPrice: number;
  extrasSummary: string;
  isSubmitting: boolean;
  onCouponChange: (value: string) => void;
  paymentSummary: string;
  selectedService?: Service;
  selectedSubService: string;
  subtotal: number;
  timeSummary: string;
  total: number;
}) {
  return (
    <div className="rounded-lg border border-[rgba(10,37,64,0.09)] bg-white p-5 shadow-[var(--shadow-premium)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
            Order Summary
          </p>
          <h2 className="mt-2 text-2xl font-extrabold leading-tight text-[var(--brand-navy)]">
            Sipariş özeti
          </h2>
        </div>
        <span className="inline-flex size-11 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
          <ReceiptText aria-hidden="true" className="size-5" />
        </span>
      </div>

      <dl className="mt-5 rounded-lg bg-[#fffdf9] px-4 ring-1 ring-[rgba(10,37,64,0.08)]">
        <SummaryLine label="Seçilen hizmet" value={selectedService?.title ?? ""} />
        <SummaryLine label="Alt hizmet" value={selectedSubService || selectedService?.title || ""} />
        <SummaryLine label="Adres" value={addressSummary} />
        <SummaryLine label="Tarih" value={dateSummary} />
        <SummaryLine label="Saat" value={timeSummary} />
        <SummaryLine label="Ek hizmetler" value={extrasSummary} />
        <SummaryLine label="Tahmini süre" value={estimatedDuration} />
        <SummaryLine label="Tahmini fiyat" value={formatPrice(estimatedPrice)} strong />
        <SummaryLine label="Ödeme" value={paymentSummary} />
      </dl>

      <div className="mt-5">
        <label className={labelClassName} htmlFor="couponCode">
          Kupon kodu
        </label>
        <div className="relative">
          <Tag
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--brand-orange-dark)]"
          />
          <input
            className={`${fieldClassName} pl-10 uppercase`}
            id="couponCode"
            name="couponCode"
            onChange={(event) => onCouponChange(event.target.value)}
            placeholder="FUWU10"
            type="text"
            value={couponCode}
          />
        </div>
        <p className={helperClassName}>{couponFeedback}</p>
      </div>

      <div className="mt-5 space-y-3 rounded-lg bg-[var(--surface-soft)] p-4 ring-1 ring-[rgba(10,37,64,0.08)]">
        <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--muted)]">
          <span>Ara toplam</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--muted)]">
          <span>Kupon</span>
          <span>{couponDiscount > 0 ? `-${formatPrice(couponDiscount)}` : "0 TL"}</span>
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-[rgba(10,37,64,0.12)] pt-4">
          <span className="text-sm font-bold uppercase tracking-normal text-[var(--brand-navy)]">
            Total amount
          </span>
          <span className="text-3xl font-extrabold leading-none text-[var(--brand-navy)]">
            {formatPrice(total)}
          </span>
        </div>
      </div>

      <Button
        className="mt-5 min-h-14 w-full rounded-lg text-base font-extrabold"
        disabled={isSubmitting}
        type="submit"
        variant="premium"
      >
        {isSubmitting ? "Ödeme hazırlanıyor..." : "Online Ödemeyi Tamamla"}
      </Button>
      <p className="mt-3 text-center text-xs font-semibold leading-5 text-[var(--muted)]">
        Ödeme kaydı mevcut Fuwu sipariş güvenliğiyle tamamlanır.
      </p>
    </div>
  );
}

export function RequestForm({
  authenticatedUserId,
  insights = emptyRequestFormInsights,
  initialApproximateLocation,
  initialBudgetTag,
  initialDistrict,
  initialNotes,
  initialOfferAmount,
  initialPaymentPreference,
  initialProfileFullName,
  initialProviderId,
  initialProviderName,
  initialService,
  initialTimePreference,
}: RequestFormProps) {
  const router = useRouter();
  const initialProviderIdValue = initialProviderId?.trim() ?? "";
  const initialProviderNameValue = initialProviderName?.trim() ?? "";
  const hasProviderProfilePrefill = Boolean(
    initialProviderIdValue && initialService?.trim(),
  );
  const [formState, setFormState] = useState<RequestFormState>(() =>
    createInitialFormState({
      initialApproximateLocation,
      initialBudgetTag,
      initialDistrict,
      initialNotes,
      initialOfferAmount,
      initialPaymentPreference,
      initialProfileFullName,
      initialProviderId,
      initialProviderName,
      initialService,
      initialTimePreference,
    }),
  );
  const [activeStepId, setActiveStepId] = useState<CheckoutStepId>(
    hasProviderProfilePrefill ? "date" : "service",
  );
  const [selectedExtraIds, setSelectedExtraIds] = useState<CheckoutExtraId[]>([]);
  const [selectedSubService, setSelectedSubService] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [photoNames, setPhotoNames] = useState<string[]>([]);
  const [errors, setErrors] = useState<RequestFormErrors>({});
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedRequest | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const isEmergencyFlow = formState.urgencyType === "emergency";
  const selectedService = getSelectedService(formState.serviceCategory);
  const isProviderProfileCheckout = Boolean(
    hasProviderProfilePrefill && selectedService,
  );
  const visibleCheckoutSteps = isProviderProfileCheckout
    ? providerProfileCheckoutSteps
    : checkoutSteps;
  const subServiceOptions = useMemo(() => getSubServiceOptions(selectedService), [selectedService]);
  const selectedExtras = useMemo(
    () => checkoutExtraOptions.filter((extra) => selectedExtraIds.includes(extra.id)),
    [selectedExtraIds],
  );
  const serviceInsightKeys = getServiceInsightKeys(formState.serviceCategory, selectedService);
  const categoryProviderCount = getCategoryProviderCount(insights, serviceInsightKeys);
  const districtProviderCount = getDistrictProviderCount(
    insights,
    serviceInsightKeys,
    formState.district,
  );
  const averageResponseMinutes = getAverageResponseMinutes(insights, serviceInsightKeys);
  const categoryInsightText = formState.serviceCategory
    ? categoryProviderCount !== null
      ? `Bu kategoride ${categoryProviderCount} aktif usta görünüyor.`
      : insights.source === "supabase"
        ? "Bu kategori için canlı usta sayısı şu an netleşmedi."
        : "Canlı usta sayısı Supabase bağlandığında burada görünür."
    : "Kategori seçildiğinde canlı uygunluk bilgisi burada görünür.";
  const districtInsightText =
    formState.serviceCategory && formState.district
      ? districtProviderCount !== null
        ? `${formState.district} içinde bu kategori için ${districtProviderCount} aktif usta var.`
        : categoryProviderCount !== null && categoryProviderCount > 0
          ? "Bu ilçe için net eşleşme görünmüyor; kategori havuzu yine kontrol edilir."
          : "Bu seçim için canlı uygun usta sayısı şu an görünmüyor."
      : "İlçe seçildiğinde bölge bazlı uygunluk gösterilir.";
  const responseInsightText = averageResponseMinutes
    ? `Ortalama yanıt süresi: ${averageResponseMinutes} dakika.`
    : "Yanıt süresi canlı usta verisi geldikçe netleşir.";
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
  const baseEstimate = selectedService
    ? serviceEstimates[selectedService.id] ?? { durationMinutes: 90, price: 1000 }
    : { durationMinutes: 0, price: 0 };
  const emergencyOfferPrice = parsePriceValue(formState.offerAmount || suggestedEmergencyPrice) ?? 0;
  const estimatedServicePrice = isEmergencyFlow
    ? emergencyOfferPrice
    : roundToNearestTen(baseEstimate.price * getBudgetPriceMultiplier(formState.budgetTag));
  const extrasTotal = selectedExtras.reduce((total, extra) => total + extra.price, 0);
  const subtotal = estimatedServicePrice + extrasTotal;
  const normalizedCouponCode = couponCode.trim().toLocaleUpperCase("tr");
  const couponDiscountRate = couponDiscountRates[normalizedCouponCode] ?? 0;
  const couponDiscount = roundToNearestTen(subtotal * couponDiscountRate);
  const orderTotal = Math.max(0, subtotal - couponDiscount);
  const estimatedDurationMinutes =
    baseEstimate.durationMinutes +
    selectedExtras.reduce((total, extra) => total + extra.durationMinutes, 0);
  const selectedAddressSummary = isEmergencyFlow
    ? [formState.district, formState.approximateLocation || "Konum tipi seçilmedi"]
        .filter(Boolean)
        .join(" - ")
    : [formState.district, formState.fullAddress].filter(Boolean).join(" - ");
  const selectedDateSummary = isEmergencyFlow
    ? formatDateForSummary(formState.preferredDate || getTodayDateInput()) || "Bugün"
    : formatDateForSummary(formState.preferredDate);
  const selectedTimeSummary = formState.preferredTimeRange;
  const extrasSummary =
    selectedExtras.length > 0
      ? selectedExtras.map((extra) => extra.label).join(", ")
      : "Ek hizmet seçilmedi";
  const paymentSummary = getPaymentPreferenceLabel(formState.paymentPreference);
  const couponFeedback =
    couponCode.trim().length === 0
      ? "Kuponun varsa toplam tutar anında güncellenir."
      : couponDiscountRate > 0
        ? "%10 indirim uygulandı."
        : "Bu kupon için indirim bulunamadı.";

  useEffect(() => {
    if (!authenticatedUserId) {
      return;
    }

    const storedValue = window.sessionStorage.getItem(pendingRequestFormStorageKey);

    if (!storedValue) {
      return;
    }

    const restoredState = parseStoredRequestForm(storedValue);
    window.sessionStorage.removeItem(pendingRequestFormStorageKey);

    if (!restoredState) {
      return;
    }

    const restoreTimeoutId = window.setTimeout(() => {
      setFormState(restoredState);
      setRestoreMessage("Bilgileriniz korundu, devam edebilirsiniz.");
    }, 0);

    return () => window.clearTimeout(restoreTimeoutId);
  }, [authenticatedUserId]);

  const currentSubService =
    selectedSubService && subServiceOptions.includes(selectedSubService)
      ? selectedSubService
      : subServiceOptions[0] ?? selectedService?.title ?? "";

  function updateField(field: keyof RequestFormState, value: string) {
    setActiveStepId(getCheckoutStepForField(field));
    setFormState((currentState) => {
      const nextState = {
        ...currentState,
        [field]: value,
      };

      if (field === "budgetTag") {
        nextState.urgencyType = value === "acil-hizmet" ? "emergency" : "standard";
        if (value === "acil-hizmet") {
          nextState.urgencyLevel = "Acil";
          nextState.preferredDate ||= getTodayDateInput();
          nextState.preferredTimeRange ||= "En kısa süre";
        }
      }

      if (
        nextState.urgencyType === "emergency" &&
        (field === "serviceCategory" || field === "district" || field === "budgetTag")
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
    setActiveStepId("address");

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

  function handleDateShortcut(offsetDays: number, urgencyLevel: UrgencyLevel) {
    updateField("preferredDate", formatPreferredDateFromOffset(offsetDays));
    updateField("urgencyLevel", urgencyLevel);
  }

  function toggleExtra(extraId: CheckoutExtraId) {
    setActiveStepId("extras");
    setSelectedExtraIds((currentExtraIds) =>
      currentExtraIds.includes(extraId)
        ? currentExtraIds.filter((currentExtraId) => currentExtraId !== extraId)
        : [...currentExtraIds, extraId],
    );
    setSubmittedRequest(null);
    setSubmitError(null);
  }

  function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    setActiveStepId("notes");
    const files = Array.from(event.target.files ?? [])
      .slice(0, 6)
      .map((file) => file.name);

    setPhotoNames(files);
    setSubmittedRequest(null);
    setSubmitError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveStepId("payment");

    const enrichedFormState: RequestFormState = {
      ...formState,
      shortDescription: buildCheckoutDescription({
        couponCode,
        photoNames,
        providerId: initialProviderIdValue,
        providerName: initialProviderNameValue,
        selectedExtras,
        selectedSubService: currentSubService,
        shortDescription: formState.shortDescription,
      }),
    };
    const normalizedRequest = normalizeForm(enrichedFormState);
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
        if (response.errorCode === "auth-required") {
          window.sessionStorage.setItem(
            pendingRequestFormStorageKey,
            JSON.stringify(normalizedRequest),
          );
          const returnTo = `${window.location.pathname}${window.location.search}`;
          router.push(`/login?next=${encodeURIComponent(returnTo)}&restore=1`);
          return;
        }

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
      if (result.requestId) {
        router.push(`${appRoutes.orderTracking}/${result.requestId}`);
        return;
      }

      setSubmittedRequest(result);
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

  function isStepComplete(stepId: CheckoutStepId) {
    if (stepId === "service") {
      return Boolean(formState.serviceCategory && currentSubService);
    }

    if (stepId === "address") {
      return Boolean(
        formState.district &&
          (isEmergencyFlow ? formState.approximateLocation || formState.fullAddress : formState.fullAddress),
      );
    }

    if (stepId === "date") {
      return Boolean(formState.preferredDate && formState.urgencyLevel);
    }

    if (stepId === "time") {
      return Boolean(formState.preferredTimeRange);
    }

    if (stepId === "extras") {
      return true;
    }

    if (stepId === "notes") {
      return Boolean(formState.fullName && formState.shortDescription);
    }

    if (stepId === "summary") {
      return Boolean(selectedService && selectedAddressSummary && selectedDateSummary && selectedTimeSummary);
    }

    return Boolean(formState.paymentPreference && (isEmergencyFlow ? formState.offerAmount : formState.budgetTag));
  }

  const paymentOptions = isEmergencyFlow ? emergencyPaymentOptions : standardPaymentOptions;

  return (
    <form
      className="relative pb-28 lg:pb-0"
      data-testid="request-form"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_410px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="rounded-lg border border-[rgba(249,115,22,0.22)] bg-[var(--gradient-warm-surface)] p-5 shadow-[var(--shadow-elevated)] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
                  {isProviderProfileCheckout ? "Provider checkout" : "Premium checkout"}
                </p>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[var(--brand-navy)] sm:text-4xl">
                  {isProviderProfileCheckout
                    ? "Tarih seç, randevunu netleştir."
                    : "Hizmeti satın al, randevunu netleştir."}
                </h2>
                <p className="mt-3 text-base font-semibold leading-7 text-[var(--muted)]">
                  {isProviderProfileCheckout
                    ? `${initialProviderNameValue || "Seçtiğin usta"} için servis seçimini geçip doğrudan randevu ve ödeme adımlarına devam et.`
                    : "Servisi, adresi, zamanı ve ödeme tercihini tek akışta tamamla."}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3 text-sm font-bold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] ring-1 ring-[rgba(10,37,64,0.08)]">
                <span className="text-[var(--brand-orange-dark)]">{formatPrice(orderTotal)}</span>
                <span className="ml-2 text-[var(--muted)]">canlı toplam</span>
              </div>
            </div>

            {hasSmartMatchPrefill && !isProviderProfileCheckout ? (
              <p className="mt-4 rounded-md border border-[rgba(13,20,36,0.08)] bg-white px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
                Hızlı Eşleşme seçimlerin checkout akışına eklendi.
              </p>
            ) : null}

            {isProviderProfileCheckout ? (
              <p className="mt-4 rounded-md border border-[rgba(13,20,36,0.08)] bg-white px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
                {initialProviderNameValue || "Seçili usta"} profili üzerinden başladığın için hizmet seçimi tamamlandı.
              </p>
            ) : null}

            <ol
              aria-label="Rezervasyon adımları"
              className={cn(
                "mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4",
                isProviderProfileCheckout ? "xl:grid-cols-7" : "xl:grid-cols-8",
              )}
            >
              {visibleCheckoutSteps.map((step) => {
                const Icon = step.icon;
                const isActive = activeStepId === step.id;
                const isComplete = isStepComplete(step.id);

                return (
                  <li key={step.id}>
                    <button
                      className={cn(
                        "flex min-h-14 w-full items-center gap-2 rounded-md border px-3 text-left text-xs font-extrabold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2",
                        isActive
                          ? "border-[var(--brand-orange)] bg-[var(--brand-orange)] text-white shadow-[var(--shadow-action)]"
                          : isComplete
                            ? "border-[rgba(23,116,95,0.22)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]"
                            : "border-[rgba(10,37,64,0.08)] bg-white text-[var(--muted)] hover:border-[var(--brand-orange)] hover:text-[var(--brand-navy)]",
                      )}
                      onClick={() => setActiveStepId(step.id)}
                      type="button"
                    >
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      <span className="min-w-0 truncate">{step.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {submittedRequest ? (
            <div
              aria-live="polite"
              className="cursor-default select-none overflow-hidden rounded-lg border border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] text-[var(--brand-navy)] shadow-[var(--shadow-elevated)]"
              data-testid="request-success-card"
            >
              <div className="h-1 bg-[var(--trust-green)]" />
              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-normal text-[var(--trust-green)]">
                      Sipariş alındı
                    </p>
                    <h3 className="mt-2 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
                      {submittedRequest.urgencyType === "emergency"
                        ? submittedRequest.providerCountNotified
                          ? "Acil siparişin uygun ustalara iletildi."
                          : "Acil siparişin incelemeye alındı."
                        : "Siparişin Fuwu tarafından alındı."}
                    </h3>
                  </div>
                  <div className="w-fit rounded-md bg-white px-3 py-2 text-xs font-bold text-[var(--brand-navy)] ring-1 ring-[rgba(13,20,36,0.08)]">
                    Kod: <span data-testid="request-success-code">{submittedRequest.requestCode}</span>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                  {submittedRequest.notificationMessage ??
                    `${serviceRequestSuccessMessage}. Uygun profil ve ödeme adımları sistemde izlenir.`}
                </p>
                <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-2">
                  <div className="rounded-md bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
                    <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                      Sipariş kodu
                    </dt>
                    <dd className="mt-1 text-sm font-bold">{submittedRequest.requestCode}</dd>
                  </div>
                  <div className="rounded-md bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
                    <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                      Doğrulama kodu
                    </dt>
                    <dd className="mt-1 text-sm font-bold">
                      {submittedRequest.confirmationCode ?? "Usta kabul edince paylaşılacak"}
                    </dd>
                  </div>
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
                      Ödeme tercihi
                    </dt>
                    <dd className="mt-1 text-sm font-bold">
                      {getPaymentPreferenceLabel(submittedRequest.paymentPreference)}
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
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
              role="alert"
            >
              {submitError}
            </p>
          ) : null}

          {restoreMessage ? (
            <p
              className="rounded-md border border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] px-4 py-3 text-sm font-medium leading-6 text-[var(--trust-green)]"
              role="status"
            >
              {restoreMessage}
            </p>
          ) : null}

          <CheckoutStepCard
            className={getCheckoutStepOrderClassName("service", isProviderProfileCheckout)}
            isActive={activeStepId === "service"}
            isComplete={isStepComplete("service")}
            onActivate={() => setActiveStepId("service")}
            step={getCheckoutStepDefinition("service", visibleCheckoutSteps)}
          >
            <div
              aria-describedby={
                errors.serviceCategory ? "serviceCategory-error" : "serviceCategory-helper"
              }
              aria-invalid={Boolean(errors.serviceCategory)}
              className="grid auto-rows-fr gap-3 md:grid-cols-2 xl:grid-cols-3"
              role="radiogroup"
            >
              {serviceCategories.map((service) => {
                const value = getServiceValue(service);
                const isSelected = formState.serviceCategory === value;

                return (
                  <label
                    className={cn(
                      "flex h-full min-h-44 cursor-pointer flex-col rounded-lg border bg-white p-4 transition-all duration-200 focus-within:ring-2 focus-within:ring-[var(--brand-orange)] focus-within:ring-offset-2",
                      isSelected
                        ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[var(--shadow-action)] ring-2 ring-[rgba(255,138,0,0.16)]"
                        : "border-[var(--border)] hover:-translate-y-0.5 hover:border-[var(--brand-orange)] hover:shadow-[var(--shadow-card)]",
                      errors.serviceCategory && "border-red-500",
                    )}
                    key={service.id}
                  >
                    <input
                      checked={isSelected}
                      className="sr-only"
                      name="serviceCategory"
                      onChange={(event) => updateField("serviceCategory", event.target.value)}
                      required
                      type="radio"
                      value={value}
                    />
                    <span className="inline-flex size-11 items-center justify-center rounded-md bg-white text-[var(--brand-orange-dark)] ring-1 ring-[rgba(13,20,36,0.08)]">
                      <ServiceIcon className="size-5" name={service.iconName} />
                    </span>
                    <span className="mt-4 text-base font-extrabold text-[var(--brand-navy)]">
                      {service.title}
                    </span>
                    <span className="mt-1 text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
                      {service.category}
                    </span>
                    <span className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-[var(--muted)]">
                      {service.description}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className={helperClassName} id="serviceCategory-helper">
              Seçim yaptığında özet ve tahmini toplam anında güncellenir.
            </p>
            <FieldError id="serviceCategory-error" message={errors.serviceCategory} />

            {selectedService ? (
              <div className="mt-5 rounded-lg border border-[rgba(10,37,64,0.08)] bg-[#fffdf9] p-4">
                <p className="text-sm font-extrabold text-[var(--brand-navy)]">Alt hizmet</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {subServiceOptions.map((option) => {
                    const isSelected = currentSubService === option;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={cn(
                          "min-h-12 rounded-md border px-3 text-sm font-bold transition-all duration-200",
                          isSelected
                            ? "border-[var(--brand-orange)] bg-[var(--brand-orange)] text-white shadow-[var(--shadow-action)]"
                            : "border-[rgba(10,37,64,0.08)] bg-white text-[var(--brand-navy)] hover:border-[var(--brand-orange)] hover:bg-[var(--brand-orange-soft)]",
                        )}
                        key={option}
                        onClick={() => {
                          setActiveStepId("service");
                          setSelectedSubService(option);
                        }}
                        type="button"
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <InsightNote tone={categoryProviderCount && categoryProviderCount > 0 ? "green" : "neutral"}>
                {categoryInsightText}
              </InsightNote>
              <InsightNote tone={averageResponseMinutes ? "green" : "neutral"}>
                {responseInsightText}
              </InsightNote>
            </div>
          </CheckoutStepCard>

          <CheckoutStepCard
            className={getCheckoutStepOrderClassName("address", isProviderProfileCheckout)}
            isActive={activeStepId === "address"}
            isComplete={isStepComplete("address")}
            onActivate={() => setActiveStepId("address")}
            step={getCheckoutStepDefinition("address", visibleCheckoutSteps)}
          >
            <div className="grid gap-5 md:grid-cols-2">
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
                <div className="rounded-lg border border-[rgba(255,138,0,0.22)] bg-[var(--brand-orange-soft)] p-4">
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
                    className="mt-3 w-full gap-2"
                    onClick={handleUseApproximateLocation}
                    type="button"
                    variant="secondary"
                  >
                    <MapPin aria-hidden="true" className="size-4" />
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
            <div className="mt-4">
              <InsightNote tone={districtProviderCount && districtProviderCount > 0 ? "green" : "neutral"}>
                {districtInsightText}
              </InsightNote>
            </div>
          </CheckoutStepCard>

          <CheckoutStepCard
            className={getCheckoutStepOrderClassName("date", isProviderProfileCheckout)}
            isActive={activeStepId === "date"}
            isComplete={isStepComplete("date")}
            onActivate={() => setActiveStepId("date")}
            step={getCheckoutStepDefinition("date", visibleCheckoutSteps)}
          >
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <label className={labelClassName} htmlFor="preferredDate">
                  Randevu tarihi
                </label>
                <input
                  aria-describedby={errors.preferredDate ? "preferredDate-error" : "preferredDate-helper"}
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
                  Uygun tarihi seçtiğinde özet tarihi güncellenir.
                </p>
                <FieldError id="preferredDate-error" message={errors.preferredDate} />
              </div>

              <div>
                <span className={labelClassName}>Planlama tercihi</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {[
                    { label: "Bugün", offset: 0, urgency: "Acil" as UrgencyLevel },
                    { label: "Yarın", offset: 1, urgency: "Bu hafta" as UrgencyLevel },
                    { label: "Bu hafta", offset: 4, urgency: "Bu hafta" as UrgencyLevel },
                  ].map((option) => (
                    <button
                      className="min-h-12 rounded-md border border-[rgba(10,37,64,0.08)] bg-white px-3 text-sm font-bold text-[var(--brand-navy)] transition-all duration-200 hover:border-[var(--brand-orange)] hover:bg-[var(--brand-orange-soft)]"
                      key={option.label}
                      onClick={() => handleDateShortcut(option.offset, option.urgency)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {urgencyOptions.map((option) => {
                    const isSelected = formState.urgencyLevel === option.value;

                    return (
                      <label
                        className={cn(
                          "flex min-h-28 cursor-pointer flex-col justify-between rounded-lg border bg-white p-4 transition-colors focus-within:ring-2 focus-within:ring-[var(--brand-orange)] focus-within:ring-offset-2",
                          isSelected
                            ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[var(--shadow-action)]"
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
                        <span className="text-sm font-extrabold text-[var(--brand-navy)]">
                          {option.value}
                        </span>
                        <span className="mt-3 text-xs font-semibold leading-5 text-[var(--muted)]">
                          {option.description}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className={helperClassName} id="urgencyLevel-helper">
                  Planlama tercihi uygun profillerin sıralamasına yardımcı olur.
                </p>
                <FieldError id="urgencyLevel-error" message={errors.urgencyLevel} />
              </div>
            </div>
          </CheckoutStepCard>

          <CheckoutStepCard
            className={getCheckoutStepOrderClassName("time", isProviderProfileCheckout)}
            isActive={activeStepId === "time"}
            isComplete={isStepComplete("time")}
            onActivate={() => setActiveStepId("time")}
            step={getCheckoutStepDefinition("time", visibleCheckoutSteps)}
          >
            <div className="grid gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div>
                <label className={labelClassName} htmlFor="preferredTimeRange">
                  Saat aralığı
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
                  {isEmergencyFlow ? <option value="En kısa süre">En kısa süre</option> : null}
                </select>
                <p className={helperClassName} id="preferredTimeRange-helper">
                  Geniş zaman aralıkları daha hızlı eşleşme sağlar.
                </p>
                <FieldError id="preferredTimeRange-error" message={errors.preferredTimeRange} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[rgba(10,37,64,0.08)] bg-[#fffdf9] p-4">
                  <Clock3 aria-hidden="true" className="size-5 text-[var(--brand-orange-dark)]" />
                  <p className="mt-3 text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                    Tahmini süre
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-[var(--brand-navy)]">
                    {formatDuration(estimatedDurationMinutes)}
                  </p>
                </div>
                <div className="rounded-lg border border-[rgba(10,37,64,0.08)] bg-[#fffdf9] p-4">
                  <Sparkles aria-hidden="true" className="size-5 text-[var(--brand-orange-dark)]" />
                  <p className="mt-3 text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                    Yanıt sinyali
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-[var(--brand-navy)]">
                    {averageResponseMinutes ? `${averageResponseMinutes} dk` : "Canlı veri"}
                  </p>
                </div>
              </div>
            </div>
          </CheckoutStepCard>

          <CheckoutStepCard
            className={getCheckoutStepOrderClassName("extras", isProviderProfileCheckout)}
            isActive={activeStepId === "extras"}
            isComplete={isStepComplete("extras")}
            onActivate={() => setActiveStepId("extras")}
            step={getCheckoutStepDefinition("extras", visibleCheckoutSteps)}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {checkoutExtraOptions.map((extra) => {
                const isSelected = selectedExtraIds.includes(extra.id);

                return (
                  <button
                    aria-pressed={isSelected}
                    className={cn(
                      "min-h-32 rounded-lg border bg-white p-4 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2",
                      isSelected
                        ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[var(--shadow-action)]"
                        : "border-[var(--border)] hover:-translate-y-0.5 hover:border-[var(--brand-orange)] hover:shadow-[var(--shadow-card)]",
                    )}
                    key={extra.id}
                    onClick={() => toggleExtra(extra.id)}
                    type="button"
                  >
                    <span className="flex items-start justify-between gap-4">
                      <span>
                        <span className="block text-base font-extrabold text-[var(--brand-navy)]">
                          {extra.label}
                        </span>
                        <span className="mt-2 block text-xs font-semibold leading-5 text-[var(--muted)]">
                          {extra.description}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "inline-flex size-7 shrink-0 items-center justify-center rounded-md border",
                          isSelected
                            ? "border-[var(--brand-orange)] bg-[var(--brand-orange)] text-white"
                            : "border-[rgba(10,37,64,0.12)] text-[var(--muted)]",
                        )}
                      >
                        <CheckCircle2 aria-hidden="true" className="size-4" />
                      </span>
                    </span>
                    <span className="mt-4 flex items-center justify-between gap-3 text-sm font-extrabold text-[var(--brand-navy)]">
                      <span>{formatPrice(extra.price)}</span>
                      <span>{extra.durationMinutes ? `+${extra.durationMinutes} dk` : "Süre eklemez"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </CheckoutStepCard>

          <CheckoutStepCard
            className={getCheckoutStepOrderClassName("notes", isProviderProfileCheckout)}
            isActive={activeStepId === "notes"}
            isComplete={isStepComplete("notes")}
            onActivate={() => setActiveStepId("notes")}
            step={getCheckoutStepDefinition("notes", visibleCheckoutSteps)}
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div>
                <label className={labelClassName} htmlFor="fullName">
                  Ad soyad
                </label>
                <div className="relative">
                  <UserRound
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--brand-orange-dark)]"
                  />
                  <input
                    aria-describedby={errors.fullName ? "fullName-error" : "fullName-helper"}
                    aria-invalid={Boolean(errors.fullName)}
                    autoComplete="name"
                    className={`${getFieldClassName("fullName")} pl-10`}
                    id="fullName"
                    name="fullName"
                    onChange={(event) => updateField("fullName", event.target.value)}
                    placeholder="Adını ve soyadını yaz"
                    required
                    type="text"
                    value={formState.fullName}
                  />
                </div>
                <p className={helperClassName} id="fullName-helper">
                  Siparişte bu isimle görünürsün.
                </p>
                <FieldError id="fullName-error" message={errors.fullName} />
              </div>

              <div>
                <label className={labelClassName} htmlFor="photoUploads">
                  Fotoğraflar
                </label>
                <label
                  className="mt-2 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[rgba(10,37,64,0.18)] bg-[#fffdf9] px-4 py-5 text-center transition-all duration-200 hover:border-[var(--brand-orange)] hover:bg-[var(--brand-orange-soft)]"
                  htmlFor="photoUploads"
                >
                  <UploadCloud aria-hidden="true" className="size-7 text-[var(--brand-orange-dark)]" />
                  <span className="mt-3 text-sm font-extrabold text-[var(--brand-navy)]">
                    Fotoğraf ekle
                  </span>
                  <span className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">
                    En fazla 6 görsel seçebilirsin.
                  </span>
                </label>
                <input
                  accept="image/*"
                  className="sr-only"
                  id="photoUploads"
                  multiple
                  onChange={handlePhotoSelection}
                  type="file"
                />
                {photoNames.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {photoNames.map((photoName) => (
                      <div
                        className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-bold text-[var(--brand-navy)] ring-1 ring-[rgba(10,37,64,0.08)]"
                        key={photoName}
                      >
                        <Camera aria-hidden="true" className="size-4 text-[var(--brand-orange-dark)]" />
                        <span className="min-w-0 truncate">{photoName}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5">
              <label className={labelClassName} htmlFor="shortDescription">
                Notlar
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
                Ek hizmetler ve kupon bilgisi sipariş notuna otomatik eklenir.
              </p>
              <FieldError id="shortDescription-error" message={errors.shortDescription} />
            </div>
          </CheckoutStepCard>

          <CheckoutStepCard
            className={getCheckoutStepOrderClassName("summary", isProviderProfileCheckout)}
            isActive={activeStepId === "summary"}
            isComplete={isStepComplete("summary")}
            onActivate={() => setActiveStepId("summary")}
            step={getCheckoutStepDefinition("summary", visibleCheckoutSteps)}
          >
            <div className="grid gap-3 rounded-lg bg-[#fffdf9] p-4 ring-1 ring-[rgba(10,37,64,0.08)] sm:grid-cols-2">
              <SummaryLine label="Hizmet" value={selectedService?.title ?? ""} />
              <SummaryLine label="Alt hizmet" value={currentSubService || selectedService?.title || ""} />
              <SummaryLine label="Adres" value={selectedAddressSummary} />
              <SummaryLine label="Tarih" value={selectedDateSummary} />
              <SummaryLine label="Saat" value={selectedTimeSummary} />
              <SummaryLine label="Ek hizmetler" value={extrasSummary} />
              <SummaryLine label="Tahmini süre" value={formatDuration(estimatedDurationMinutes)} />
              <SummaryLine label="Tahmini fiyat" value={formatPrice(estimatedServicePrice)} strong />
            </div>
          </CheckoutStepCard>

          <CheckoutStepCard
            className={getCheckoutStepOrderClassName("payment", isProviderProfileCheckout)}
            isActive={activeStepId === "payment"}
            isComplete={isStepComplete("payment")}
            onActivate={() => setActiveStepId("payment")}
            step={getCheckoutStepDefinition("payment", visibleCheckoutSteps)}
          >
            {isEmergencyFlow ? (
              <div className="rounded-lg border border-[rgba(255,138,0,0.22)] bg-[#fffdf9] p-4 shadow-[var(--shadow-card)]">
                <div className="grid gap-3 sm:grid-cols-2">
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
                              ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] text-[var(--brand-navy)] shadow-[var(--shadow-action)]"
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
            ) : (
              <div>
                <span className={labelClassName}>Hizmet seviyesi</span>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {standardBudgetOptions.map((option) => {
                    const isSelected = formState.budgetTag === option.value;

                    return (
                      <label
                        className={cn(
                          "flex min-h-24 cursor-pointer flex-col justify-between rounded-lg border bg-white p-4 transition-colors focus-within:ring-2 focus-within:ring-[var(--brand-orange)] focus-within:ring-offset-2",
                          isSelected
                            ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[var(--shadow-action)]"
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
                        <span className="text-sm font-extrabold text-[var(--brand-navy)]">
                          {option.label}
                        </span>
                        <span className="mt-3 text-xs font-semibold leading-5 text-[var(--muted)]">
                          Tahmini toplam bu seviyeye göre güncellenir.
                        </span>
                      </label>
                    );
                  })}
                </div>
                <FieldError id="budgetTag-error" message={errors.budgetTag} />
              </div>
            )}

            <div className="mt-5">
              <span className={labelClassName}>Ödeme yöntemi</span>
              <div className="mt-2 grid grid-cols-1 gap-3">
                {paymentOptions.map((option) => {
                  const isSelected = formState.paymentPreference === option.value;

                  return (
                    <label
                      className={cn(
                        "flex min-h-28 cursor-pointer flex-col justify-between rounded-lg border bg-white p-4 transition-colors focus-within:ring-2 focus-within:ring-[var(--brand-orange)] focus-within:ring-offset-2",
                        isSelected
                          ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[var(--shadow-action)] ring-2 ring-[rgba(255,138,0,0.14)]"
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
                      <span className="flex items-center gap-2 text-sm font-extrabold text-[var(--brand-navy)]">
                        <Wallet aria-hidden="true" className="size-4 text-[var(--brand-orange-dark)]" />
                        {option.label}
                        <span className="ml-auto rounded-md bg-white px-2 py-1 text-[0.68rem] font-bold uppercase text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.22)]">
                          Birincil
                        </span>
                      </span>
                      <span className="mt-3 text-xs font-semibold leading-5 text-[var(--muted)]">
                        {option.description}
                      </span>
                    </label>
                  );
                })}
              </div>
              <FieldError id="paymentPreference-error" message={errors.paymentPreference} />
            </div>
          </CheckoutStepCard>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-24 lg:h-fit">
          <OrderSummaryPanel
            addressSummary={selectedAddressSummary}
            couponCode={couponCode}
            couponDiscount={couponDiscount}
            couponFeedback={couponFeedback}
            dateSummary={selectedDateSummary}
            estimatedDuration={formatDuration(estimatedDurationMinutes)}
            estimatedPrice={estimatedServicePrice}
            extrasSummary={extrasSummary}
            isSubmitting={isSubmitting}
            onCouponChange={setCouponCode}
            paymentSummary={paymentSummary}
            selectedService={selectedService}
            selectedSubService={currentSubService}
            subtotal={subtotal}
            timeSummary={selectedTimeSummary}
            total={orderTotal}
          />
        </aside>
      </div>

      <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(10,37,64,0.12)] bg-white/95 px-4 py-3 shadow-[0_-18px_40px_rgba(10,37,64,0.12)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
              Total amount
            </p>
            <p className="truncate text-xl font-extrabold text-[var(--brand-navy)]">
              {formatPrice(orderTotal)}
            </p>
          </div>
          <Button
            className="min-h-12 shrink-0 rounded-lg px-5 text-sm font-extrabold"
            disabled={isSubmitting}
            type="submit"
            variant="premium"
          >
            {isSubmitting ? "Hazırlanıyor..." : "Online Ödeme"}
          </Button>
        </div>
      </div>
    </form>
  );
}
