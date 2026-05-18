"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { appRoutes } from "@/lib/constants/navigation";
import { services } from "@/lib/constants/services";
import { getPublicErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { validateServiceRequestInput } from "@/lib/validations";
import { trackRequestCreated } from "@/services/analytics";
import {
  serviceRequestSubmitErrorMessage,
  submitServiceRequest,
  type ServiceRequestSubmitResult,
} from "@/services/requests";

type UrgencyLevel = "Esnek" | "Bu hafta" | "Acil";

type RequestFormState = {
  serviceCategory: string;
  district: string;
  fullAddress: string;
  urgencyLevel: UrgencyLevel | "";
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
  initialDistrict?: string;
  initialService?: string;
};

type RequestInitialFormProps = Pick<RequestFormProps, "initialDistrict" | "initialService">;

const initialFormState: RequestFormState = {
  serviceCategory: "",
  district: "",
  fullAddress: "",
  urgencyLevel: "",
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

const fieldBaseClassName =
  "mt-2 w-full min-w-0 rounded-md border border-[var(--border)] bg-white px-3.5 py-3 text-sm text-[var(--brand-navy)] outline-none transition-colors focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]";

const fieldClassName = `${fieldBaseClassName} cursor-text select-text placeholder:text-[var(--muted)]`;
const selectFieldClassName = `${fieldBaseClassName} min-h-12 cursor-pointer select-none pr-10`;

const labelClassName = "block cursor-default select-none text-sm font-bold text-[var(--brand-navy)]";
const helperClassName = "mt-1.5 cursor-default select-none text-xs leading-5 text-[var(--muted)]";
const errorClassName = "mt-2 cursor-default select-none text-sm font-bold text-red-600";
const sectionClassName = "cursor-default space-y-5 border-t border-[var(--border)] pt-6";
const serviceRequestSuccessMessage =
  "Talebin alındı. Uygun ustalarla eşleşme süreci başlayacak.";

function normalizeForm(values: RequestFormState): RequestFormState {
  return {
    serviceCategory: values.serviceCategory.trim(),
    district: values.district.trim(),
    fullAddress: values.fullAddress.trim(),
    urgencyLevel: values.urgencyLevel,
    preferredDate: values.preferredDate.trim(),
    preferredTimeRange: values.preferredTimeRange.trim(),
    fullName: values.fullName.trim(),
    phoneNumber: values.phoneNumber.trim(),
    shortDescription: values.shortDescription.trim(),
  };
}

function createInitialFormState({
  initialDistrict = "",
  initialService = "",
}: RequestInitialFormProps): RequestFormState {
  const matchedService = services.find(
    (service) => service.title.toLowerCase() === initialService.trim().toLowerCase(),
  );

  return {
    ...initialFormState,
    serviceCategory: matchedService ? `${matchedService.category} - ${matchedService.title}` : "",
    district: initialDistrict.trim(),
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

export function RequestForm({
  authenticatedUserId,
  initialDistrict,
  initialService,
}: RequestFormProps) {
  const [formState, setFormState] = useState<RequestFormState>(() =>
    createInitialFormState({ initialDistrict, initialService }),
  );
  const [errors, setErrors] = useState<RequestFormErrors>({});
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedRequest | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof RequestFormState, value: string) {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
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
      const result = await submitServiceRequest(normalizedRequest, authenticatedUserId);
      trackRequestCreated({
        category: normalizedRequest.serviceCategory,
        district: normalizedRequest.district,
        requestCode: result.requestCode,
        urgencyLevel: normalizedRequest.urgencyLevel,
      });
      setSubmittedRequest(result);
      setFormState(initialFormState);
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
            Talep özeti
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
            Bilgilerini gönder, uygun ustaya hazır ol.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Hizmet, konum, zamanlama ve notları tek yerde netleştir.
          </p>
          <p className="mt-3 rounded-md border border-[rgba(255,138,0,0.24)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
            Bu form şifre toplamaz. Talep bilgilerin giriş yapan hesabınla güvenli şekilde
            kaydedilir.
          </p>
        </div>

        {submittedRequest ? (
          <div
            aria-live="polite"
            className="cursor-default select-none overflow-hidden rounded-lg border border-[var(--brand-orange)] bg-[var(--brand-navy)] text-white shadow-[0_18px_50px_rgba(13,20,36,0.22)]"
          >
            <div className="h-1 bg-[var(--brand-orange)]" />
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-[var(--brand-orange)]">
                    Talep alındı
                  </p>
                  <h3 className="mt-2 text-2xl font-bold leading-tight">
                    Talebin alındı
                  </h3>
                </div>
                <div className="w-fit rounded-md bg-white px-3 py-2 text-xs font-bold text-[var(--brand-navy)]">
                  {submittedRequest.requestCode}
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/70">
                {serviceRequestSuccessMessage}
              </p>
              <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
                <div className="rounded-md bg-white/5 p-3">
                  <dt className="text-xs font-bold uppercase tracking-normal text-white/50">
                    Veri durumu
                  </dt>
                  <dd className="mt-1 text-sm font-bold">Kaydedildi</dd>
                </div>
                <div className="rounded-md bg-white/5 p-3">
                  <dt className="text-xs font-bold uppercase tracking-normal text-white/50">
                    Bağlantı
                  </dt>
                  <dd className="mt-1 text-sm font-bold">Supabase</dd>
                </div>
                <div className="rounded-md bg-white/5 p-3">
                  <dt className="text-xs font-bold uppercase tracking-normal text-white/50">
                    Kimlik
                  </dt>
                  <dd className="mt-1 text-sm font-bold">Giriş doğrulandı</dd>
                </div>
                <div className="rounded-md bg-white/5 p-3">
                  <dt className="text-xs font-bold uppercase tracking-normal text-white/50">
                    Durum
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-[var(--brand-orange)]">
                    Eşleşme bekliyor
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button className="w-full sm:w-fit" href={appRoutes.providers} variant="light">
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
          <p className="cursor-default select-none text-sm leading-6 text-[var(--muted)]">
            İhtiyacına en yakın hizmeti seç ve yeterli adres detayı ekle.
          </p>

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
              <p className={helperClassName} id="district-helper">
                İstanbul içindeki ilçe veya semti yaz.
              </p>
              <FieldError id="district-error" message={errors.district} />
            </div>

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
          </div>
        </fieldset>

        <fieldset className={sectionClassName}>
          <legend className="cursor-default select-none">
            <span className="block text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
              Adım 2
            </span>
            <span className="mt-1 block text-xl font-bold leading-tight text-[var(--brand-navy)]">
              Zamanlama
            </span>
          </legend>
          <p className="cursor-default select-none text-sm leading-6 text-[var(--muted)]">
            Ne kadar hızlı destek istediğini ve sana uygun zaman aralığını belirt.
          </p>

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
        </fieldset>

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

        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="cursor-default select-none text-sm leading-6 text-[var(--muted)]">
            Şifre talep edilmez; bilgiler yalnızca talep eşleşmesi için kullanılır.
          </p>
          <Button className="w-full sm:w-fit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Gönderiliyor..." : "Talebi Gönder"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
