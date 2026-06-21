"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitProviderApplicationAction } from "@/app/provider-application/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getPublicErrorMessage } from "@/lib/errors";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { validateProviderApplicationInput } from "@/lib/validations";
import { trackProviderApplicationSubmitted } from "@/services/analytics";
import {
  PROVIDER_IMAGE_ACCEPT,
  PROVIDER_VERIFICATION_DOCUMENT_ACCEPT,
  uploadProviderProfileImage,
  uploadProviderVerificationDocument,
  validateProviderImageFile,
  validateProviderVerificationDocumentFile,
} from "@/services/storage";
import type {
  ProviderApplicationInput,
  ProviderApplicationOption,
  ProviderApplicationSubmitActionResult,
  ProviderApplicationSubmitResult,
} from "@/types/provider";

type Availability = "Tam zamanlı" | "Yarı zamanlı" | "Sadece hafta sonu";
type EquipmentStatus = "true" | "false";

type ProviderApplicationFormState = ProviderApplicationInput;
type ProviderField = keyof ProviderApplicationFormState;
type ProviderFormErrors = Partial<Record<ProviderField, string>>;
type SubmittedApplication = ProviderApplicationSubmitResult;
type ProviderApplicationSectionId = "basic" | "service" | "experience" | "contact";

type ProviderApplicationFormProps = {
  authenticatedUserId?: string | null;
  categories: ProviderApplicationOption[];
  districts: ProviderApplicationOption[];
  isConfigured: boolean;
  lookupError?: string | null;
};

const initialFormState: ProviderApplicationFormState = {
  availability: "",
  categoryId: "",
  districtId: "",
  experienceYears: "",
  fullName: "",
  hasEquipment: "",
  introduction: "",
  phone: "",
  portfolioUrl: "",
  profileImagePath: "",
  profileImageUrl: "",
  verificationDocumentPath: "",
  verificationDocumentUrl: "",
};

const pendingProviderApplicationStorageKey = "fuwu:pending-provider-application";

type StoredProviderApplication = {
  form: Pick<
    ProviderApplicationFormState,
    | "availability"
    | "categoryId"
    | "districtId"
    | "experienceYears"
    | "fullName"
    | "hasEquipment"
    | "introduction"
    | "phone"
    | "portfolioUrl"
  >;
  hadFiles: boolean;
};

function createStoredProviderApplication(
  form: ProviderApplicationFormState,
  hadFiles: boolean,
): StoredProviderApplication {
  return {
    form: {
      availability: form.availability,
      categoryId: form.categoryId,
      districtId: form.districtId,
      experienceYears: form.experienceYears,
      fullName: form.fullName,
      hasEquipment: form.hasEquipment,
      introduction: form.introduction,
      phone: form.phone,
      portfolioUrl: form.portfolioUrl,
    },
    hadFiles,
  };
}

function parseStoredProviderApplication(value: string): StoredProviderApplication | null {
  try {
    const storedValue = JSON.parse(value) as StoredProviderApplication;

    if (!storedValue || typeof storedValue !== "object" || !storedValue.form) {
      return null;
    }

    const formEntries = Object.values(storedValue.form);

    if (!formEntries.every((entry) => typeof entry === "string")) {
      return null;
    }

    const restoredApplication = {
      form: storedValue.form,
      hadFiles: storedValue.hadFiles === true,
    };
    const validationResult = validateProviderApplicationInput({
      ...initialFormState,
      ...restoredApplication.form,
    });

    return validationResult.ok ? restoredApplication : null;
  } catch {
    return null;
  }
}

const availabilityOptions: Array<{
  descriptionKey: TranslationKey;
  labelKey: TranslationKey;
  value: Availability;
}> = [
  {
    descriptionKey: "providerApplication.availability.fullDescription",
    labelKey: "providerApplication.availability.full",
    value: "Tam zamanlı",
  },
  {
    descriptionKey: "providerApplication.availability.partDescription",
    labelKey: "providerApplication.availability.part",
    value: "Yarı zamanlı",
  },
  {
    descriptionKey: "providerApplication.availability.weekendDescription",
    labelKey: "providerApplication.availability.weekend",
    value: "Sadece hafta sonu",
  },
];

