"use client";

import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { createEmergencyRequestAction } from "@/app/request/actions";
import { appRoutes } from "@/lib/constants/navigation";
import { providerDistricts } from "@/lib/constants/providers";
import {
  normalizeServiceValue,
  serviceCategories,
  type Service,
} from "@/lib/constants/services";
import { getPublicErrorMessage } from "@/lib/errors";
import {
  getEmergencyPriceOptions,
  getEmergencyPriceRange,
  validateEmergencyPrice,
} from "@/services/matching";
import {
  getPaymentPreferenceLabel,
  type ServiceRequestPaymentPreference,
} from "@/services/payments";
import type { ProviderFilterOptions } from "@/services/providers";
import type { ServiceRequestSubmitResult } from "@/services/requests";

export type EmergencyStep = "service" | "district" | "price" | "payment" | "submit";

export function formatHeroPrice(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Teklif seç";
  }

  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value)} TL`;
}

export function formatProviderNotificationCount(value: number | null | undefined) {
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

export function useHeroFilters(filterOptions: ProviderFilterOptions) {
  const router = useRouter();
  const emergencyServices = serviceCategories;
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
  const selectedServiceLabel = selectedService?.title ?? "";
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

  function goToStep(step: EmergencyStep) {
    setSubmitError(null);

    if (step === "district") {
      setDistrictSearch("");
      setHighlightedDistrictIndex(0);
    }

    setActiveStep(step);
  }

  function handleServiceSelect(service: Service) {
    setSelectedServiceId(service.id);
    setDistrict("");
    setDistrictSearch("");
    setHighlightedDistrictIndex(0);
    setOfferedPrice(null);
    setPriceInputValue("");
    setPaymentPreference("");
    setSubmitError(null);
    setActiveStep("district");
  }

  function handleDistrictSearchChange(value: string) {
    setDistrictSearch(value);
    setHighlightedDistrictIndex(0);

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
    setHighlightedDistrictIndex(0);
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
      setHighlightedDistrictIndex(0);
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
      const response = await createEmergencyRequestAction({
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
      });

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
          value: formatHeroPrice(offeredPrice),
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

  return {
    activeStep,
    completedStepPills,
    district,
    districtSearch,
    emergencyServices,
    filteredDistrictOptions,
    handleDistrictKeyDown,
    handleDistrictSearchChange,
    handleDistrictSelect,
    handleManualPriceContinue,
    handlePaymentSelect,
    handlePriceInputChange,
    handlePriceSelect,
    handleServiceSelect,
    handleSubmit,
    highlightedDistrictIndex,
    isReadyToSubmit,
    isSubmitting,
    offeredPrice,
    paymentPreference,
    priceError,
    priceInputValue,
    priceOptions,
    priceRange,
    requestHref,
    selectedServiceId,
    selectedServiceLabel,
    setHighlightedDistrictIndex,
    submitError,
    submittedRequest,
  };
}
