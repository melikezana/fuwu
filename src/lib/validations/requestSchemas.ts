import type { ServiceRequestInput } from "@/types/request";
import {
  addRequiredTextIssue,
  commonValidationMessages,
  createValidationFailure,
  createValidationSuccess,
  isValidPhone,
  type ValidationIssue,
  type ValidationResult,
} from "./commonSchemas";
import { sanitizePhone } from "./phone";
import { sanitizeText } from "./text";

export type ServiceRequestField =
  | "approximateLocation"
  | "budgetTag"
  | "district"
  | "fullAddress"
  | "fullName"
  | "offeredPrice"
  | "paymentPreference"
  | "phoneNumber"
  | "preferredDate"
  | "preferredTimeRange"
  | "serviceCategory"
  | "shortDescription"
  | "urgencyLevel"
  | "urgencyType";

const requiredRequestFields: Array<{
  field: ServiceRequestField;
  message: string;
}> = [
  { field: "serviceCategory", message: "Hizmet kategorisi zorunludur." },
  { field: "district", message: "İlçe alanı zorunludur." },
  { field: "fullAddress", message: "Açık adres alanı zorunludur." },
  { field: "urgencyLevel", message: "Aciliyet alanı zorunludur." },
  { field: "preferredDate", message: "Tercih edilen tarih zorunludur." },
  { field: "preferredTimeRange", message: "Tercih edilen saat aralığı zorunludur." },
  { field: "fullName", message: "Ad soyad alanı zorunludur." },
  { field: "phoneNumber", message: "Telefon numarası zorunludur." },
  { field: "shortDescription", message: "Açıklama alanı zorunludur." },
];

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function validateServiceRequestInput(
  input: ServiceRequestInput,
): ValidationResult<ServiceRequestInput, ServiceRequestField> {
  const sanitizedData: ServiceRequestInput = {
    approximateLocation: sanitizeText(input.approximateLocation ?? "", 220),
    budgetTag: sanitizeText(input.budgetTag ?? "", 40),
    district: sanitizeText(input.district, 120),
    fullAddress: sanitizeText(input.fullAddress, 500),
    fullName: sanitizeText(input.fullName, 120),
    offeredPrice: typeof input.offeredPrice === "number" ? input.offeredPrice : undefined,
    paymentPreference: sanitizeText(input.paymentPreference ?? "", 40),
    phoneNumber: sanitizePhone(input.phoneNumber),
    preferredDate: sanitizeText(input.preferredDate, 30),
    preferredTimeRange: sanitizeText(input.preferredTimeRange, 80),
    serviceCategory: sanitizeText(input.serviceCategory, 220),
    shortDescription: sanitizeText(input.shortDescription, 1500),
    urgencyLevel: sanitizeText(input.urgencyLevel, 40),
    urgencyType: sanitizeText(input.urgencyType ?? "", 40),
  };
  const issues: Array<ValidationIssue<ServiceRequestField>> = [];
  const isEmergencyRequest =
    sanitizedData.urgencyType === "emergency" ||
    sanitizedData.budgetTag === "acil-hizmet";

  requiredRequestFields.forEach(({ field, message }) => {
    addRequiredTextIssue(issues, field, String(sanitizedData[field] ?? ""), message);
  });

  if (isEmergencyRequest) {
    addRequiredTextIssue(
      issues,
      "paymentPreference",
      sanitizedData.paymentPreference ?? "",
      "Ã–deme tercihi zorunludur.",
    );
    addRequiredTextIssue(
      issues,
      "offeredPrice" as any,
      sanitizedData.offeredPrice ? String(sanitizedData.offeredPrice) : "",
      "Teklif tutarı zorunludur.",
    );
  }

  if (sanitizedData.phoneNumber && !isValidPhone(sanitizedData.phoneNumber)) {
    issues.push({
      field: "phoneNumber",
      message: commonValidationMessages.phoneInvalid,
    });
  }

  if (sanitizedData.preferredDate && !isValidDateInput(sanitizedData.preferredDate)) {
    issues.push({
      field: "preferredDate",
      message: "Geçerli bir tarih seç.",
    });
  }

  if (sanitizedData.fullAddress && sanitizedData.fullAddress.length < 10) {
    issues.push({
      field: "fullAddress",
      message: "Açık adres çok kısa.",
    });
  }

  if (sanitizedData.shortDescription && sanitizedData.shortDescription.length < 12) {
    issues.push({
      field: "shortDescription",
      message: commonValidationMessages.descriptionTooShort,
    });
  }

  if (issues.length > 0) {
    return createValidationFailure(issues);
  }

  return createValidationSuccess(sanitizedData);
}