const equipmentOptions: Array<{
  descriptionKey: TranslationKey;
  labelKey: TranslationKey;
  value: EquipmentStatus;
}> = [
  {
    descriptionKey: "providerApplication.equipment.yesDescription",
    labelKey: "providerApplication.yes",
    value: "true",
  },
  {
    descriptionKey: "providerApplication.equipment.noDescription",
    labelKey: "providerApplication.no",
    value: "false",
  },
];

const fieldBaseClassName =
  "mt-2 min-h-12 w-full min-w-0 rounded-md border border-[var(--border)] bg-white px-3.5 py-3 text-sm text-[var(--brand-navy)] outline-none transition-colors focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]";

const fieldClassName = `${fieldBaseClassName} cursor-text select-text placeholder:text-[var(--muted)]`;
const selectFieldClassName = `${fieldBaseClassName} h-12 cursor-pointer select-none py-0 pr-10`;

const labelClassName = "block cursor-default select-none text-sm font-semibold text-[var(--brand-navy)]";
const helperClassName = "mt-1.5 cursor-default select-none text-xs leading-5 text-[var(--muted)]";
const errorClassName = "mt-2 cursor-default select-none text-sm font-medium text-red-600";
const sectionClassName =
  "rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4 sm:p-5";
const sectionSteps: Record<ProviderApplicationSectionId, string> = {
  basic: "01",
  service: "02",
  experience: "03",
  contact: "04",
};

function normalizeReferenceLink(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue.includes("://")) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

function normalizeForm(values: ProviderApplicationFormState): ProviderApplicationFormState {
  return {
    availability: values.availability.trim(),
    categoryId: values.categoryId.trim(),
    districtId: values.districtId.trim(),
    experienceYears: values.experienceYears.trim(),
    fullName: values.fullName.trim(),
    hasEquipment: values.hasEquipment.trim(),
    introduction: values.introduction.trim(),
    phone: values.phone.trim(),
    portfolioUrl: normalizeReferenceLink(values.portfolioUrl),
    profileImagePath: values.profileImagePath?.trim(),
    profileImageUrl: values.profileImageUrl?.trim(),
    verificationDocumentPath: values.verificationDocumentPath?.trim(),
    verificationDocumentUrl: values.verificationDocumentUrl?.trim(),
  };
}

function validateForm(values: ProviderApplicationFormState) {
  const validationResult = validateProviderApplicationInput(values);

  return validationResult.ok ? {} : validationResult.fieldErrors;
}

function logSubmitFailure(result: ProviderApplicationSubmitActionResult) {
  if (result.ok || process.env.NODE_ENV === "production") {
    return;
  }

  console.error(
    "[Fuwu] Provider application submission failed.",
    result.message,
  );
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
  activeSection,
  children,
  description,
  id,
  setActiveSection,
  title,
}: {
  activeSection: ProviderApplicationSectionId;
  children: ReactNode;
  description: string;
  id: ProviderApplicationSectionId;
  setActiveSection: (section: ProviderApplicationSectionId) => void;
  title: string;
}) {
  const isOpen = activeSection === id;

  return (
    <fieldset className={sectionClassName}>
      <legend className="sr-only">{title}</legend>
      <button
        aria-expanded={isOpen}
        className="flex min-h-12 w-full cursor-pointer select-none items-center justify-between gap-3 rounded-md bg-white px-4 py-3 text-left text-sm font-semibold text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.12)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 md:hidden"
        onClick={() => setActiveSection(id)}
        type="button"
      >
        <span className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--brand-orange-dark)]">
            {sectionSteps[id]}
          </span>
          {title}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 transition-transform", isOpen ? "rotate-180" : "")}
        />
      </button>
      <div className="hidden cursor-default select-none md:block">
        <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">
          Adım {sectionSteps[id]}
        </p>
        <h3 className="mt-1 text-lg font-semibold leading-tight text-[var(--brand-navy)]">
          {title}
        </h3>
        <p className="mt-3 flex items-start gap-2 rounded-md border border-[rgba(23,116,95,0.18)] bg-[var(--trust-green-soft)] px-3 py-2.5 text-sm leading-6 text-[var(--trust-green)]">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{description}</span>
        </p>
      </div>
      {isOpen ? (
        <p className="mt-3 flex cursor-default select-none items-start gap-2 rounded-md border border-[rgba(23,116,95,0.18)] bg-[var(--trust-green-soft)] px-3 py-2.5 text-sm leading-6 text-[var(--trust-green)] md:hidden">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{description}</span>
        </p>
      ) : null}
      <div className={cn("mt-5 gap-5", isOpen ? "grid" : "hidden md:grid")}>{children}</div>
    </fieldset>
  );
}

