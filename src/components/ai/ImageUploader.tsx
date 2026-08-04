"use client";

import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { validateImageMagicBytes } from "@/lib/validations/imageMagicBytes";
import { cn } from "@/lib/utils";

export type AssistantImageFile = {
  file: File;
  originalName: string;
  previewUrl: string;
};

type ImageUploaderProps = {
  image: AssistantImageFile | null;
  isUploading?: boolean;
  onImageChange: (image: AssistantImageFile | null) => void;
  progress?: number | null;
};

const maxImageBytes = 10 * 1024 * 1024;
const maxImageEdge = 1600;
const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function getFileExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLocaleLowerCase("tr");

  return extension ? `.${extension}` : "";
}

function getResizedFileName(file: File, type: string) {
  const baseName = file.name.replace(/\.[^.]+$/, "") || "fuwu-sorun-fotografi";
  const extension = type === "image/png" ? ".png" : type === "image/webp" ? ".webp" : ".jpg";

  return `${baseName}${extension}`;
}

function loadImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image-load-failed"));
    };
    image.src = objectUrl;
  });
}

async function drawImageToCanvas(file: File) {
  const imageSource =
    "createImageBitmap" in window
      ? await createImageBitmap(file).catch(() => loadImageElement(file))
      : await loadImageElement(file);
  const width = imageSource instanceof HTMLImageElement ? imageSource.naturalWidth : imageSource.width;
  const height = imageSource instanceof HTMLImageElement ? imageSource.naturalHeight : imageSource.height;
  const scale = Math.min(1, maxImageEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");

  if (!context) {
    if ("close" in imageSource && typeof imageSource.close === "function") {
      imageSource.close();
    }

    throw new Error("canvas-unavailable");
  }

  context.drawImage(imageSource, 0, 0, canvas.width, canvas.height);

  if ("close" in imageSource && typeof imageSource.close === "function") {
    imageSource.close();
  }

  return canvas;
}

async function resizeImage(file: File) {
  const canvas = await drawImageToCanvas(file);
  const outputType = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, outputType === "image/png" ? undefined : 0.82);
  });

  if (!blob) {
    return file;
  }

  const candidate = new File([blob], getResizedFileName(file, outputType), {
    lastModified: Date.now(),
    type: outputType,
  });

  return candidate.size <= file.size || file.size > maxImageBytes ? candidate : file;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageUploader({
  image,
  isUploading = false,
  onImageChange,
  progress = null,
}: ImageUploaderProps) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  async function handleFile(file: File | undefined) {
    setError(null);

    if (!file) {
      return;
    }

    const extension = getFileExtension(file);
    const hasAcceptedExtension = [".jpg", ".jpeg", ".png", ".webp"].includes(extension);

    if (!acceptedMimeTypes.has(file.type) || !hasAcceptedExtension) {
      setError("Yalnızca JPG, JPEG, PNG veya WEBP fotoğraf yükleyebilirsin.");
      return;
    }

    if (file.size > maxImageBytes) {
      setError("Fotoğraf en fazla 10 MB olabilir.");
      return;
    }

    const magicByteError = await validateImageMagicBytes(file);

    if (magicByteError) {
      setError(magicByteError);
      return;
    }

    setIsPreparing(true);

    try {
      const resizedFile = await resizeImage(file);

      if (resizedFile.size > maxImageBytes) {
        setError("Fotoğraf sıkıştırıldıktan sonra da 10 MB sınırını aşıyor.");
        return;
      }

      onImageChange({
        file: resizedFile,
        originalName: file.name,
        previewUrl: URL.createObjectURL(resizedFile),
      });
    } catch {
      setError("Fotoğraf hazırlanamadı. Farklı bir fotoğraf deneyebilirsin.");
    } finally {
      setIsPreparing(false);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    void handleFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  return (
    <div className="grid gap-3">
      <div
        className={cn(
          "rounded-3xl border border-dashed border-[rgba(10,37,64,0.18)] bg-white p-3 shadow-[var(--shadow-subtle)]",
          image ? "border-solid" : "bg-[linear-gradient(180deg,#ffffff_0%,#fff8ef_100%)]",
        )}
      >
        {image ? (
          <div className="grid gap-3">
            <div className="relative overflow-hidden rounded-2xl bg-[var(--surface-soft)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- Blob previews are user-local and not compatible with next/image optimization. */}
              <img
                alt="Yüklenen sorun fotoğrafı önizlemesi"
                className="aspect-[4/3] w-full object-cover"
                src={image.previewUrl}
              />
              <span className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-xs font-bold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)]">
                Önizleme
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 text-xs font-semibold text-[var(--muted)]">
                <span className="block truncate">{image.originalName}</span>
                <span>{formatBytes(image.file.size)}</span>
              </p>
              <button
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)]"
                onClick={() => onImageChange(null)}
                type="button"
              >
                <Trash2 aria-hidden className="size-4" />
                Kaldır
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 p-1">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-navy)] text-white">
                <ImagePlus aria-hidden className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[var(--brand-navy)]">Fotoğraf ekle</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">
                  JPG, PNG veya WEBP. Uzun kenar 1600px civarına indirilir.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[var(--brand-navy)] px-3 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-navy-deep)] disabled:opacity-60"
                disabled={isPreparing || isUploading}
                onClick={() => uploadInputRef.current?.click()}
                type="button"
              >
                {isPreparing ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <ImagePlus aria-hidden className="size-4" />}
                Seç
              </button>
              <button
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[rgba(10,37,64,0.12)] bg-white px-3 text-sm font-bold text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)] disabled:opacity-60"
                disabled={isPreparing || isUploading}
                onClick={() => cameraInputRef.current?.click()}
                type="button"
              >
                <Camera aria-hidden className="size-4" />
                Kamera
              </button>
            </div>
          </div>
        )}

        {typeof progress === "number" && isUploading ? (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--brand-navy-soft)]">
            <div
              className="h-full rounded-full bg-[var(--brand-orange)] transition-[width] duration-200"
              style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
            />
          </div>
        ) : null}
      </div>

      <input
        ref={uploadInputRef}
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleInputChange}
        type="file"
      />
      <input
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleInputChange}
        type="file"
      />

      <p className="text-xs font-semibold leading-5 text-[var(--muted)]">
        Fotoğraflar yalnızca sorunun ilk değerlendirmesi için kullanılır. Kesin teşhis yerine güvenli yönlendirme sunulur.
      </p>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
