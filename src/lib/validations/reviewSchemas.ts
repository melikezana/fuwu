import {
  commonValidationMessages,
  createValidationFailure,
  createValidationSuccess,
  type ValidationIssue,
  type ValidationResult,
} from "./commonSchemas";
import { sanitizeText } from "./sanitize";

export type ReviewField = "comment" | "rating";

export type ReviewInput = {
  comment: string;
  rating: number;
};

export function validateReviewInput(
  input: ReviewInput,
): ValidationResult<ReviewInput, ReviewField> {
  const sanitizedData: ReviewInput = {
    comment: sanitizeText(input.comment, 1000),
    rating: Number(input.rating),
  };
  const issues: Array<ValidationIssue<ReviewField>> = [];

  if (!Number.isFinite(sanitizedData.rating) || sanitizedData.rating < 1 || sanitizedData.rating > 5) {
    issues.push({
      field: "rating",
      message: "Lütfen 1 ile 5 arasında bir puan seç.",
    });
  }

  if (!sanitizedData.comment) {
    issues.push({
      field: "comment",
      message: "Yorum alanı zorunludur.",
    });
  } else if (sanitizedData.comment.length < 10) {
    issues.push({
      field: "comment",
      message: commonValidationMessages.descriptionTooShort,
    });
  }

  if (issues.length > 0) {
    return createValidationFailure(issues);
  }

  return createValidationSuccess(sanitizedData);
}
