import type { SupabaseClient } from "@supabase/supabase-js";
import { handleServiceError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";

export const PROVIDER_VERIFICATION_DOCUMENTS_BUCKET =
  "provider-verification-documents";
export const PROVIDER_VERIFICATION_DOCUMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const PROVIDER_VERIFICATION_DOCUMENT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

const acceptedExtensions = ["pdf", "jpg", "jpeg", "png"] as const;
const acceptedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

type VerificationDocumentExtension = (typeof acceptedExtensions)[number];

export type ProviderVerificationDocumentUploadResult =
  | {
      status: "uploaded";
      path: string;
      message?: undefined;
    }
  | {
      status: "skipped";
      path: null;
      message?: string;
    };

function getFileExtension(fileName: string): VerificationDocumentExtension | null {
  const extension = fileName.split(".").pop()?.trim().toLocaleLowerCase("tr");

  if (acceptedExtensions.includes(extension as VerificationDocumentExtension)) {
    return extension as VerificationDocumentExtension;
  }

  return null;
}

function getContentType(file: File, extension: VerificationDocumentExtension) {
  if (acceptedMimeTypes.includes(file.type as (typeof acceptedMimeTypes)[number])) {
    return file.type;
  }

  if (extension === "pdf") {
    return "application/pdf";
  }

  if (extension === "png") {
    return "image/png";
  }

  return "image/jpeg";
}

function createVerificationDocumentPath(
  userId: string,
  file: File,
  extension: VerificationDocumentExtension,
) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  return `${userId}/provider-applications/${new Date().getFullYear()}/${randomId}.${extension}`;
}

export function validateProviderVerificationDocumentFile(file: File | null) {
  if (!file) {
    return null;
  }

  const extension = getFileExtension(file.name);
  const hasAcceptedMimeType =
    !file.type ||
    acceptedMimeTypes.includes(file.type as (typeof acceptedMimeTypes)[number]);

  if (!extension || !hasAcceptedMimeType) {
    return "Belge PDF, JPG, JPEG veya PNG formatında olmalı.";
  }

  if (file.size > PROVIDER_VERIFICATION_DOCUMENT_MAX_SIZE_BYTES) {
    return "Belge en fazla 5 MB olabilir.";
  }

  return null;
}

export async function uploadProviderVerificationDocument(
  supabase: SupabaseClient<Database>,
  file: File | null,
): Promise<ProviderVerificationDocumentUploadResult> {
  const validationError = validateProviderVerificationDocumentFile(file);

  if (validationError) {
    return {
      status: "skipped",
      path: null,
      message: validationError,
    };
  }

  if (!file) {
    return {
      status: "skipped",
      path: null,
    };
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        status: "skipped",
        path: null,
        message: "Belge yüklemek için giriş yapmalısın.",
      };
    }

    const extension = getFileExtension(file.name) ?? "pdf";
    const path = createVerificationDocumentPath(user.id, file, extension);
    const { data, error } = await supabase.storage
      .from(PROVIDER_VERIFICATION_DOCUMENTS_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: getContentType(file, extension),
        upsert: false,
      });

    if (error) {
      throw error;
    }

    return {
      status: "uploaded",
      path: data.path,
    };
  } catch (error) {
    handleServiceError(error, {
      logContext: "Provider verification document upload failed.",
      publicMessage: "Kimlik/yeterlilik belgesi yüklenemedi.",
    });

    return {
      status: "skipped",
      path: null,
      message: "Kimlik/yeterlilik belgesi yüklenemedi. Lütfen tekrar dene.",
    };
  }
}
