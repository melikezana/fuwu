import type { ProviderApplicationInput } from "@/types/provider";
import {
  addRequiredTextIssue,
  commonValidationMessages,
  createValidationFailure,
  createValidationSuccess,
  isValidHttpUrl,
  isValidPhone,
  normalizeOptionalUrl,
  type ValidationIssue,
  type ValidationResult,
} from "./commonSchemas";
import { sanitizePhone } from "./phone";
import { sanitizeText } from "./text";

export type ProviderApplicationField =
  | "availability"
  | "categoryId"
  | "districtId"
  | "experienceYears"
  | "fullName"
  | "hasEquipment"
  | "introduction"
  | "phone"
  | "portfolioUrl"
  | "profileImagePath"
  | "profileImageUrl"
  | "verificationDocumentPath"
  | "verificationDocumentUrl";

const requiredProviderFields: Array<{
  field: Exclude<
    ProviderApplicationField,
    | "portfolioUrl"
    | "profileImagePath"
    | "profileImageUrl"
    | "verificationDocumentPath"
    | "verificationDocumentUrl"
  >;
  message: string;
}> = [
  { field: "fullName", message: "Ad soyad alanı zorunludur." },
  { field: "phone", message: "Telefon numarası zorunludur." },
  { field: "categoryId", message: "Hizmet kategorisi zorunludur." },
  { field: "districtId", message: "İlçe seçimi zorunludur." },
  { field: "experienceYears", message: "Deneyim yılı zorunludur." },
  { field: "availability", message: "Uygunluk alanı zorunludur." },
  { field: "hasEquipment", message: "Ekipman durumu zorunludur." },
  { field: "introduction", message: "Tanıtım alanı zorunludur." },
];

export function validateProviderApplicationInput(
  input: ProviderApplicationInput,
): ValidationResult<ProviderApplicationInput, ProviderApplicationField> {
  const sanitizedData: ProviderApplicationInput = {
    availability: sanitizeText(input.availability, 120),
    categoryId: sanitizeText(input.categoryId, 80),
    districtId: sanitizeText(input.districtId, 80),
    experienceYears: sanitizeText(input.experienceYears, 8),
    fullName: sanitizeText(input.fullName, 120),
    hasEquipment: sanitizeText(input.hasEquipment, 40),
    introduction: sanitizeText(input.introduction, 1500),
    phone: sanitizePhone(input.phone),
    portfolioUrl: normalizeOptionalUrl(input.portfolioUrl),
    profileImagePath: sanitizeText(input.profileImagePath ?? "", 500),
    profileImageUrl: normalizeOptionalUrl(input.profileImageUrl ?? ""),
    verificationDocumentPath: sanitizeText(
      input.verificationDocumentPath ?? "",
      500,
    ),
    verificationDocumentUrl: normalizeOptionalUrl(
      input.verificationDocumentUrl ?? "",
    ),
  };
  const issues: Array<ValidationIssue<ProviderApplicationField>> = [];

  requiredProviderFields.forEach(({ field, message }) => {
    addRequiredTextIssue(issues, field, sanitizedData[field], message);
  });

  if (sanitizedData.phone && !isValidPhone(sanitizedData.phone)) {
    issues.push({
      field: "phone",
      message: commonValidationMessages.phoneInvalid,
    });
  }

  if (
    sanitizedData.hasEquipment &&
    sanitizedData.hasEquipment !== "true" &&
    sanitizedData.hasEquipment !== "false"
  ) {
    issues.push({
      field: "hasEquipment",
      message: "Ekipman durumu için evet veya hayır seç.",
    });
  }

  const yearsOfExperience = Number(sanitizedData.experienceYears);

  if (
    sanitizedData.experienceYears &&
    (!Number.isFinite(yearsOfExperience) || yearsOfExperience < 0 || yearsOfExperience > 60)
  ) {
    issues.push({
      field: "experienceYears",
      message: "Deneyim yılı 0 ile 60 arasında olmalı.",
    });
  }

  if (sanitizedData.introduction && sanitizedData.introduction.length < 24) {
    issues.push({
      field: "introduction",
      message: commonValidationMessages.descriptionTooShort,
    });
  }

  if (sanitizedData.portfolioUrl && !isValidHttpUrl(sanitizedData.portfolioUrl)) {
    issues.push({
      field: "portfolioUrl",
      message: "Lütfen geçerli bir portfolyo bağlantısı gir veya alanı boş bırak.",
    });
  }

  if (
    sanitizedData.profileImageUrl &&
    !isValidHttpUrl(sanitizedData.profileImageUrl)
  ) {
    issues.push({
      field: "profileImageUrl",
      message: "Profil görseli bağlantısı geçerli değil.",
    });
  }

  if (
    sanitizedData.verificationDocumentUrl &&
    !isValidHttpUrl(sanitizedData.verificationDocumentUrl)
  ) {
    issues.push({
      field: "verificationDocumentUrl",
      message: "Belge bağlantısı geçerli değil.",
    });
  }

  if (issues.length > 0) {
    return createValidationFailure(issues);
  }

  return createValidationSuccess(sanitizedData);
}
