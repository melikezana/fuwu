import type { SupabaseClient } from "@supabase/supabase-js";
import { handleServiceError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";
import { detectImageMagicByteMimeType } from "@/lib/validations/imageMagicBytes";

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

export async function verificationDocumentContentType(file: File) {
  try {
    const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
    if(new TextDecoder().decode(bytes.slice(0,5)) === "%PDF-") return "application/pdf";
    const image=detectImageMagicByteMimeType(bytes);
    return image === "image/png" || image === "image/jpeg" ? image : null;
  } catch { return null; }
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

  if (file.size === 0) return "Belge boş olamaz.";

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

  const verifiedContentType=await verificationDocumentContentType(file);
  if(!verifiedContentType) return {status:"skipped",path:null,message:"Belge içeriği PDF, JPEG veya PNG olmalı."};
  const extensionMime = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
  const extension = getFileExtension(file.name);
  if (!extension || extensionMime[extension] !== verifiedContentType || (file.type && file.type !== verifiedContentType)) return { status: "skipped", path: null, message: "Belgenin uzantısı, dosya türü ve içeriği eşleşmeli." };

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

    const form = new FormData(); form.set("document", file);
    const response = await fetch("/api/provider-documents/upload", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok || typeof data.path !== "string") throw new Error("document_upload_failed");

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
