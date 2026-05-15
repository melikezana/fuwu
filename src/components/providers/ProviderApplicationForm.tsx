"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { services } from "@/lib/constants/services";
import { getPublicErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { validateProviderApplicationInput } from "@/lib/validations";
import {
  isProviderApplicationDemoMode,
  submitProviderApplication,
  type ProviderApplicationSubmitResult,
} from "@/services/providers/applications";
import {
  PROVIDER_IMAGE_ACCEPT,
  validateProviderImageFile,
} from "@/services/storage";

type Availability = "Tam zamanlı" | "Yarı zamanlı" | "Sadece hafta sonu";
type EquipmentStatus = "Evet" | "Hayır";

type ProviderApplicationFormState = {
  fullName: string;
  phoneNumber: string;
  whatsappNumber: string;
  serviceCategory: string;
  serviceArea: string;
  yearsOfExperience: string;
  availability: Availability | "";
  hasEquipment: EquipmentStatus | "";
  shortIntroduction: string;
  referenceLink: string;
};

type ProviderField = keyof ProviderApplicationFormState;
type ProviderFormErrorField = ProviderField | "profileImage";
type ProviderFormErrors = Partial<Record<ProviderFormErrorField, string>>;
type SubmittedApplication = ProviderApplicationSubmitResult;

const initialFormState: ProviderApplicationFormState = {
  fullName: "",
  phoneNumber: "",
  whatsappNumber: "",
  serviceCategory: "",
  serviceArea: "",
  yearsOfExperience: "",
  availability: "",
  hasEquipment: "",
  shortIntroduction: "",
  referenceLink: "",
};

const availabilityOptions: Array<{
  value: Availability;
  description: string;
}> = [
  {
    value: "Tam zamanlı",
    description: "Hafta içi düzenli taleplere açığım.",
  },
  {
    value: "Yarı zamanlı",
    description: "Belirli gün ve saatlerde talep alabilirim.",
  },
  {
    value: "Sadece hafta sonu",
    description: "Hafta sonu taleplerine açığım.",
  },
];

const equipmentOptions: Array<{
  value: EquipmentStatus;
  description: string;
}> = [
  {
    value: "Evet",
    description: "Hizmet için gerekli temel ekipmanı getirebilirim.",
  },
  {
    value: "Hayır",
    description: "Müşteri malzemesi veya mevcut ekipmanla çalışırım.",
  },
];

const fieldBaseClassName =
  "mt-2 min-h-12 w-full min-w-0 rounded-md border border-[var(--border)] bg-white px-3.5 py-3 text-sm text-[var(--brand-navy)] outline-none transition-colors focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]";

const fieldClassName = `${fieldBaseClassName} cursor-text select-text placeholder:text-[var(--muted)]`;
const selectFieldClassName = `${fieldBaseClassName} h-12 cursor-pointer select-none py-0 pr-10`;

const labelClassName = "block cursor-default select-none text-sm font-bold text-[var(--brand-navy)]";
const helperClassName = "mt-1.5 cursor-default select-none text-xs leading-5 text-[var(--muted)]";
const errorClassName = "mt-2 cursor-default select-none text-sm font-bold text-red-600";
const sectionClassName =
  "rounded-lg border border-[var(--border)] bg-[#FAFAFB] p-4 sm:p-5";
const isDemoSubmissionMode = isProviderApplicationDemoMode();
const submissionSuccessMessage =
  "Başvurun alındı. Profilin incelendikten sonra Fuwu’da yayınlanacaktır.";
const submissionErrorMessage =
  "Başvuru şu anda gönderilemedi. Lütfen bilgilerini kontrol edip tekrar dene.";

function normalizeReferenceLink(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue.includes("://")) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

function normalizeForm(values: ProviderApplicationFormState): ProviderApplicationFormState {
  return {
    fullName: values.fullName.trim(),
    phoneNumber: values.phoneNumber.trim(),
    whatsappNumber: values.whatsappNumber.trim(),
    serviceCategory: values.serviceCategory.trim(),
    serviceArea: values.serviceArea.trim(),
    yearsOfExperience: values.yearsOfExperience.trim(),
    availability: values.availability,
    hasEquipment: values.hasEquipment,
    shortIntroduction: values.shortIntroduction.trim(),
    referenceLink: normalizeReferenceLink(values.referenceLink),
  };
}

function validateForm(values: ProviderApplicationFormState) {
  const validationResult = validateProviderApplicationInput({
    ...values,
    profileImage: null,
  });

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

function FormSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <fieldset className={sectionClassName}>
      <legend className="sr-only">{title}</legend>
      <div className="cursor-default select-none">
        <h3 className="text-lg font-bold leading-tight text-[var(--brand-navy)]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
      <div className="mt-5 grid gap-5">{children}</div>
    </fieldset>
  );
}

