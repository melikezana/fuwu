import {
  commonValidationMessages,
  createValidationFailure,
  createValidationSuccess,
  isValidEmail,
  type ValidationIssue,
  type ValidationResult,
} from "./commonSchemas";
import { sanitizeEmail } from "./text";

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
