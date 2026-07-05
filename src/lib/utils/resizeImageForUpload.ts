function createWebpFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "").trim() || "image";

  return `${baseName}.webp`;
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

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", quality);
    });

    if (!blob) {
      return file;
    }

    return new File([blob], createWebpFileName(file.name), {
      lastModified: Date.now(),
      type: "image/webp",
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
