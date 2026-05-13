"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { services } from "@/constants/services";
import { cn } from "@/lib/utils";
import {
  isProviderApplicationDemoMode,
  submitProviderApplication,
  type ProviderApplicationSubmitResult,
} from "@/services/providerApplications";
import {
  PROVIDER_IMAGE_ACCEPT,
  validateProviderImageFile,
} from "@/services/storage";

type Availability = "Tam zamanlı" | "Yarı zamanlı" | "Sadece hafta sonu";
type EquipmentStatus = "Evet" | "Hayır";

type ProviderApplicationFormState = {
  fullName: string;
  phoneNumber: string;
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
  serviceCategory: "",
  serviceArea: "",
  yearsOfExperience: "",
  availability: "",
  hasEquipment: "",
  shortIntroduction: "",
  referenceLink: "",
};

const fieldLabels: Record<ProviderField, string> = {
  fullName: "Ad soyad",
  phoneNumber: "Telefon numarası",
  serviceCategory: "Hizmet kategorisi",
  serviceArea: "İlçe / hizmet bölgesi",
  yearsOfExperience: "Deneyim yılı",
  availability: "Uygunluk",
  hasEquipment: "Ekipman durumu",
  shortIntroduction: "Açıklama",
  referenceLink: "Referans veya portfolyo bağlantısı",
};

const requiredFields: ProviderField[] = [
  "fullName",
  "phoneNumber",
  "serviceCategory",
  "serviceArea",
  "yearsOfExperience",
  "shortIntroduction",
];

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
  "mt-2 w-full min-w-0 rounded-md border border-[var(--border)] bg-white px-3.5 py-3 text-sm text-[var(--brand-navy)] outline-none transition-colors focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]";

const fieldClassName = `${fieldBaseClassName} cursor-text select-text placeholder:text-[var(--muted)]`;
const fileFieldClassName = `${fieldBaseClassName} cursor-pointer select-none file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-[var(--brand-orange)] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white`;
const selectFieldClassName = `${fieldBaseClassName} min-h-12 cursor-pointer select-none pr-10`;

