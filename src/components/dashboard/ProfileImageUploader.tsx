"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2 } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { updateProviderProfileImageAction } from "@/app/provider-dashboard/profile/actions";
import {
  PROVIDER_IMAGE_ACCEPT,
  validateProviderImageFile,
} from "@/services/storage/providerImages";

type ProfileImageUploaderProps = {
  currentImageUrl?: string;
  providerName: string;
};

type UploadState = "idle" | "uploading" | "success" | "error";

function getInitials(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr");

  return initials || "FU";
}

export function ProfileImageUploader({
  currentImageUrl,
  providerName,
}: ProfileImageUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [optimisticImageUrl, setOptimisticImageUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationError = validateProviderImageFile(file);

    if (validationError) {
      setMessage(validationError);
      setUploadState("error");
      return;
    }

    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }

    const previewUrl = URL.createObjectURL(file);

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    previewUrlRef.current = previewUrl;
    setOptimisticImageUrl(previewUrl);
    setMessage("");
    setUploadState("uploading");

    const formData = new FormData();
    formData.append("profileImage", file);

    const result = await updateProviderProfileImageAction(formData);

    if (!result.ok) {
      if (previewUrlRef.current === previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrlRef.current = null;
      }

      setOptimisticImageUrl(null);
      setMessage(result.message);
      setUploadState("error");
      return;
    }

    setMessage(result.message);
    setUploadState("success");
    router.refresh();

    successTimeoutRef.current = setTimeout(() => {
      setUploadState("idle");
      setMessage("");
    }, 2200);
  }

  const isUploading = uploadState === "uploading";
  const isSuccess = uploadState === "success";
  const isError = uploadState === "error";
  const initials = getInitials(providerName);
  const imageUrl = optimisticImageUrl ?? currentImageUrl ?? "";

  return (
    <div className="w-full max-w-[8.75rem] shrink-0">
      <div className="relative mx-auto size-24">
        <button
          aria-label="Profil fotoğrafı seç"
          className="group relative size-24 overflow-hidden rounded-full bg-[var(--brand-navy)] text-white shadow-[var(--shadow-card)] ring-2 ring-white transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {imageUrl ? (
            <Image
              alt={`${providerName} profil fotoğrafı`}
              className="object-cover"
              fill
              sizes="96px"
              src={imageUrl}
              unoptimized={imageUrl.startsWith("blob:")}
            />
          ) : (
            <span className="flex size-full items-center justify-center text-3xl font-bold tracking-normal">
              {initials}
            </span>
          )}

          {isUploading ? (
            <span className="absolute inset-0 flex items-center justify-center bg-[rgba(24,32,51,0.56)]">
              <Loader2 className="size-8 animate-spin text-white" aria-hidden />
            </span>
          ) : null}

          {isSuccess ? (
            <span className="absolute inset-0 flex items-center justify-center bg-[rgba(23,116,95,0.72)]">
              <Check className="size-8 animate-pulse text-white" aria-hidden />
            </span>
          ) : null}
        </button>

        <button
          aria-label="Profil fotoğrafını değiştir"
          className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-[var(--brand-orange)] text-white shadow-[var(--shadow-action)] ring-2 ring-white transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <Camera className="size-4" aria-hidden />
        </button>

        <input
          accept={PROVIDER_IMAGE_ACCEPT}
          className="sr-only"
          disabled={isUploading}
          name="profileImage"
          onChange={handleFileChange}
          ref={inputRef}
          type="file"
        />
      </div>

      <p className="mt-3 text-center text-xs font-semibold leading-5 text-[var(--muted)]">
        JPG, PNG veya WebP · Maks. 3 MB
      </p>

      {message ? (
        <p
          className={
            isError
              ? "mt-2 rounded-full bg-red-50 px-3 py-1.5 text-center text-xs font-bold leading-5 text-red-700 ring-1 ring-red-200"
              : "mt-2 rounded-full bg-[var(--trust-green-soft)] px-3 py-1.5 text-center text-xs font-bold leading-5 text-[var(--trust-green)] ring-1 ring-[rgba(23,116,95,0.2)]"
          }
          role={isError ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
