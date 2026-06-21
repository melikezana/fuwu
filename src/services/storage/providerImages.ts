import type { SupabaseClient } from "@supabase/supabase-js";
import { handleServiceError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";

export const PROVIDER_IMAGES_BUCKET = "provider-images";
export const PROVIDER_IMAGE_MAX_SIZE_BYTES = 3 * 1024 * 1024;
export const PROVIDER_IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

const acceptedProviderImageExtensions = ["jpg", "jpeg", "png", "webp"] as const;
const acceptedProviderImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

type ProviderImageExtension = (typeof acceptedProviderImageExtensions)[number];

export type ProviderImageUploadResult =
  | {
      status: "uploaded";
      path: string;
      publicUrl: string | null;
      message?: undefined;
    }
  | {
      status: "skipped";
      path: null;
      publicUrl: null;
      message?: string;
    };

function warnProviderImageUploadFallback(error: unknown) {
  handleServiceError(error, {
    logContext: "Provider profile image upload failed. Continuing without image.",
    publicMessage: "Profil görseli yüklenemedi.",
  });
}

function getFileExtension(fileName: string): ProviderImageExtension | null {
  const extension = fileName.split(".").pop()?.trim().toLocaleLowerCase("tr");

  if (acceptedProviderImageExtensions.includes(extension as ProviderImageExtension)) {
    return extension as ProviderImageExtension;
  }

  return null;
}

function getContentType(file: File, extension: ProviderImageExtension) {
  if (acceptedProviderImageMimeTypes.includes(file.type as (typeof acceptedProviderImageMimeTypes)[number])) {
    return file.type;
  }

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  return "image/jpeg";
}

function createProviderImagePath(userId: string, file: File) {
  const extension = getFileExtension(file.name) ?? "jpg";
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  return `${userId}/provider-applications/${new Date().getFullYear()}/${randomId}.${extension}`;
}

export function validateProviderImageFile(file: File | null) {
  if (!file) {
    return null;
  }

  const extension = getFileExtension(file.name);
  const hasAcceptedMimeType =
    !file.type ||
    acceptedProviderImageMimeTypes.includes(file.type as (typeof acceptedProviderImageMimeTypes)[number]);

  if (!extension || !hasAcceptedMimeType) {
    return "Profil görseli JPG, JPEG, PNG veya WebP formatında olmalı.";
  }

  if (file.size > PROVIDER_IMAGE_MAX_SIZE_BYTES) {
    return "Profil görseli en fazla 3 MB olabilir.";
  }

  return null;
}

export async function uploadProviderProfileImage(
  supabase: SupabaseClient<Database>,
  file: File | null,
): Promise<ProviderImageUploadResult> {
  const validationError = validateProviderImageFile(file);

  if (validationError) {
    return {
      status: "skipped",
      path: null,
      publicUrl: null,
      message: validationError,
    };
  }

  if (!file) {
    return {
      status: "skipped",
      path: null,
      publicUrl: null,
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
        publicUrl: null,
        message: "Profil görseli yüklemek için giriş yapmalısın.",
      };
    }

    const path = createProviderImagePath(user.id, file);
    const extension = getFileExtension(file.name) ?? "jpg";
    const { data, error } = await supabase.storage
      .from(PROVIDER_IMAGES_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: getContentType(file, extension),
        upsert: false,
      });

    if (error) {
      warnProviderImageUploadFallback(error);
      return {
        status: "skipped",
        path: null,
        publicUrl: null,
        message: "Profil görseli yüklenemedi; başvurun görselsiz gönderildi.",
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(PROVIDER_IMAGES_BUCKET).getPublicUrl(data.path);

    return {
      status: "uploaded",
      path: data.path,
      publicUrl: publicUrl || null,
    };
  } catch (error) {
    warnProviderImageUploadFallback(error);
    return {
      status: "skipped",
      path: null,
      publicUrl: null,
      message: "Profil görseli yüklenemedi; başvurun görselsiz gönderildi.",
    };
  }
}