const labelClassName = "block cursor-default select-none text-sm font-bold text-[var(--brand-navy)]";
const helperClassName = "mt-1.5 cursor-default select-none text-xs leading-5 text-[var(--muted)]";
const errorClassName = "mt-2 cursor-default select-none text-sm font-bold text-red-600";
const sectionClassName = "cursor-default space-y-5 border-t border-[var(--border)] pt-6";
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
  const errors: ProviderFormErrors = {};

  requiredFields.forEach((field) => {
    if (!values[field].trim()) {
      errors[field] = `Lütfen ${fieldLabels[field].toLocaleLowerCase("tr")} bilgisini girin.`;
    }
  });

  const phoneDigits = values.phoneNumber.replace(/\D/g, "");
  const yearsOfExperience = Number(values.yearsOfExperience);

  if (values.phoneNumber && phoneDigits.length < 10) {
    errors.phoneNumber = "Lütfen en az 10 haneli geçerli bir telefon numarası girin.";
  }

  if (
    values.yearsOfExperience &&
    (!Number.isFinite(yearsOfExperience) || yearsOfExperience < 0 || yearsOfExperience > 60)
  ) {
    errors.yearsOfExperience = "Lütfen 0 ile 60 yıl arasında gerçekçi bir deneyim süresi girin.";
  }

  if (values.shortIntroduction && values.shortIntroduction.length < 24) {
    errors.shortIntroduction = "Profilinin güven vermesi için birkaç detay daha ekle.";
  }

  if (values.referenceLink) {
    try {
      const url = new URL(values.referenceLink);

      if (!["http:", "https:"].includes(url.protocol)) {
        errors.referenceLink = "Lütfen geçerli bir web bağlantısı kullanın.";
      }
    } catch {
      errors.referenceLink = "Geçerli bir bağlantı girin veya alanı boş bırakın.";
    }
  }

  return errors;
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
    } catch {
      setSubmittedApplication(null);
      setFormError(submissionErrorMessage);
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
    <Card className="min-w-0">
      <form className="space-y-6" noValidate onSubmit={handleSubmit}>
        <div className="cursor-default select-none border-b border-[var(--border)] pb-5">
          <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
            Usta başvurusu
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
            Profilini oluştur, doğru müşteriye görünür ol.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Kategori, bölge, deneyim, uygunluk ve iletişim bilgilerini net şekilde paylaş.
          </p>
          <p className="mt-3 rounded-md border border-[rgba(255,138,0,0.24)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
            {isDemoSubmissionMode
              ? "Örnek mod: Supabase bağlantısı yokken form güvenli başarı yanıtı gösterir; gerçek özel bilgi veya hassas belge paylaşma."
              : "Başvuru bilgilerin şifre, ödeme bilgisi veya hassas belge istenmeden değerlendirme kuyruğuna gönderilir."}
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
            className="cursor-default select-none overflow-hidden rounded-lg border border-[var(--brand-orange)] bg-[var(--brand-navy)] text-white shadow-[0_22px_60px_rgba(13,20,36,0.26)]"
          >
            <div className="h-1 bg-[var(--brand-orange)]" />
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-[var(--brand-orange)]">
                    {submittedApplication.mode === "demo" ? "Örnek onay" : "Başvuru alındı"}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold leading-tight">
                    Başvurun alındı
                  </h3>
                </div>
                <div className="w-fit rounded-md bg-white px-3 py-2 text-xs font-bold text-[var(--brand-navy)]">
                  {submittedApplication.applicationCode}
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/70">{submissionSuccessMessage}</p>
              <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
                <div className="rounded-md bg-white/5 p-3">
                  <dt className="text-xs font-bold uppercase tracking-normal text-white/50">
                    Veri durumu
                  </dt>
                  <dd className="mt-1 text-sm font-bold">
                    {submittedApplication.mode === "demo" ? "Örnek onay" : "Başvuru kuyruğu"}
                  </dd>
                </div>
                <div className="rounded-md bg-white/5 p-3">
                  <dt className="text-xs font-bold uppercase tracking-normal text-white/50">
                    Bağlantı
                  </dt>
                  <dd className="mt-1 text-sm font-bold">
                    {submittedApplication.mode === "demo" ? "Örnek mod" : "Supabase"}
                  </dd>
                </div>
                <div className="rounded-md bg-white/5 p-3">
                  <dt className="text-xs font-bold uppercase tracking-normal text-white/50">
                    Kimlik
                  </dt>
                  <dd className="mt-1 text-sm font-bold">Giriş yapılmadı</dd>
                </div>
                <div className="rounded-md bg-white/5 p-3">
                  <dt className="text-xs font-bold uppercase tracking-normal text-white/50">
                    Durum
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-[var(--brand-orange)]">
                    Profil değerlendirmesi
                  </dd>
                </div>
                <div className="rounded-md bg-white/5 p-3">
                  <dt className="text-xs font-bold uppercase tracking-normal text-white/50">
                    Profil görseli
                  </dt>
                  <dd className="mt-1 text-sm font-bold">
                    {submittedApplication.profileImageStatus === "uploaded"
                      ? "Yüklendi"
                      : "Yüklenmedi"}
                  </dd>
                </div>
              </dl>
              <p className="mt-5 rounded-md border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/70">
                {submittedApplication.mode === "demo"
                  ? "Örnek modda güvenli başarı yanıtı gösterildi. Canlı kayıt için Supabase bağlantısı yapılandırıldığında başvuru değerlendirme kuyruğuna alınır."
                  : "Başvurun değerlendirme için alındı. Fuwu ekibi profili onayladıktan sonra yayın akışı başlar."}
              </p>
              {submittedApplication.profileImageMessage ? (
                <p className="mt-3 rounded-md border border-[rgba(255,138,0,0.28)] bg-white/5 p-4 text-sm font-bold leading-6 text-[var(--brand-orange)]">
                  {submittedApplication.profileImageMessage}
                </p>
              ) : null}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button className="w-full sm:w-fit" href="/" variant="light">
                  Ana Sayfaya Dön
                </Button>
                <Button className="w-full sm:w-fit" href="/providers" variant="secondary">
                  Usta Profillerini Gör
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <fieldset className="space-y-5">
          <legend className="cursor-default select-none">
            <span className="block text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
              Adım 1
            </span>
            <span className="mt-1 block text-xl font-bold leading-tight text-[var(--brand-navy)]">
              İletişim ve hizmet
            </span>
          </legend>
          <p className="cursor-default select-none text-sm leading-6 text-[var(--muted)]">
            Fuwu’da sunmak istediğin ana hizmeti ve iletişim bilgilerini paylaş.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
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
          </div>

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
        </fieldset>

        <fieldset className={sectionClassName}>
          <legend className="cursor-default select-none">
            <span className="block text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
              Adım 2
            </span>
            <span className="mt-1 block text-xl font-bold leading-tight text-[var(--brand-navy)]">
              Bölge ve hazırlık
            </span>
          </legend>
          <p className="cursor-default select-none text-sm leading-6 text-[var(--muted)]">
            Nerede çalışabileceğini, deneyimini ve ekipman durumunu netleştir.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
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
          </div>

          <div>
            <span className={labelClassName}>Uygunluk</span>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {availabilityOptions.map((option) => {
                const isSelected = formState.availability === option.value;

                return (
                  <label
                    className={cn(
                      "flex min-h-28 cursor-pointer flex-col justify-between rounded-md border bg-white p-4 transition-colors",
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
            <p className={helperClassName} id="providerHasEquipment-helper">
              Bu bilgi, müşteri beklentisini en baştan netleştirir.
            </p>
            <FieldError id="providerHasEquipment-error" message={errors.hasEquipment} />
          </div>
        </fieldset>

        <fieldset className={sectionClassName}>
          <legend className="cursor-default select-none">
            <span className="block text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
              Adım 3
            </span>
            <span className="mt-1 block text-xl font-bold leading-tight text-[var(--brand-navy)]">
              Profil anlatımı
            </span>
          </legend>
          <p className="cursor-default select-none text-sm leading-6 text-[var(--muted)]">
            Kısa, güçlü bir tanıtım ve varsa geçmiş iş örneklerini ekle.
          </p>

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
              className={cn(
                fileFieldClassName,
                errors.profileImage && "border-red-500 focus:border-red-500 focus:ring-red-100",
              )}
              id="providerProfileImage"
              key={profileImageInputKey}
              name="profileImage"
              onChange={updateProfileImage}
              type="file"
            />
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
        </fieldset>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="cursor-default select-none text-sm leading-6 text-[var(--muted)]">
            Bu başvuruda şifre, ödeme bilgisi veya hassas belge istenmez.
          </p>
          <Button className="w-full sm:w-fit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Başvuru gönderiliyor" : "Başvuruyu Gönder"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
