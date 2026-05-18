"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { services } from "@/lib/constants/services";
import { getPublicErrorMessage } from "@/lib/errors";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { validateProviderApplicationInput } from "@/lib/validations";
import { trackProviderApplicationSubmitted } from "@/services/analytics";
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
type ProviderApplicationSectionId = "basic" | "service" | "experience" | "contact";

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
    value: "Evet",
  },
  {
    descriptionKey: "providerApplication.equipment.noDescription",
    labelKey: "providerApplication.no",
    value: "Hayır",
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
        className="flex min-h-12 w-full cursor-pointer select-none items-center justify-between gap-3 rounded-md bg-white px-4 py-3 text-left text-sm font-black text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.12)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 md:hidden"
        onClick={() => setActiveSection(id)}
        type="button"
      >
        <span>{title}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 transition-transform", isOpen ? "rotate-180" : "")}
        />
      </button>
      <div className="hidden cursor-default select-none md:block">
        <h3 className="text-lg font-bold leading-tight text-[var(--brand-navy)]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
      {isOpen ? (
        <p className="mt-3 cursor-default select-none text-sm leading-6 text-[var(--muted)] md:hidden">
          {description}
        </p>
      ) : null}
      <div className={cn("mt-5 gap-5", isOpen ? "grid" : "hidden md:grid")}>{children}</div>
    </fieldset>
  );
}

