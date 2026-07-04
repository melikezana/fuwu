"use server";

import { revalidatePath } from "next/cache";
import { appRoutes } from "@/lib/constants/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getProviderDashboardAccess,
  updateProviderProfileImage,
} from "@/services/providers/dashboard";
import {
  deleteGalleryImage,
  uploadGalleryImage,
} from "@/services/providers/gallery";
import { uploadProviderProfileImage } from "@/services/storage/providerImages";

export type UpdateProviderProfileImageActionResult = {
  message: string;
  ok: boolean;
};

export async function updateProviderProfileImageAction(
  formData: FormData,
): Promise<UpdateProviderProfileImageActionResult> {
  const fileValue = formData.get("profileImage");
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

  if (!file) {
    return {
      message: "Lütfen JPG, PNG veya WebP formatında bir profil fotoğrafı seç.",
      ok: false,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      message: "Profil fotoğrafı şu anda yüklenemiyor. Lütfen daha sonra tekrar dene.",
      ok: false,
    };
  }

  const uploadResult = await uploadProviderProfileImage(supabase, file);

  if (uploadResult.status !== "uploaded" || !uploadResult.publicUrl) {
    return {
      message:
        uploadResult.message ??
        "Profil fotoğrafı yüklenemedi. Lütfen dosyayı kontrol edip tekrar dene.",
      ok: false,
    };
  }

  const updateResult = await updateProviderProfileImage(
    uploadResult.path,
    uploadResult.publicUrl,
  );

  if (!updateResult.ok) {
    return {
      message: "Fotoğraf yüklendi ama profilin güncellenemedi. Lütfen tekrar dene.",
      ok: false,
    };
  }

  return {
    message: "Profil fotoğrafın güncellendi.",
    ok: true,
  };
}

export async function uploadGalleryImageAction(
  formData: FormData,
): Promise<{ message: string; ok: boolean }> {
  const fileValue = formData.get("galleryImage");
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  const captionValue = formData.get("caption");
  const caption = typeof captionValue === "string" ? captionValue : undefined;

  if (!file) {
    return {
      message: "Lütfen JPG, PNG veya WebP formatında bir iş görseli seç.",
      ok: false,
    };
  }

  const [supabase, providerAccess] = await Promise.all([
    createSupabaseServerClient(),
    getProviderDashboardAccess(),
  ]);

  if (!supabase) {
    return {
      message: "İş galerisi şu anda güncellenemiyor. Lütfen daha sonra tekrar dene.",
      ok: false,
    };
  }

  if (!providerAccess.ok) {
    return {
      message: "Bu işlem için onaylı usta profiliyle giriş yapmalısın.",
      ok: false,
    };
  }

  const result = await uploadGalleryImage(
    supabase,
    providerAccess.profile.id,
    file,
    caption,
  );

  if (result.ok) {
    revalidatePath(appRoutes.providerDashboardProfile);
    revalidatePath(`/providers/${providerAccess.profile.id}`);
    revalidatePath(appRoutes.providers);
  }

  return {
    message: result.message,
    ok: result.ok,
  };
}

export async function deleteGalleryImageAction(
  imageId: string,
  storagePath: string,
): Promise<{ message: string; ok: boolean }> {
  const [supabase, providerAccess] = await Promise.all([
    createSupabaseServerClient(),
    getProviderDashboardAccess(),
  ]);

  if (!supabase) {
    return {
      message: "İş galerisi şu anda güncellenemiyor. Lütfen daha sonra tekrar dene.",
      ok: false,
    };
  }

  if (!providerAccess.ok) {
    return {
      message: "Bu işlem için onaylı usta profiliyle giriş yapmalısın.",
      ok: false,
    };
  }

  const result = await deleteGalleryImage(supabase, imageId, storagePath);

  if (result.ok) {
    revalidatePath(appRoutes.providerDashboardProfile);
    revalidatePath(`/providers/${providerAccess.profile.id}`);
    revalidatePath(appRoutes.providers);
  }

  return {
    message: result.message,
    ok: result.ok,
  };
}
