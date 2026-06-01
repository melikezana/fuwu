import {
  commonValidationMessages,
  createValidationFailure,
  createValidationSuccess,
  isValidEmail,
  isValidPhone,
  type ValidationIssue,
  type ValidationResult,
} from "./commonSchemas";
import { sanitizeEmail } from "./text";
import { sanitizePhone } from "./phone";

export type LoginEmailField = "email";

export type LoginEmailInput = {
  email: string;
};

export function validateLoginEmailInput(
  email: string,
): ValidationResult<LoginEmailInput, LoginEmailField> {
  const sanitizedEmail = sanitizeEmail(email);
  const issues: Array<ValidationIssue<LoginEmailField>> = [];

  if (!sanitizedEmail) {
    issues.push({
      field: "email",
      message: "E-posta alanı zorunludur.",
    });
  } else if (!isValidEmail(sanitizedEmail)) {
    issues.push({
      field: "email",
      message: commonValidationMessages.emailInvalid,
    });
  }

  if (issues.length > 0) {
    return createValidationFailure(issues);
  }

  return createValidationSuccess({ email: sanitizedEmail });
}

export type LoginPhoneField = "phone";

export type LoginPhoneInput = {
  phone: string;
};

export function validateLoginPhoneInput(
  phone: string,
): ValidationResult<LoginPhoneInput, LoginPhoneField> {
  const sanitizedPhone = sanitizePhone(phone);
  const issues: Array<ValidationIssue<LoginPhoneField>> = [];

  if (!sanitizedPhone) {
    issues.push({
      field: "phone",
      message: "Telefon numarası zorunludur.",
    });
  } else if (!isValidPhone(sanitizedPhone)) {
    issues.push({
      field: "phone",
      message: commonValidationMessages.phoneInvalid,
    });
  }

  if (issues.length > 0) {
    return createValidationFailure(issues);
  }

  return createValidationSuccess({ phone: sanitizedPhone });
}

export type LoginOtpField = "otp";

export type LoginOtpInput = {
  otp: string;
};

export function validateLoginOtpInput(
  otp: string,
): ValidationResult<LoginOtpInput, LoginOtpField> {
  const sanitizedOtp = otp.trim();
  const issues: Array<ValidationIssue<LoginOtpField>> = [];

  if (!sanitizedOtp) {
    issues.push({
      field: "otp",
      message: "Giriş kodu zorunludur.",
    });
  } else if (sanitizedOtp.length !== 6 || !/^\d+$/.test(sanitizedOtp)) {
    issues.push({
      field: "otp",
      message: "Lütfen 6 haneli geçerli bir kod girin.",
    });
  }

  if (issues.length > 0) {
    return createValidationFailure(issues);
  }

  return createValidationSuccess({ otp: sanitizedOtp });
}
