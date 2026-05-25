import { sanitizePhone } from "./phone";
import { sanitizeEmail, sanitizeText } from "./text";

export type ValidationIssue<TField extends string = string> = {
  field: TField;
  message: string;
};

export type FieldValidationErrors<TField extends string = string> = Partial<
  Record<TField, string>
>;

export type ValidationResult<TData, TField extends string = string> =
  | {
      data: TData;
      fieldErrors: FieldValidationErrors<TField>;
      issues: [];
      ok: true;
    }
  | {
      data: null;
      fieldErrors: FieldValidationErrors<TField>;
      issues: Array<ValidationIssue<TField>>;
      message: string;
      ok: false;
    };

export const commonValidationMessages = {
  descriptionTooShort: "Açıklama çok kısa.",
  emailInvalid: "Lütfen geçerli bir e-posta adresi gir.",
  phoneInvalid: "Telefon numarası geçerli değil.",
  required: "Bu alan zorunludur.",
} as const;

export function createValidationSuccess<TData, TField extends string = string>(
  data: TData,
): ValidationResult<TData, TField> {
  return {
    data,
    fieldErrors: {},
    issues: [],
    ok: true,
  };
}

export function createValidationFailure<TField extends string>(
  issues: Array<ValidationIssue<TField>>,
  message = "Lütfen bilgileri kontrol edip tekrar dene.",
) {
  const fieldErrors = issues.reduce<FieldValidationErrors<TField>>((errors, issue) => {
    if (!errors[issue.field]) {
      errors[issue.field] = issue.message;
    }

    return errors;
  }, {});

  return {
    data: null,
    fieldErrors,
    issues,
    message,
    ok: false as const,
  };
}

export function addRequiredTextIssue<TField extends string>(
  issues: Array<ValidationIssue<TField>>,
  field: TField,
  value: string,
  message: string,
) {
  if (!sanitizeText(value).trim()) {
    issues.push({ field, message });
  }
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizeEmail(value));
}

export function isValidPhone(value: string) {
  const digits = sanitizePhone(value).replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 12;
}

export function isValidHttpUrl(value: string) {
  if (!value.trim()) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeOptionalUrl(value: string) {
  const sanitizedValue = sanitizeText(value, 300);

  if (!sanitizedValue || sanitizedValue.includes("://")) {
    return sanitizedValue;
  }

  return `https://${sanitizedValue}`;
}
