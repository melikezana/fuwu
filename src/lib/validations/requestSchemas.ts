import type { ServiceRequestInput } from "@/types/request";
import { isEmergencyPaymentPreference } from "@/services/payments";
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
  | "offerAmount"
  | "paymentPreference"
  | "phoneNumber"
  | "preferredDate"
  | "preferredTimeRange"
  | "serviceCategory"
  | "shortDescription"
  | "urgencyLevel"
  | "urgencyType";

const standardRequiredRequestFields: Array<{
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

const emergencyRequiredRequestFields: Array<{
  field: ServiceRequestField;
  message: string;
}> = [
  { field: "serviceCategory", message: "Hizmet kategorisi zorunludur." },
  { field: "district", message: "İlçe alanı zorunludur." },
  { field: "offerAmount", message: "Teklif tutarı zorunludur." },
  { field: "paymentPreference", message: "Ödeme tercihi zorunludur." },
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
    offerAmount: sanitizeText(input.offerAmount ?? "", 80),
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

  const requiredFields = isEmergencyRequest
    ? emergencyRequiredRequestFields
    : standardRequiredRequestFields;

  requiredFields.forEach(({ field, message }) => {
    addRequiredTextIssue(issues, field, sanitizedData[field] ?? "", message);
  });

  if (isEmergencyRequest) {
    if (
      sanitizedData.paymentPreference &&
      !isEmergencyPaymentPreference(sanitizedData.paymentPreference)
    ) {
      issues.push({
        field: "paymentPreference",
        message: "Acil hizmette ödeme tercihi Nakit veya IBAN olmalıdır.",
      });
    }

    const offeredPrice = Number(
      (sanitizedData.offerAmount ?? "")
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d.]/g, ""),
    );

    if (sanitizedData.offerAmount && (!Number.isFinite(offeredPrice) || offeredPrice <= 0)) {
      issues.push({
        field: "offerAmount",
        message: "Geçerli bir teklif tutarı seç.",
      });
    }
  }

  if (!isEmergencyRequest && sanitizedData.phoneNumber && !isValidPhone(sanitizedData.phoneNumber)) {
    issues.push({
      field: "phoneNumber",
      message: commonValidationMessages.phoneInvalid,
    });
  }

  if (!isEmergencyRequest && sanitizedData.preferredDate && !isValidDateInput(sanitizedData.preferredDate)) {
    issues.push({
      field: "preferredDate",
      message: "Geçerli bir tarih seç.",
    });
  }

  if (!isEmergencyRequest && sanitizedData.fullAddress && sanitizedData.fullAddress.length < 10) {
    issues.push({
      field: "fullAddress",
      message: "Açık adres çok kısa.",
    });
  }

  if (!isEmergencyRequest && sanitizedData.shortDescription && sanitizedData.shortDescription.length < 12) {
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