export function ProviderApplicationForm() {
  const [formState, setFormState] = useState<ProviderApplicationFormState>(initialFormState);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImageInputKey, setProfileImageInputKey] = useState(0);
  const [errors, setErrors] = useState<ProviderFormErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState<SubmittedApplication | null>(
    null,
  );

  function updateField(field: ProviderField, value: string) {
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
    setFormError("");
    setSubmittedApplication(null);
  }

  function updateProfileImage(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    const imageError = validateProviderImageFile(selectedFile);

    if (imageError) {
      setProfileImageFile(null);
      setErrors((currentErrors) => ({
        ...currentErrors,
        profileImage: imageError,
      }));
      event.target.value = "";
    } else {
      setProfileImageFile(selectedFile);
      setErrors((currentErrors) => {
        if (!currentErrors.profileImage) {
          return currentErrors;
        }

        const nextErrors = { ...currentErrors };
        delete nextErrors.profileImage;
        return nextErrors;
      });
    }

    setFormError("");
    setSubmittedApplication(null);
  }

  function clearProfileImage() {
    setProfileImageFile(null);
    setProfileImageInputKey((currentKey) => currentKey + 1);
    setErrors((currentErrors) => {
      if (!currentErrors.profileImage) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors.profileImage;
      return nextErrors;
    });
    setFormError("");
    setSubmittedApplication(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedApplication = normalizeForm(formState);
    const validationErrors = validateForm(normalizedApplication);
    const profileImageError = validateProviderImageFile(profileImageFile);

    if (profileImageError) {
      validationErrors.profileImage = profileImageError;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setFormError("");
      setSubmittedApplication(null);
      return;
    }

    setErrors({});
    setFormError("");
    setIsSubmitting(true);

    try {
      const submitResult = await submitProviderApplication({
        ...normalizedApplication,
        profileImage: profileImageFile,
      });
      setSubmittedApplication(submitResult);
      setFormState(initialFormState);
      setProfileImageFile(null);
      setProfileImageInputKey((currentKey) => currentKey + 1);
    } catch (error) {
      setSubmittedApplication(null);
      setFormError(getPublicErrorMessage(error, submissionErrorMessage));
    } finally {
      setIsSubmitting(false);
    }
  }

  function getFieldClassName(field: ProviderField) {
    return cn(
      fieldClassName,
      errors[field] && "border-red-500 focus:border-red-500 focus:ring-red-100",
    );
  }

  function getSelectFieldClassName(field: ProviderField) {
    return cn(
      selectFieldClassName,
      errors[field] && "border-red-500 focus:border-red-500 focus:ring-red-100",
    );
  }

  return (
    <Card className="min-w-0 overflow-hidden !p-0">
      <form className="space-y-6 p-4 sm:p-6" noValidate onSubmit={handleSubmit}>
        <div className="cursor-default select-none border-b border-[var(--border)] pb-5">
          <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
            Usta başvurusu
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
            Profilini oluştur, doğru müşteriye görünür ol.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Başvurun incelendikten sonra uygun profiller Fuwu’da yayınlanır.
          </p>
          <p className="mt-3 rounded-md border border-[rgba(255,138,0,0.24)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--brand-navy)]">
            {isDemoSubmissionMode
              ? "Örnek mod açık: Supabase bağlantısı yokken form güvenli başarı yanıtı gösterir."
              : "Şifre, ödeme bilgisi veya hassas belge istenmeden değerlendirme kuyruğuna gönderilir."}
          </p>
        </div>

        {formError ? (
          <p
            className="cursor-default select-none rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700"
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        {submittedApplication ? (
          <div
            aria-live="polite"
            className="cursor-default select-none rounded-lg border border-[rgba(255,138,0,0.34)] bg-white p-5 shadow-[0_18px_48px_rgba(13,20,36,0.08)]"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
                  {submittedApplication.mode === "demo" ? "Örnek onay" : "Başvuru alındı"}
                </p>
                <h3 className="mt-2 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
                  Başvurun alındı
                </h3>
              </div>
              <div className="w-fit rounded-md bg-[var(--brand-orange-soft)] px-3 py-2 text-xs font-bold text-[var(--brand-navy)]">
                {submittedApplication.applicationCode}
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              {submissionSuccessMessage}
            </p>
            <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-2">
              <div className="rounded-md bg-[#FAFAFB] p-3">
                <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                  Veri durumu
                </dt>
                <dd className="mt-1 text-sm font-bold text-[var(--brand-navy)]">
                  {submittedApplication.mode === "demo" ? "Örnek onay" : "Başvuru kuyruğu"}
                </dd>
              </div>
              <div className="rounded-md bg-[#FAFAFB] p-3">
                <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                  Bağlantı
                </dt>
                <dd className="mt-1 text-sm font-bold text-[var(--brand-navy)]">
                  {submittedApplication.mode === "demo" ? "Örnek mod" : "Supabase"}
                </dd>
              </div>
              <div className="rounded-md bg-[#FAFAFB] p-3">
                <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                  Durum
                </dt>
                <dd className="mt-1 text-sm font-bold text-[var(--brand-orange-dark)]">
                  Profil değerlendirmesi
                </dd>
              </div>
              <div className="rounded-md bg-[#FAFAFB] p-3">
                <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                  Profil görseli
                </dt>
                <dd className="mt-1 text-sm font-bold text-[var(--brand-navy)]">
                  {submittedApplication.profileImageStatus === "uploaded"
                    ? "Yüklendi"
                    : "Yüklenmedi"}
                </dd>
              </div>
            </dl>
            {submittedApplication.profileImageMessage ? (
              <p className="mt-3 rounded-md border border-[rgba(255,138,0,0.28)] bg-[var(--brand-orange-soft)] p-4 text-sm font-bold leading-6 text-[var(--brand-orange-dark)]">
                {submittedApplication.profileImageMessage}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button className="w-full sm:w-fit" href="/" variant="secondary">
                Ana Sayfaya Dön
              </Button>
              <Button className="w-full sm:w-fit" href="/providers">
                Usta Profillerini Gör
              </Button>
            </div>
          </div>
        ) : null}

        <FormSection
          description="Profilde görünecek temel adı ve isteğe bağlı profil görselini ekle."
          title="Temel Bilgiler"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="providerFullName">
                Ad soyad
              </label>
              <input
                aria-describedby={
                  errors.fullName ? "providerFullName-error" : "providerFullName-helper"
                }
                aria-invalid={Boolean(errors.fullName)}
                autoComplete="name"
                className={getFieldClassName("fullName")}
                id="providerFullName"
                name="fullName"
                onChange={(event) => updateField("fullName", event.target.value)}
                placeholder="Resmi adını veya iş adını yaz"
                required
                type="text"
                value={formState.fullName}
              />
              <p className={helperClassName} id="providerFullName-helper">
                Müşterilerin göreceği adı kullan.
              </p>
              <FieldError id="providerFullName-error" message={errors.fullName} />
            </div>

            <div>
              <label className={labelClassName} htmlFor="providerProfileImage">
                Profil görseli{" "}
                <span className="font-normal text-[var(--muted)]">(isteğe bağlı)</span>
              </label>
              <input
                accept={PROVIDER_IMAGE_ACCEPT}
                aria-describedby={
                  errors.profileImage ? "providerProfileImage-error" : "providerProfileImage-helper"
                }
                aria-invalid={Boolean(errors.profileImage)}
                className="sr-only"
                id="providerProfileImage"
                key={profileImageInputKey}
                name="profileImage"
                onChange={updateProfileImage}
                type="file"
              />
              <label
                className={cn(
                  "mt-2 inline-flex min-h-12 w-full cursor-pointer select-none items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm font-bold text-[var(--brand-navy)] transition-colors hover:border-[var(--brand-orange)] hover:bg-[var(--brand-orange-soft)] focus-within:border-[var(--brand-orange)]",
                  errors.profileImage && "border-red-500",
                )}
                htmlFor="providerProfileImage"
              >
                {profileImageFile ? "Görseli değiştir" : "Profil görseli seç"}
              </label>
              <p className={helperClassName} id="providerProfileImage-helper">
                JPG, JPEG, PNG veya WebP formatında; en fazla 3 MB.
              </p>
              {profileImageFile ? (
                <div className="mt-3 flex flex-col gap-3 rounded-md border border-[var(--border)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="min-w-0 break-words text-sm font-bold text-[var(--brand-navy)]">
                    {profileImageFile.name}
                  </p>
                  <button
                    className="w-fit cursor-pointer select-none text-sm font-bold text-[var(--brand-orange-dark)] hover:text-[var(--brand-navy)]"
                    onClick={clearProfileImage}
                    type="button"
                  >
                    Seçimi kaldır
                  </button>
                </div>
              ) : null}
              <FieldError id="providerProfileImage-error" message={errors.profileImage} />
            </div>
          </div>
        </FormSection>

        <FormSection
          description="Ana uzmanlığını ve düzenli hizmet verebileceğin ilçeleri belirt."
          title="Hizmet ve Bölge"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="providerServiceCategory">
                Hizmet kategorisi
              </label>
              <select
                aria-describedby={
                  errors.serviceCategory
                    ? "providerServiceCategory-error"
                    : "providerServiceCategory-helper"
                }
                aria-invalid={Boolean(errors.serviceCategory)}
                className={getSelectFieldClassName("serviceCategory")}
                id="providerServiceCategory"
                name="serviceCategory"
                onChange={(event) => updateField("serviceCategory", event.target.value)}
                required
                value={formState.serviceCategory}
              >
                <option value="">Ana uzmanlığını seç</option>
                {services.map((service) => (
                  <option key={service.id} value={`${service.category} - ${service.title}`}>
                    {service.category} - {service.title}
                  </option>
                ))}
              </select>
              <p className={helperClassName} id="providerServiceCategory-helper">
                En güçlü hizmetine en yakın kategoriyi seç.
              </p>
              <FieldError id="providerServiceCategory-error" message={errors.serviceCategory} />
            </div>

            <div>
              <label className={labelClassName} htmlFor="providerServiceArea">
                İlçe / hizmet bölgesi
              </label>
              <input
                aria-describedby={
                  errors.serviceArea ? "providerServiceArea-error" : "providerServiceArea-helper"
                }
                aria-invalid={Boolean(errors.serviceArea)}
                autoComplete="address-level2"
                className={getFieldClassName("serviceArea")}
                id="providerServiceArea"
                name="serviceArea"
                onChange={(event) => updateField("serviceArea", event.target.value)}
                placeholder="Örn. Kadıköy, Ataşehir, Üsküdar"
                required
                type="text"
                value={formState.serviceArea}
              />
              <p className={helperClassName} id="providerServiceArea-helper">
                Düzenli hizmet verebileceğin ilçe veya semtleri yaz.
              </p>
              <FieldError id="providerServiceArea-error" message={errors.serviceArea} />
            </div>
          </div>
        </FormSection>

        <FormSection
          description="Çalışma düzenini, deneyimini ve müşteriye nasıl hizmet verdiğini netleştir."
          title="Deneyim ve Açıklama"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="providerYearsOfExperience">
                Deneyim yılı
              </label>
              <input
                aria-describedby={
                  errors.yearsOfExperience
                    ? "providerYearsOfExperience-error"
                    : "providerYearsOfExperience-helper"
                }
                aria-invalid={Boolean(errors.yearsOfExperience)}
                className={getFieldClassName("yearsOfExperience")}
                id="providerYearsOfExperience"
                inputMode="numeric"
                max="60"
                min="0"
                name="yearsOfExperience"
                onChange={(event) => updateField("yearsOfExperience", event.target.value)}
                placeholder="Örn. 5"
                required
                type="number"
                value={formState.yearsOfExperience}
              />
              <p className={helperClassName} id="providerYearsOfExperience-helper">
                Yeni ama eğitimli ve hazırsan 0 yazabilirsin.
              </p>
              <FieldError
                id="providerYearsOfExperience-error"
                message={errors.yearsOfExperience}
              />
            </div>

            <div>
              <label className={labelClassName} htmlFor="providerReferenceLink">
                Referans veya portfolyo bağlantısı{" "}
                <span className="font-normal text-[var(--muted)]">(isteğe bağlı)</span>
              </label>
              <input
                aria-describedby={
                  errors.referenceLink
                    ? "providerReferenceLink-error"
                    : "providerReferenceLink-helper"
                }
                aria-invalid={Boolean(errors.referenceLink)}
                autoComplete="url"
                className={getFieldClassName("referenceLink")}
                id="providerReferenceLink"
                inputMode="url"
                name="referenceLink"
                onChange={(event) => updateField("referenceLink", event.target.value)}
                placeholder="instagram.com/isleriniz veya https://portfolyo.com"
                type="url"
                value={formState.referenceLink}
              />
              <p className={helperClassName} id="providerReferenceLink-helper">
                İşlerini gösteren web sitesi, sosyal profil veya referans sayfası ekleyebilirsin.
              </p>
              <FieldError id="providerReferenceLink-error" message={errors.referenceLink} />
            </div>
          </div>

          <div>
            <span className={labelClassName}>Uygunluk</span>
            <div className="mt-2 grid gap-3 lg:grid-cols-3">
              {availabilityOptions.map((option) => {
                const isSelected = formState.availability === option.value;

                return (
                  <label
                    className={cn(
                      "flex min-h-24 cursor-pointer flex-col justify-between rounded-md border bg-white p-4 transition-colors",
                      isSelected
                        ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[0_12px_28px_rgba(255,138,0,0.14)]"
                        : "border-[var(--border)] hover:border-[var(--brand-orange)]",
                      errors.availability && "border-red-500",
                    )}
                    key={option.value}
                  >
                    <input
                      aria-describedby={
                        errors.availability
                          ? "providerAvailability-error"
                          : "providerAvailability-helper"
                      }
                      checked={isSelected}
                      className="sr-only"
                      name="availability"
                      onChange={(event) => updateField("availability", event.target.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span className="select-none text-sm font-bold text-[var(--brand-navy)]">
                      {option.value}
                    </span>
                    <span className="mt-3 select-none text-xs leading-5 text-[var(--muted)]">
                      {option.description}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className={helperClassName} id="providerAvailability-helper">
              Normal çalışma düzenine en yakın seçeneği seç.
            </p>
            <FieldError id="providerAvailability-error" message={errors.availability} />
          </div>

          <div>
            <span className={labelClassName}>Ekipman durumu</span>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {equipmentOptions.map((option) => {
                const isSelected = formState.hasEquipment === option.value;

                return (
                  <label
                    className={cn(
                      "flex min-h-24 cursor-pointer flex-col justify-between rounded-md border bg-white p-4 transition-colors",
                      isSelected
                        ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[0_12px_28px_rgba(255,138,0,0.14)]"
                        : "border-[var(--border)] hover:border-[var(--brand-orange)]",
                      errors.hasEquipment && "border-red-500",
                    )}
                    key={option.value}
                  >
                    <input
                      aria-describedby={
                        errors.hasEquipment
                          ? "providerHasEquipment-error"
                          : "providerHasEquipment-helper"
                      }
                      checked={isSelected}
                      className="sr-only"
                      name="hasEquipment"
                      onChange={(event) => updateField("hasEquipment", event.target.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span className="select-none text-sm font-bold text-[var(--brand-navy)]">
                      {option.value}
                    </span>
                    <span className="mt-3 select-none text-xs leading-5 text-[var(--muted)]">
                      {option.description}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className={helperClassName} id="providerHasEquipment-helper">
              Bu bilgi, müşteri beklentisini en baştan netleştirir.
            </p>
            <FieldError id="providerHasEquipment-error" message={errors.hasEquipment} />
          </div>

          <div>
            <label className={labelClassName} htmlFor="providerShortIntroduction">
              Açıklama
            </label>
            <textarea
              aria-describedby={
                errors.shortIntroduction
                  ? "providerShortIntroduction-error"
                  : "providerShortIntroduction-helper"
              }
              aria-invalid={Boolean(errors.shortIntroduction)}
              className={`${getFieldClassName("shortIntroduction")} min-h-36 resize-y leading-6`}
              id="providerShortIntroduction"
              name="shortIntroduction"
              onChange={(event) => updateField("shortIntroduction", event.target.value)}
              placeholder="Hizmet standardını, uzmanlıklarını, müşteri yaklaşımını ve en iyi yaptığın işleri anlat."
              required
              value={formState.shortIntroduction}
            />
            <p className={helperClassName} id="providerShortIntroduction-helper">
              Uzmanlık, çalışma standardı veya hizmet verdiğin müşteri türlerini belirtebilirsin.
            </p>
            <FieldError id="providerShortIntroduction-error" message={errors.shortIntroduction} />
          </div>
        </FormSection>

        <FormSection
          description="Müşterilerin sana ulaşacağı aktif telefon ve WhatsApp bilgilerini paylaş."
          title="İletişim"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="providerPhone">
                Telefon numarası
              </label>
              <input
                aria-describedby={errors.phoneNumber ? "providerPhone-error" : "providerPhone-helper"}
                aria-invalid={Boolean(errors.phoneNumber)}
                autoComplete="tel"
                className={getFieldClassName("phoneNumber")}
                id="providerPhone"
                inputMode="tel"
                name="phoneNumber"
                onChange={(event) => updateField("phoneNumber", event.target.value)}
                placeholder="+90 5xx xxx xx xx"
                required
                type="tel"
                value={formState.phoneNumber}
              />
              <p className={helperClassName} id="providerPhone-helper">
                Hızlı dönüş için aktif bir numara yaz.
              </p>
              <FieldError id="providerPhone-error" message={errors.phoneNumber} />
            </div>

            <div>
              <label className={labelClassName} htmlFor="providerWhatsapp">
                WhatsApp numarası
              </label>
              <input
                aria-describedby={
                  errors.whatsappNumber ? "providerWhatsapp-error" : "providerWhatsapp-helper"
                }
                aria-invalid={Boolean(errors.whatsappNumber)}
                autoComplete="tel"
                className={getFieldClassName("whatsappNumber")}
                id="providerWhatsapp"
                inputMode="tel"
                name="whatsappNumber"
                onChange={(event) => updateField("whatsappNumber", event.target.value)}
                placeholder="+90 5xx xxx xx xx"
                required
                type="tel"
                value={formState.whatsappNumber}
              />
              <p className={helperClassName} id="providerWhatsapp-helper">
                Müşteri yazışmaları için kullandığın aktif WhatsApp numarasını yaz.
              </p>
              <FieldError id="providerWhatsapp-error" message={errors.whatsappNumber} />
            </div>
          </div>
        </FormSection>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="cursor-default select-none text-sm leading-6 text-[var(--muted)]">
            Başvurun incelendikten sonra uygun profiller Fuwu’da yayınlanır.
          </p>
          <Button className="w-full sm:w-fit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Başvuru gönderiliyor" : "Başvuruyu Gönder"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
