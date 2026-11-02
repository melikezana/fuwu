// Telefon fotoğrafları küçültülmeden önce bu sınıra kadar kabul edilir; yükleme sınırı küçültülmüş dosyaya uygulanır.
export const RAW_IMAGE_MAX_BYTES = 25 * 1024 * 1024;
const acceptedImageExtensions = ["jpg", "jpeg", "png", "webp"];
const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];

// Ham dosya için yalnızca tür ve üst sınır kontrolü. Boyut sınırı küçültmeden sonra uygulanır.
export function validateRawImageFile(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (/^(heic|heif)$/.test(extension) || /heic|heif/.test(file.type)) {
    return "iPhone HEIC fotoğrafı bu tarayıcıda açılamıyor. Fotoğrafı telefondan doğrudan yükle ya da JPG olarak kaydet.";
  }
  if (!acceptedImageExtensions.includes(extension) || (file.type && !acceptedImageTypes.includes(file.type))) {
    return "Fotoğraf JPG, PNG veya WebP formatında olmalı.";
  }
  if (file.size > RAW_IMAGE_MAX_BYTES) {
    return "Fotoğraf çok büyük. 25 MB altında bir fotoğraf seç.";
  }
  return null;
}

function createFileName(fileName: string, extension: "webp" | "jpg") {
  const baseName = fileName.replace(/\.[^.]+$/, "").trim() || "image";

  return `${baseName}.${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function getTargetDimensions(
  width: number,
  height: number,
  maxDimension: number,
) {
  if (width <= maxDimension && height <= maxDimension) {
    return {
      height,
      width,
    };
  }

  const ratio = Math.min(maxDimension / width, maxDimension / height);

  return {
    height: Math.round(height * ratio),
    width: Math.round(width * ratio),
  };
}

export async function resizeImageForUpload(
  file: File,
  maxDimension = 1200,
  quality = 0.88,
  jpegOnly = false,
): Promise<File> {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return file;
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = new window.Image();
    image.decoding = "async";
    image.src = imageUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Image could not be decoded."));
    });

    const { height, width } = getTargetDimensions(
      image.naturalWidth,
      image.naturalHeight,
      maxDimension,
    );

    if (!width || !height) {
      return file;
    }

    if (
      !jpegOnly &&
      file.type === "image/webp" &&
      width === image.naturalWidth &&
      height === image.naturalHeight
    ) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    // Saydam PNG'ler JPEG'e düşerse siyah zemin olmasın.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    // Safari (iPhone dahil) canvas'tan WebP üretemez ve büyük PNG döndürür; o durumda JPEG kullanılır.
    const webp = jpegOnly ? null : await canvasToBlob(canvas, "image/webp", quality);
    const blob = webp?.type === "image/webp" ? webp : await canvasToBlob(canvas, "image/jpeg", quality);

    if (!blob || !["image/webp", "image/jpeg"].includes(blob.type)) {
      return file;
    }

    const extension = blob.type === "image/webp" ? "webp" : "jpg";

    return new File([blob], createFileName(file.name, extension), {
      lastModified: Date.now(),
      type: blob.type,
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