export function ProviderApplicationForm({
  authenticatedUserId,
  categories,
  districts,
  isConfigured,
  lookupError = null,
}: ProviderApplicationFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [formState, setFormState] = useState<ProviderApplicationFormState>(initialFormState);
  const [activeSection, setActiveSection] = useState<ProviderApplicationSectionId>("basic");
  const [errors, setErrors] = useState<ProviderFormErrors>({});
  const [formError, setFormError] = useState("");
  const [restoreMessage, setRestoreMessage] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [verificationDocumentFile, setVerificationDocumentFile] =
    useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState<SubmittedApplication | null>(
    null,
  );
  const lookupsReady = isConfigured && categories.length > 0 && districts.length > 0;

  useEffect(() => {
    if (!authenticatedUserId) {
      return;
    }

    const storedValue = window.sessionStorage.getItem(
      pendingProviderApplicationStorageKey,
    );

    if (!storedValue) {
      return;
    }

    const restoredApplication = parseStoredProviderApplication(storedValue);
    window.sessionStorage.removeItem(pendingProviderApplicationStorageKey);

    if (!restoredApplication) {
      return;
    }

    const restoreTimeoutId = window.setTimeout(() => {
      setFormState({
        ...initialFormState,
        ...restoredApplication.form,
      });
      setRestoreMessage(
        restoredApplication.hadFiles
          ? "Bilgileriniz korundu. Lütfen belge/fotoğrafı tekrar seçin."
          : "Bilgileriniz korundu, devam edebilirsiniz.",
      );
    }, 0);

    return () => window.clearTimeout(restoreTimeoutId);
  }, [authenticatedUserId]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const normalizedApplication = normalizeForm(formState);
    const validationErrors = validateForm(normalizedApplication);
    const profileImageError = validateProviderImageFile(profileImageFile);
    const verificationDocumentError =
      validateProviderVerificationDocumentFile(verificationDocumentFile);

    if (!lookupsReady) {
      setFormError(lookupError ?? t("providerApplication.errorMessage"));
      return;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setFormError("");
      setSubmittedApplication(null);
      return;
    }

    if (profileImageError || verificationDocumentError) {
      setFormError(profileImageError ?? verificationDocumentError ?? "");
      setSubmittedApplication(null);
      return;
    }

    if (!authenticatedUserId) {
      window.sessionStorage.setItem(
        pendingProviderApplicationStorageKey,
        JSON.stringify(
          createStoredProviderApplication(
            normalizedApplication,
            Boolean(profileImageFile || verificationDocumentFile),
          ),
        ),
      );
      router.push("/login?next=/provider-application&restore=1");
      return;
    }

    setErrors({});
    setFormError("");
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();

      if ((profileImageFile || verificationDocumentFile) && !supabase) {
        setFormError("Dosya yükleme sistemi şu anda kullanılamıyor.");
        return;
      }

      const [profileImageResult, verificationDocumentResult] = supabase
        ? await Promise.all([
            uploadProviderProfileImage(supabase, profileImageFile),
            uploadProviderVerificationDocument(supabase, verificationDocumentFile),
          ])
        : [
            { path: null, publicUrl: null, status: "skipped" as const },
            { path: null, status: "skipped" as const },
          ];

      if (profileImageFile && profileImageResult.status !== "uploaded") {
        setFormError(
          profileImageResult.message ?? "Profil görseli yüklenemedi. Lütfen tekrar dene.",
        );
        return;
      }

      if (
        verificationDocumentFile &&
        verificationDocumentResult.status !== "uploaded"
      ) {
        setFormError(
          verificationDocumentResult.message ??
            "Kimlik/yeterlilik belgesi yüklenemedi. Lütfen tekrar dene.",
        );
        return;
      }

      const submitResult = await submitProviderApplicationAction({
        ...normalizedApplication,
        profileImagePath: profileImageResult.path ?? "",
        profileImageUrl:
          profileImageResult.status === "uploaded"
            ? profileImageResult.publicUrl ?? ""
            : "",
        verificationDocumentPath: verificationDocumentResult.path ?? "",
        verificationDocumentUrl: "",
      });

      if (!submitResult.ok) {
        logSubmitFailure(submitResult);
        setSubmittedApplication(null);

        if (submitResult.errorCode === "auth-required") {
          window.sessionStorage.setItem(
            pendingProviderApplicationStorageKey,
            JSON.stringify(
              createStoredProviderApplication(
                normalizedApplication,
                Boolean(profileImageFile || verificationDocumentFile),
              ),
            ),
          );
          router.push("/login?next=/provider-application&restore=1");
          return;
        }

        setFormError(submitResult.message);
        return;
      }

      trackProviderApplicationSubmitted({
        category: normalizedApplication.categoryId,
        mode: submitResult.result.mode,
        serviceArea: normalizedApplication.districtId,
      });
      setSubmittedApplication(submitResult.result);
      setFormState(initialFormState);
      setProfileImageFile(null);
      setVerificationDocumentFile(null);
      formElement.reset();
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[Fuwu] Provider application submission crashed.", error);
      }

      setSubmittedApplication(null);
      setFormError(getPublicErrorMessage(error, t("providerApplication.errorMessage")));
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
      <form
        className="space-y-6 p-4 sm:p-6"
        data-testid="provider-application-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="cursor-default select-none border-b border-[var(--border)] pb-5">
          <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
            {t("providerApplication.formEyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
            {t("providerApplication.formTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {t("providerApplication.reassurance")}
          </p>
          <p className="mt-3 rounded-md border border-[rgba(255,138,0,0.24)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--brand-navy)]">
            {isConfigured
              ? t("providerApplication.liveMode")
              : t("providerApplication.demoMode")}
          </p>
        </div>

        {lookupError ? (
          <p
            className="cursor-default select-none rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
            role="alert"
          >
            {lookupError}
          </p>
        ) : null}

        {formError ? (
          <p
            className="cursor-default select-none rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        {restoreMessage ? (
          <p
            className="cursor-default select-none rounded-md border border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] px-4 py-3 text-sm font-medium leading-6 text-[var(--trust-green)]"
            role="status"
          >
            {restoreMessage}
          </p>
        ) : null}

        {submittedApplication ? (
          <div
            aria-live="polite"
            className="cursor-default select-none rounded-lg border border-[rgba(255,138,0,0.34)] bg-white p-5 shadow-[var(--shadow-elevated)]"
            data-testid="provider-application-success"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
                  {t("providerApplication.successEyebrow")}
                </p>
                <h3 className="mt-2 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
                  {t("providerApplication.successTitle")}
                </h3>
              </div>
              <div className="w-fit rounded-md bg-[var(--brand-orange-soft)] px-3 py-2 text-xs font-bold text-[var(--brand-navy)]">
                {submittedApplication.applicationCode}
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              {t("providerApplication.successMessage")}
            </p>
            <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-2">
              <div className="rounded-md bg-[#FAFAFB] p-3">
                <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                  {t("providerApplication.dataStatus")}
                </dt>
                <dd className="mt-1 text-sm font-bold text-[var(--brand-navy)]">
                  {t("providerApplication.queue")}
                </dd>
              </div>
              <div className="rounded-md bg-[#FAFAFB] p-3">
                <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                  {t("providerApplication.connection")}
                </dt>
                <dd className="mt-1 text-sm font-bold text-[var(--brand-navy)]">Supabase</dd>
              </div>
              <div className="rounded-md bg-[#FAFAFB] p-3">
                <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                  {t("providerApplication.status")}
                </dt>
                <dd className="mt-1 text-sm font-bold text-[var(--brand-orange-dark)]">
                  {t("providerApplication.profileReview")}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button className="w-full sm:w-fit" href="/" variant="secondary">
                {t("providerApplication.home")}
              </Button>
              <Button className="w-full sm:w-fit" href="/provider-dashboard">
                Usta Paneline Git
              </Button>
            </div>
          </div>
        ) : null}

        <FormSection
          activeSection={activeSection}
          description={t("providerApplication.section.basicDescription")}
          id="basic"
          setActiveSection={setActiveSection}
          title={t("providerApplication.section.basic")}
        >
          <div>
            <label className={labelClassName} htmlFor="providerFullName">
              {t("providerApplication.fullName")}
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
              placeholder={t("providerApplication.fullNamePlaceholder")}
              required
              type="text"
              value={formState.fullName}
            />
            <p className={helperClassName} id="providerFullName-helper">
              {t("providerApplication.fullNameHelper")}
            </p>
            <FieldError id="providerFullName-error" message={errors.fullName} />
          </div>
        </FormSection>

        <FormSection
          activeSection={activeSection}
          description={t("providerApplication.section.serviceDescription")}
          id="service"
          setActiveSection={setActiveSection}
          title={t("providerApplication.section.service")}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="providerCategoryId">
                {t("providerApplication.serviceCategory")}
              </label>
              <select
                aria-describedby={
                  errors.categoryId ? "providerCategoryId-error" : "providerCategoryId-helper"
                }
                aria-invalid={Boolean(errors.categoryId)}
                className={getSelectFieldClassName("categoryId")}
                disabled={!lookupsReady}
                id="providerCategoryId"
                name="categoryId"
                onChange={(event) => updateField("categoryId", event.target.value)}
                required
                value={formState.categoryId}
              >
                <option value="">{t("providerApplication.servicePlaceholder")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <p className={helperClassName} id="providerCategoryId-helper">
                {t("providerApplication.serviceHelper")}
              </p>
              <FieldError id="providerCategoryId-error" message={errors.categoryId} />
            </div>

            <div>
              <label className={labelClassName} htmlFor="providerDistrictId">
                {t("providerApplication.serviceArea")}
              </label>
              <select
                aria-describedby={
                  errors.districtId ? "providerDistrictId-error" : "providerDistrictId-helper"
                }
                aria-invalid={Boolean(errors.districtId)}
                className={getSelectFieldClassName("districtId")}
                disabled={!lookupsReady}
                id="providerDistrictId"
                name="districtId"
                onChange={(event) => updateField("districtId", event.target.value)}
                required
                value={formState.districtId}
              >
                <option value="">{t("providerApplication.serviceAreaPlaceholder")}</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
              <p className={helperClassName} id="providerDistrictId-helper">
                {t("providerApplication.serviceAreaHelper")}
              </p>
              <FieldError id="providerDistrictId-error" message={errors.districtId} />
            </div>
          </div>
        </FormSection>

        <FormSection
          activeSection={activeSection}
          description={t("providerApplication.section.experienceDescription")}
          id="experience"
          setActiveSection={setActiveSection}
          title={t("providerApplication.section.experience")}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="providerExperienceYears">
                {t("providerApplication.years")}
              </label>
              <input
                aria-describedby={
                  errors.experienceYears
                    ? "providerExperienceYears-error"
                    : "providerExperienceYears-helper"
                }
                aria-invalid={Boolean(errors.experienceYears)}
                className={getFieldClassName("experienceYears")}
                id="providerExperienceYears"
                inputMode="numeric"
                max="60"
                min="0"
                name="experienceYears"
                onChange={(event) => updateField("experienceYears", event.target.value)}
                placeholder={t("providerApplication.yearsPlaceholder")}
                required
                type="number"
                value={formState.experienceYears}
              />
              <p className={helperClassName} id="providerExperienceYears-helper">
                {t("providerApplication.yearsHelper")}
              </p>
              <FieldError
                id="providerExperienceYears-error"
                message={errors.experienceYears}
              />
            </div>

            <div>
              <label className={labelClassName} htmlFor="providerPortfolioUrl">
                {t("providerApplication.reference")}{" "}
                <span className="font-normal text-[var(--muted)]">
                  ({t("providerApplication.optional")})
                </span>
              </label>
              <input
                aria-describedby={
                  errors.portfolioUrl
                    ? "providerPortfolioUrl-error"
                    : "providerPortfolioUrl-helper"
                }
                aria-invalid={Boolean(errors.portfolioUrl)}
                autoComplete="url"
                className={getFieldClassName("portfolioUrl")}
                id="providerPortfolioUrl"
                inputMode="url"
                name="portfolioUrl"
                onChange={(event) => updateField("portfolioUrl", event.target.value)}
                placeholder={t("providerApplication.referencePlaceholder")}
                type="url"
                value={formState.portfolioUrl}
              />
              <p className={helperClassName} id="providerPortfolioUrl-helper">
                {t("providerApplication.referenceHelper")}
              </p>
              <FieldError id="providerPortfolioUrl-error" message={errors.portfolioUrl} />
            </div>
          </div>

          <div>
            <span className={labelClassName}>{t("providerApplication.availability")}</span>
            <div className="mt-2 grid gap-3 lg:grid-cols-3">
              {availabilityOptions.map((option) => {
                const isSelected = formState.availability === option.value;

                return (
                  <label
                    className={cn(
                      "flex min-h-24 cursor-pointer flex-col justify-between rounded-md border bg-white p-4 transition-colors focus-within:ring-2 focus-within:ring-[var(--brand-orange)] focus-within:ring-offset-2",
                      isSelected
                        ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[var(--shadow-action)]"
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
                    <span className="select-none text-sm font-semibold text-[var(--brand-navy)]">
                      {t(option.labelKey)}
                    </span>
                    <span className="mt-3 select-none text-xs leading-5 text-[var(--muted)]">
                      {t(option.descriptionKey)}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className={helperClassName} id="providerAvailability-helper">
              {t("providerApplication.availabilityHelper")}
            </p>
            <FieldError id="providerAvailability-error" message={errors.availability} />
          </div>

          <div>
            <span className={labelClassName}>{t("providerApplication.equipment")}</span>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {equipmentOptions.map((option) => {
                const isSelected = formState.hasEquipment === option.value;

                return (
                  <label
                    className={cn(
                      "flex min-h-24 cursor-pointer flex-col justify-between rounded-md border bg-white p-4 transition-colors focus-within:ring-2 focus-within:ring-[var(--brand-orange)] focus-within:ring-offset-2",
                      isSelected
                        ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[var(--shadow-action)]"
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
                    <span className="select-none text-sm font-semibold text-[var(--brand-navy)]">
                      {t(option.labelKey)}
                    </span>
                    <span className="mt-3 select-none text-xs leading-5 text-[var(--muted)]">
                      {t(option.descriptionKey)}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className={helperClassName} id="providerHasEquipment-helper">
              {t("providerApplication.equipmentHelper")}
            </p>
            <FieldError id="providerHasEquipment-error" message={errors.hasEquipment} />
          </div>

          <div>
            <label className={labelClassName} htmlFor="providerIntroduction">
              {t("providerApplication.description")}
            </label>
            <textarea
              aria-describedby={
                errors.introduction
                  ? "providerIntroduction-error"
                  : "providerIntroduction-helper"
              }
              aria-invalid={Boolean(errors.introduction)}
              className={`${getFieldClassName("introduction")} min-h-36 resize-y leading-6`}
              id="providerIntroduction"
              name="introduction"
              onChange={(event) => updateField("introduction", event.target.value)}
              placeholder={t("providerApplication.descriptionPlaceholder")}
              required
              value={formState.introduction}
            />
            <p className={helperClassName} id="providerIntroduction-helper">
              {t("providerApplication.descriptionHelper")}
            </p>
            <FieldError id="providerIntroduction-error" message={errors.introduction} />
          </div>
        </FormSection>

        <FormSection
          activeSection={activeSection}
          description={t("providerApplication.section.contactDescription")}
          id="contact"
          setActiveSection={setActiveSection}
          title={t("providerApplication.section.contact")}
        >
          <div>
            <label className={labelClassName} htmlFor="providerPhone">
              {t("providerApplication.phone")}
            </label>
            <input
              aria-describedby={errors.phone ? "providerPhone-error" : "providerPhone-helper"}
              aria-invalid={Boolean(errors.phone)}
              autoComplete="tel"
              className={getFieldClassName("phone")}
              id="providerPhone"
              inputMode="tel"
              name="phone"
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder={t("providerApplication.phonePlaceholder")}
              required
              type="tel"
              value={formState.phone}
            />
            <p className={helperClassName} id="providerPhone-helper">
              {t("providerApplication.phoneHelper")}
            </p>
            <FieldError id="providerPhone-error" message={errors.phone} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="providerProfileImage">
                Profil Fotoğrafı{" "}
                <span className="font-normal text-[var(--muted)]">(opsiyonel)</span>
              </label>
              <input
                accept={PROVIDER_IMAGE_ACCEPT}
                className={`${fieldBaseClassName} cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-[var(--brand-orange-soft)] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[var(--brand-navy)]`}
                id="providerProfileImage"
                name="profileImage"
                onChange={(event) => {
                  setProfileImageFile(event.target.files?.[0] ?? null);
                  setFormError("");
                }}
                type="file"
              />
              <p className={helperClassName}>
                JPG, PNG veya WebP. En fazla 3 MB.
              </p>
            </div>

            <div>
              <label
                className={labelClassName}
                htmlFor="providerVerificationDocument"
              >
                Kimlik/Yeterlilik Belgesi{" "}
                <span className="font-normal text-[var(--muted)]">(opsiyonel)</span>
              </label>
              <input
                accept={PROVIDER_VERIFICATION_DOCUMENT_ACCEPT}
                className={`${fieldBaseClassName} cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-[var(--brand-orange-soft)] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[var(--brand-navy)]`}
                id="providerVerificationDocument"
                name="verificationDocument"
                onChange={(event) => {
                  setVerificationDocumentFile(event.target.files?.[0] ?? null);
                  setFormError("");
                }}
                type="file"
              />
              <p className={helperClassName}>
                PDF, JPG veya PNG. En fazla 5 MB; yalnızca sen ve adminler görebilir.
              </p>
            </div>
          </div>
        </FormSection>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="cursor-default select-none text-sm leading-6 text-[var(--muted)]">
            {t("providerApplication.reassurance")}
          </p>
          <Button className="w-full sm:w-fit" disabled={isSubmitting || !lookupsReady} type="submit">
            {isSubmitting ? t("providerApplication.submitting") : t("providerApplication.submit")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
