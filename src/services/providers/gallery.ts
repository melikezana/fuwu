import type { SupabaseClient } from "@supabase/supabase-js";
import { handleServiceError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";
import { sanitizeText } from "@/lib/validations";
import { validateImageMagicBytes } from "@/lib/validations/imageMagicBytes";

export const PROVIDER_GALLERY_BUCKET = "provider-gallery";
export const PROVIDER_GALLERY_MAX_IMAGES = 12;
export const PROVIDER_GALLERY_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const PROVIDER_GALLERY_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

const acceptedGalleryExtensions = ["jpg", "jpeg", "png", "webp"] as const;
const acceptedGalleryMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

type GalleryImageExtension = (typeof acceptedGalleryExtensions)[number];
type GalleryRow = Database["public"]["Tables"]["provider_gallery_images"]["Row"];

export type GalleryImage = {
  id: string;
  providerId: string;
  storagePath: string;
  publicUrl: string;
  caption: string | null;
  displayOrder: number;
  createdAt: string;
};

function mapGalleryImage(row: GalleryRow): GalleryImage {
  return {
    id: row.id,
    providerId: row.provider_id,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    caption: row.caption,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  };
}

function getFileExtension(fileName: string): GalleryImageExtension | null {
  const extension = fileName.split(".").pop()?.trim().toLocaleLowerCase("tr");

  if (acceptedGalleryExtensions.includes(extension as GalleryImageExtension)) {
    return extension as GalleryImageExtension;
  }

  return null;
}

function getContentType(file: File, extension: GalleryImageExtension | null) {
  if (acceptedGalleryMimeTypes.includes(file.type as (typeof acceptedGalleryMimeTypes)[number])) {
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

function getRandomId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function createGalleryStoragePath(userId: string) {
  return `${userId}/${getRandomId()}.webp`;
}

function getErrorText(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const record = error as {
    code?: unknown;
    details?: unknown;
    hint?: unknown;
    message?: unknown;
  };

  return [record.code, record.details, record.hint, record.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase("tr");
}

function isGalleryLimitError(error: unknown) {
  const errorText = getErrorText(error);

  return errorText.includes("gallery_limit_exceeded") || errorText.includes("12");
}

function warnGalleryServiceError(error: unknown, logContext: string, publicMessage: string) {
  handleServiceError(error, {
    logContext,
    publicMessage,
  });
}

export function validateGalleryImageFile(file: File | null) {
  if (!file) {
    return null;
  }

  const extension = getFileExtension(file.name);
  const hasAcceptedMimeType =
    !file.type ||
    acceptedGalleryMimeTypes.includes(file.type as (typeof acceptedGalleryMimeTypes)[number]);

  if (!extension || !hasAcceptedMimeType) {
    return "İş görseli JPG, JPEG, PNG veya WebP formatında olmalı.";
  }

  if (file.size > PROVIDER_GALLERY_MAX_SIZE_BYTES) {
    return "İş görseli en fazla 5 MB olabilir.";
  }

  return null;
}

async function cleanupGalleryStorageObject(
  supabase: SupabaseClient<Database>,
  storagePath: string,
) {
  const { error } = await supabase.storage
    .from(PROVIDER_GALLERY_BUCKET)
    .remove([storagePath]);

  if (error) {
    warnGalleryServiceError(
      error,
      "Provider gallery storage cleanup failed.",
      "Yükleme tamamlanamadı ve geçici görsel temizlenemedi.",
    );
  }
}

async function syncProviderGalleryPreview(
  supabase: SupabaseClient<Database>,
  providerId: string,
) {
  const { data, error } = await supabase
    .from("provider_gallery_images")
    .select("public_url")
    .eq("provider_id", providerId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    warnGalleryServiceError(
      error,
      "Provider gallery preview lookup failed.",
      "Galeri önizlemesi güncellenemedi.",
    );
    return;
  }

  const nextPreviewUrl = sanitizeText(data?.public_url ?? "", 500) || null;
  const { error: updateError } = await supabase
    .from("providers")
    .update({
      gallery_preview_url: nextPreviewUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", providerId);

  if (updateError) {
    warnGalleryServiceError(
      updateError,
      "Provider gallery preview update failed.",
      "Galeri önizlemesi güncellenemedi.",
    );
  }
}

export async function getProviderGallery(
  providerId: string,
  supabase: SupabaseClient<Database>,
): Promise<GalleryImage[]> {
  const safeProviderId = sanitizeText(providerId, 80);

  if (!safeProviderId) {
    return [];
  }

  const { data, error } = await supabase
    .from("provider_gallery_images")
    .select("id, provider_id, storage_path, public_url, caption, display_order, created_at")
    .eq("provider_id", safeProviderId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(PROVIDER_GALLERY_MAX_IMAGES);

  if (error) {
    warnGalleryServiceError(
      error,
      "Provider gallery read failed.",
      "Usta galerisi şu anda yüklenemedi.",
    );

    return [];
  }

  return ((data ?? []) as GalleryRow[]).map(mapGalleryImage);
}

export async function uploadGalleryImage(
  supabase: SupabaseClient<Database>,
  providerId: string,
  file: File,
  caption?: string,
): Promise<{ image?: GalleryImage; message: string; ok: boolean }> {
  const safeProviderId = sanitizeText(providerId, 80);
  const validationError = validateGalleryImageFile(file);

  if (!safeProviderId) {
    return {
      message: "Usta profili bulunamadı.",
      ok: false,
    };
  }

  if (validationError) {
    return {
      message: validationError,
      ok: false,
    };
  }

  const magicByteError = await validateImageMagicBytes(file);

  if (magicByteError) {
    return {
      message: magicByteError,
      ok: false,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      message: "İş görseli yüklemek için giriş yapmalısın.",
      ok: false,
    };
  }

  const { count, error: countError } = await supabase
    .from("provider_gallery_images")
    .select("id", { count: "exact", head: true })
    .eq("provider_id", safeProviderId);

  if (!countError && typeof count === "number" && count >= PROVIDER_GALLERY_MAX_IMAGES) {
    return {
      message: "Maksimum 12 görsel yüklediniz.",
      ok: false,
    };
  }

  const storagePath = createGalleryStoragePath(user.id);
  const extension = getFileExtension(file.name);
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(PROVIDER_GALLERY_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: getContentType(file, extension),
      upsert: false,
    });

  if (uploadError || !uploadData?.path) {
    warnGalleryServiceError(
      uploadError ?? new Error("Provider gallery storage upload returned no path."),
      "Provider gallery image upload failed.",
      "İş görseli yüklenemedi.",
    );

    return {
      message: "İş görseli yüklenemedi. Lütfen dosyayı kontrol edip tekrar dene.",
      ok: false,
    };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PROVIDER_GALLERY_BUCKET).getPublicUrl(uploadData.path);
  const safeCaption = caption ? sanitizeText(caption, 160) : "";
  const { data: insertedImage, error: insertError } = await supabase
    .from("provider_gallery_images")
    .insert({
      caption: safeCaption || null,
      display_order:
        typeof count === "number" ? Math.min(count, PROVIDER_GALLERY_MAX_IMAGES - 1) : 0,
      provider_id: safeProviderId,
      public_url: publicUrl,
      storage_path: uploadData.path,
    })
    .select("id, provider_id, storage_path, public_url, caption, display_order, created_at")
    .single();

  if (insertError || !insertedImage) {
    await cleanupGalleryStorageObject(supabase, uploadData.path);

    if (isGalleryLimitError(insertError)) {
      return {
        message: "Maksimum 12 görsel yüklediniz.",
        ok: false,
      };
    }

    warnGalleryServiceError(
      insertError ?? new Error("Provider gallery insert returned no row."),
      "Provider gallery image insert failed.",
      "İş görseli kaydedilemedi.",
    );

    return {
      message: "İş görseli kaydedilemedi. Lütfen tekrar dene.",
      ok: false,
    };
  }

  await syncProviderGalleryPreview(supabase, safeProviderId);

  return {
    image: mapGalleryImage(insertedImage as GalleryRow),
    message: "İş görseli galerine eklendi.",
    ok: true,
  };
}

export async function deleteGalleryImage(
  supabase: SupabaseClient<Database>,
  imageId: string,
  storagePath: string,
): Promise<{ message: string; ok: boolean }> {
  const safeImageId = sanitizeText(imageId, 80);
  const safeStoragePath = sanitizeText(storagePath, 500);

  if (!safeImageId || !safeStoragePath) {
    return {
      message: "Silinecek görsel bulunamadı.",
      ok: false,
    };
  }

  const { error: storageError } = await supabase.storage
    .from(PROVIDER_GALLERY_BUCKET)
    .remove([safeStoragePath]);

  if (storageError) {
    warnGalleryServiceError(
      storageError,
      "Provider gallery storage delete failed.",
      "İş görseli silinemedi.",
    );

    return {
      message: "İş görseli silinemedi. Lütfen tekrar dene.",
      ok: false,
    };
  }

  const { data, error: deleteError } = await supabase
    .from("provider_gallery_images")
    .delete()
    .eq("id", safeImageId)
    .eq("storage_path", safeStoragePath)
    .select("id, provider_id")
    .maybeSingle();

  if (deleteError || !data) {
    warnGalleryServiceError(
      deleteError ?? new Error("Provider gallery delete matched no rows."),
      "Provider gallery database delete failed.",
      "İş görseli kaydı silinemedi.",
    );

    return {
      message: "İş görseli kaydı silinemedi. Lütfen tekrar dene.",
      ok: false,
    };
  }

  await syncProviderGalleryPreview(supabase, data.provider_id);

  return {
    message: "İş görseli galerinden kaldırıldı.",
    ok: true,
  };
}
