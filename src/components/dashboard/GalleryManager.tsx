"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteGalleryImageAction,
  uploadGalleryImageAction,
} from "@/app/provider-dashboard/profile/actions";
import { resizeImageForUpload } from "@/lib/utils/resizeImageForUpload";
import { validateImageMagicBytes } from "@/lib/validations/imageMagicBytes";
import {
  PROVIDER_GALLERY_ACCEPT,
  PROVIDER_GALLERY_MAX_IMAGES,
  validateGalleryImageFile,
  type GalleryImage,
} from "@/services/providers/gallery";

type GalleryManagerProps = {
  images: GalleryImage[];
  maxImages?: number;
  providerId: string;
};

type GalleryItem = GalleryImage & {
  isDeleting?: boolean;
  isPending?: boolean;
};

type Feedback = {
  message: string;
  tone: "error" | "success";
};

const GALLERY_IMAGE_MAX_DIMENSION = 1920;

function createTemporaryId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function convertImageFileToWebp(file: File) {
  return resizeImageForUpload(file, GALLERY_IMAGE_MAX_DIMENSION, 0.85);
}

export function GalleryManager({
  images,
  maxImages = PROVIDER_GALLERY_MAX_IMAGES,
  providerId,
}: GalleryManagerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const cleanupTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const [caption, setCaption] = useState("");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [optimisticItems, setOptimisticItems] = useState<GalleryItem[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const previewUrls = previewUrlsRef.current;
    const cleanupTimeouts = cleanupTimeoutsRef.current;

    return () => {
      cleanupTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      cleanupTimeouts.clear();
      previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
      previewUrls.clear();
    };
  }, []);

  const items = useMemo<GalleryItem[]>(
    () => [
      ...images
        .filter((image) => !removedIds.has(image.id))
        .map((image) => ({
          ...image,
          isDeleting: deletingIds.has(image.id),
        })),
      ...optimisticItems,
    ],
    [deletingIds, images, optimisticItems, removedIds],
  );

  const visibleImageCount = useMemo(
    () => items.filter((item) => !item.isDeleting).length,
    [items],
  );
  const hasReachedLimit = visibleImageCount >= maxImages;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const sourceFile = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!sourceFile || hasReachedLimit) {
      return;
    }

    const sourceValidationError = validateGalleryImageFile(sourceFile);

    if (sourceValidationError) {
      setFeedback({
        message: sourceValidationError,
        tone: "error",
      });
      return;
    }

    const magicByteError = await validateImageMagicBytes(sourceFile);

    if (magicByteError) {
      setFeedback({
        message: magicByteError,
        tone: "error",
      });
      return;
    }

    const file = await convertImageFileToWebp(sourceFile);
    const validationError = validateGalleryImageFile(file);

    if (validationError) {
      setFeedback({
        message: validationError,
        tone: "error",
      });
      return;
    }

    const previewUrl = URL.createObjectURL(sourceFile);
    const temporaryId = createTemporaryId();
    const safeCaption = caption.trim();
    previewUrlsRef.current.add(previewUrl);
    setFeedback(null);
    setOptimisticItems((currentItems) => [
      ...currentItems,
      {
        caption: safeCaption || null,
        createdAt: new Date().toISOString(),
        displayOrder: visibleImageCount,
        id: temporaryId,
        isPending: true,
        providerId,
        publicUrl: previewUrl,
        storagePath: "",
      },
    ]);

    const formData = new FormData();
    formData.append("galleryImage", file);

    if (safeCaption) {
      formData.append("caption", safeCaption);
    }

    const result = await uploadGalleryImageAction(formData);

    if (!result.ok) {
      URL.revokeObjectURL(previewUrl);
      previewUrlsRef.current.delete(previewUrl);
      setOptimisticItems((currentItems) =>
        currentItems.filter((item) => item.id !== temporaryId),
      );
      setFeedback({
        message: result.message,
        tone: "error",
      });
      return;
    }

    setCaption("");
    setOptimisticItems((currentItems) =>
      currentItems.map((item) =>
        item.id === temporaryId
          ? {
              ...item,
              isPending: false,
            }
          : item,
      ),
    );
    setFeedback({
      message: result.message,
      tone: "success",
    });
    router.refresh();

    const cleanupTimeout = setTimeout(() => {
      URL.revokeObjectURL(previewUrl);
      previewUrlsRef.current.delete(previewUrl);
      cleanupTimeoutsRef.current.delete(cleanupTimeout);
      setOptimisticItems((currentItems) =>
        currentItems.filter((item) => item.id !== temporaryId),
      );
    }, 2200);
    cleanupTimeoutsRef.current.add(cleanupTimeout);
  }

  async function handleDelete(image: GalleryItem) {
    if (image.isPending || image.isDeleting) {
      return;
    }

    setFeedback(null);
    setDeletingIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(image.id);

      return nextIds;
    });

    const result = await deleteGalleryImageAction(image.id, image.storagePath);

    if (!result.ok) {
      setDeletingIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(image.id);

        return nextIds;
      });
      setFeedback({
        message: result.message,
        tone: "error",
      });
      return;
    }

    setRemovedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(image.id);

      return nextIds;
    });
    setDeletingIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(image.id);

      return nextIds;
    });
    setFeedback({
      message: result.message,
      tone: "success",
    });
    router.refresh();
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-[var(--brand-navy)]">
              İş Galerim
            </h2>
            <span className="inline-flex rounded-full bg-[var(--brand-orange-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-orange-dark)]">
              {visibleImageCount}/{maxImages} görsel
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)]">
            Müşteriler profilini ziyaret ettiğinde görecekleri işlerinizi buraya ekleyin. (Maks. 12 görsel)
          </p>
        </div>
        {!hasReachedLimit ? (
          <label className="w-full sm:max-w-xs">
            <span className="sr-only">Görsel açıklaması</span>
            <input
              className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--brand-navy)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]"
              maxLength={160}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Kısa açıklama (opsiyonel)"
              value={caption}
            />
          </label>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((image) => (
          <div
            className="group relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-soft)] shadow-[var(--shadow-subtle)] ring-1 ring-[rgba(13,20,36,0.08)]"
            key={image.id}
          >
            <Image
              alt={image.caption ?? "İş galerisi görseli"}
              className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
                image.isDeleting ? "opacity-60" : ""
              }`}
              fill
              sizes="(min-width: 768px) 180px, 44vw"
              src={image.publicUrl}
              unoptimized={image.publicUrl.startsWith("blob:")}
            />

            {image.caption ? (
              <div className="absolute inset-x-0 bottom-0 bg-black/45 px-3 py-2">
                <p className="truncate text-xs font-semibold text-white">
                  {image.caption}
                </p>
              </div>
            ) : null}

            <div className="absolute inset-0 bg-[rgba(24,32,51,0.46)] opacity-0 transition-opacity group-hover:opacity-100" />

            {!image.isPending ? (
              <button
                aria-label="Görseli sil"
                className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow-[var(--shadow-card)] ring-2 ring-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 group-hover:opacity-100 disabled:cursor-wait disabled:opacity-80"
                disabled={image.isDeleting}
                onClick={() => void handleDelete(image)}
                type="button"
              >
                {image.isDeleting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-4" aria-hidden />
                )}
              </button>
            ) : null}

            {image.isPending ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[rgba(24,32,51,0.58)]">
                <Loader2 className="size-8 animate-spin text-white" aria-hidden />
              </div>
            ) : null}
          </div>
        ))}

        {!hasReachedLimit ? (
          <button
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[rgba(255,138,0,0.42)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] transition hover:-translate-y-0.5 hover:border-[var(--brand-orange)] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <Plus className="size-7" aria-hidden />
            <span className="text-sm font-bold">Fotoğraf Ekle</span>
          </button>
        ) : null}
      </div>

      <input
        accept={PROVIDER_GALLERY_ACCEPT}
        className="sr-only"
        name="galleryImage"
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />

      {hasReachedLimit ? (
        <p className="mt-4 rounded-md bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--muted)]">
          Maksimum 12 görsel yüklediniz.
        </p>
      ) : null}

      {feedback ? (
        <p
          className={
            feedback.tone === "error"
              ? "mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 ring-1 ring-red-200"
              : "mt-4 rounded-md bg-[var(--trust-green-soft)] px-3 py-2 text-sm font-bold text-[var(--trust-green)] ring-1 ring-[rgba(23,116,95,0.2)]"
          }
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