export function ProviderApplicationForm() {
  const { t } = useI18n();
  const [formState, setFormState] = useState<ProviderApplicationFormState>(initialFormState);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImageInputKey, setProfileImageInputKey] = useState(0);
  const [activeSection, setActiveSection] = useState<ProviderApplicationSectionId>("basic");
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
      trackProviderApplicationSubmitted({
        category: normalizedApplication.serviceCategory,
        mode: submitResult.mode,
        serviceArea: normalizedApplication.serviceArea,
      });
      setSubmittedApplication(submitResult);
      setFormState(initialFormState);
      setProfileImageFile(null);
      setProfileImageInputKey((currentKey) => currentKey + 1);
    } catch (error) {
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
      <form className="space-y-6 p-4 sm:p-6" noValidate onSubmit={handleSubmit}>
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
            {isDemoSubmissionMode
              ? t("providerApplication.demoMode")
              : t("providerApplication.liveMode")}
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
                  {submittedApplication.mode === "demo"
                    ? t("providerApplication.demoSuccessEyebrow")
                    : t("providerApplication.successEyebrow")}
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
                  {submittedApplication.mode === "demo"
                    ? t("providerApplication.demoApproval")
                    : t("providerApplication.queue")}
                </dd>
              </div>
              <div className="rounded-md bg-[#FAFAFB] p-3">
                <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                  {t("providerApplication.connection")}
                </dt>
                <dd className="mt-1 text-sm font-bold text-[var(--brand-navy)]">
                  {submittedApplication.mode === "demo"
                    ? t("providerApplication.demoModeLabel")
                    : "Supabase"}
                </dd>
              </div>
              <div className="rounded-md bg-[#FAFAFB] p-3">
                <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                  {t("providerApplication.status")}
                </dt>
                <dd className="mt-1 text-sm font-bold text-[var(--brand-orange-dark)]">
                  {t("providerApplication.profileReview")}
                </dd>
              </div>
              <div className="rounded-md bg-[#FAFAFB] p-3">
                <dt className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                  {t("providerApplication.profileImageStatus")}
                </dt>
                <dd className="mt-1 text-sm font-bold text-[var(--brand-navy)]">
                  {submittedApplication.profileImageStatus === "uploaded"
                    ? t("providerApplication.uploaded")
                    : t("providerApplication.notUploaded")}
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
                {t("providerApplication.home")}
              </Button>
              <Button className="w-full sm:w-fit" href="/providers">
                {t("providerApplication.viewProfiles")}
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
          <div className="grid gap-5 lg:grid-cols-2">
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

            <div>
              <label className={labelClassName} htmlFor="providerProfileImage">
                {t("providerApplication.profileImage")}{" "}
                <span className="font-normal text-[var(--muted)]">
                  ({t("providerApplication.optional")})
                </span>
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
                {profileImageFile
                  ? t("providerApplication.changeImage")
                  : t("providerApplication.chooseImage")}
              </label>
              <p className={helperClassName} id="providerProfileImage-helper">
                {t("providerApplication.imageHelper")}
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
                    {t("providerApplication.removeSelection")}
                  </button>
                </div>
              ) : null}
              <FieldError id="providerProfileImage-error" message={errors.profileImage} />
            </div>
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
              <label className={labelClassName} htmlFor="providerServiceCategory">
                {t("providerApplication.serviceCategory")}
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
                <option value="">{t("providerApplication.servicePlaceholder")}</option>
                {services.map((service) => (
                  <option key={service.id} value={`${service.category} - ${service.title}`}>
                    {service.category} - {service.title}
                  </option>
                ))}
              </select>
              <p className={helperClassName} id="providerServiceCategory-helper">
                {t("providerApplication.serviceHelper")}
              </p>
              <FieldError id="providerServiceCategory-error" message={errors.serviceCategory} />
            </div>

            <div>
              <label className={labelClassName} htmlFor="providerServiceArea">
                {t("providerApplication.serviceArea")}
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
                placeholder={t("providerApplication.serviceAreaPlaceholder")}
                required
                type="text"
                value={formState.serviceArea}
              />
              <p className={helperClassName} id="providerServiceArea-helper">
                {t("providerApplication.serviceAreaHelper")}
              </p>
              <FieldError id="providerServiceArea-error" message={errors.serviceArea} />
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
              <label className={labelClassName} htmlFor="providerYearsOfExperience">
                {t("providerApplication.years")}
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
                placeholder={t("providerApplication.yearsPlaceholder")}
                required
                type="number"
                value={formState.yearsOfExperience}
              />
              <p className={helperClassName} id="providerYearsOfExperience-helper">
                {t("providerApplication.yearsHelper")}
              </p>
              <FieldError
                id="providerYearsOfExperience-error"
                message={errors.yearsOfExperience}
              />
            </div>

            <div>
              <label className={labelClassName} htmlFor="providerReferenceLink">
                {t("providerApplication.reference")}{" "}
                <span className="font-normal text-[var(--muted)]">
                  ({t("providerApplication.optional")})
                </span>
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
                placeholder={t("providerApplication.referencePlaceholder")}
                type="url"
                value={formState.referenceLink}
              />
              <p className={helperClassName} id="providerReferenceLink-helper">
                {t("providerApplication.referenceHelper")}
              </p>
              <FieldError id="providerReferenceLink-error" message={errors.referenceLink} />
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
            <label className={labelClassName} htmlFor="providerShortIntroduction">
              {t("providerApplication.description")}
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
              placeholder={t("providerApplication.descriptionPlaceholder")}
              required
              value={formState.shortIntroduction}
            />
            <p className={helperClassName} id="providerShortIntroduction-helper">
              {t("providerApplication.descriptionHelper")}
            </p>
            <FieldError id="providerShortIntroduction-error" message={errors.shortIntroduction} />
          </div>
        </FormSection>

        <FormSection
          activeSection={activeSection}
          description={t("providerApplication.section.contactDescription")}
          id="contact"
          setActiveSection={setActiveSection}
          title={t("providerApplication.section.contact")}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="providerPhone">
                {t("providerApplication.phone")}
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
                placeholder={t("providerApplication.phonePlaceholder")}
                required
                type="tel"
                value={formState.phoneNumber}
              />
              <p className={helperClassName} id="providerPhone-helper">
                {t("providerApplication.phoneHelper")}
              </p>
              <FieldError id="providerPhone-error" message={errors.phoneNumber} />
            </div>

            <div>
              <label className={labelClassName} htmlFor="providerWhatsapp">
                {t("providerApplication.whatsapp")}
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
                placeholder={t("providerApplication.phonePlaceholder")}
                required
                type="tel"
                value={formState.whatsappNumber}
              />
              <p className={helperClassName} id="providerWhatsapp-helper">
                {t("providerApplication.whatsappHelper")}
              </p>
              <FieldError id="providerWhatsapp-error" message={errors.whatsappNumber} />
            </div>
          </div>
        </FormSection>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="cursor-default select-none text-sm leading-6 text-[var(--muted)]">
            {t("providerApplication.reassurance")}
          </p>
          <Button className="w-full sm:w-fit" disabled={isSubmitting} type="submit">
            {isSubmitting ? t("providerApplication.submitting") : t("providerApplication.submit")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
