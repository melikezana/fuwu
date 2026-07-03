"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateProviderProfileImage } from "@/services/providers/dashboard";
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
