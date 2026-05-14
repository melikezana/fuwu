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
import { sanitizePhone, sanitizeText } from "./sanitize";

export type ProviderApplicationField =
  | "availability"
  | "fullName"
  | "hasEquipment"
  | "phoneNumber"
  | "profileImage"
  | "referenceLink"
  | "serviceArea"
  | "serviceCategory"
  | "shortIntroduction"
  | "whatsappNumber"
  | "yearsOfExperience";

const requiredProviderFields: Array<{
  field: Exclude<ProviderApplicationField, "profileImage" | "referenceLink">;
  message: string;
}> = [
  { field: "fullName", message: "Ad soyad alanı zorunludur." },
  { field: "phoneNumber", message: "Telefon numarası zorunludur." },
  { field: "whatsappNumber", message: "WhatsApp numarası zorunludur." },
  { field: "serviceCategory", message: "Hizmet kategorisi zorunludur." },
  { field: "serviceArea", message: "Hizmet bölgesi zorunludur." },
  { field: "yearsOfExperience", message: "Deneyim yılı zorunludur." },
  { field: "availability", message: "Uygunluk alanı zorunludur." },
  { field: "hasEquipment", message: "Ekipman durumu zorunludur." },
  { field: "shortIntroduction", message: "Açıklama alanı zorunludur." },
];

export function validateProviderApplicationInput(
  input: ProviderApplicationInput,
): ValidationResult<ProviderApplicationInput, ProviderApplicationField> {
  const sanitizedData: ProviderApplicationInput = {
    availability: sanitizeText(input.availability, 120),
    fullName: sanitizeText(input.fullName, 120),
    hasEquipment: sanitizeText(input.hasEquipment, 40),
    phoneNumber: sanitizePhone(input.phoneNumber),
    profileImage: input.profileImage ?? null,
    referenceLink: normalizeOptionalUrl(input.referenceLink),
    serviceArea: sanitizeText(input.serviceArea, 220),
    serviceCategory: sanitizeText(input.serviceCategory, 220),
    shortIntroduction: sanitizeText(input.shortIntroduction, 1500),
    whatsappNumber: sanitizePhone(input.whatsappNumber),
    yearsOfExperience: sanitizeText(input.yearsOfExperience, 8),
  };
  const issues: Array<ValidationIssue<ProviderApplicationField>> = [];

  requiredProviderFields.forEach(({ field, message }) => {
    addRequiredTextIssue(issues, field, sanitizedData[field], message);
  });

  if (sanitizedData.phoneNumber && !isValidPhone(sanitizedData.phoneNumber)) {
    issues.push({
      field: "phoneNumber",
      message: commonValidationMessages.phoneInvalid,
    });
  }

  if (sanitizedData.whatsappNumber && !isValidPhone(sanitizedData.whatsappNumber)) {
    issues.push({
      field: "whatsappNumber",
      message: "WhatsApp numarası geçerli değil.",
    });
  }

  const yearsOfExperience = Number(sanitizedData.yearsOfExperience);

  if (
    sanitizedData.yearsOfExperience &&
    (!Number.isFinite(yearsOfExperience) || yearsOfExperience < 0 || yearsOfExperience > 60)
  ) {
    issues.push({
      field: "yearsOfExperience",
      message: "Deneyim yılı 0 ile 60 arasında olmalı.",
    });
  }

  if (sanitizedData.shortIntroduction && sanitizedData.shortIntroduction.length < 24) {
    issues.push({
      field: "shortIntroduction",
      message: commonValidationMessages.descriptionTooShort,
    });
  }

  if (sanitizedData.referenceLink && !isValidHttpUrl(sanitizedData.referenceLink)) {
    issues.push({
      field: "referenceLink",
      message: "Lütfen geçerli bir bağlantı gir veya alanı boş bırak.",
    });
  }

  if (issues.length > 0) {
    return createValidationFailure(issues);
  }

  return createValidationSuccess(sanitizedData);
}
