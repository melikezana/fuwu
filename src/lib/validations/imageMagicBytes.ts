export const IMAGE_MAGIC_BYTE_INVALID_MESSAGE =
  "Yaln\u0131zca ger\u00e7ek JPEG, PNG veya WebP dosyalar\u0131 y\u00fcklenebilir. Uzant\u0131s\u0131 de\u011fi\u015ftirilmi\u015f dosyalar kabul edilmez.";
export const IMAGE_MAGIC_BYTE_EMPTY_FILE_MESSAGE = "Ge\u00e7ersiz dosya";

const imageHeaderByteLength = 12;
const jpegSignature = [0xff, 0xd8, 0xff] as const;
const pngSignature = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
] as const;

export type SupportedImageMagicByteMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp";

function hasSignature(bytes: Uint8Array, signature: readonly number[], offset = 0) {
  if (bytes.length < offset + signature.length) {
    return false;
  }

  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function hasAsciiSignature(bytes: Uint8Array, signature: string, offset = 0) {
  if (bytes.length < offset + signature.length) {
    return false;
  }

  return [...signature].every(
    (character, index) => bytes[offset + index] === character.charCodeAt(0),
  );
}

export function detectImageMagicByteMimeType(
  bytes: Uint8Array,
): SupportedImageMagicByteMimeType | null {
  if (hasSignature(bytes, jpegSignature)) {
    return "image/jpeg";
  }

  if (hasSignature(bytes, pngSignature)) {
    return "image/png";
  }

  if (
    hasAsciiSignature(bytes, "RIFF", 0) &&
    hasAsciiSignature(bytes, "WEBP", 8)
  ) {
    return "image/webp";
  }

  return null;
}

async function readImageHeaderBytes(file: File): Promise<Uint8Array | null> {
  if (typeof file.slice !== "function") {
    return null;
  }

  const imageHeader = file.slice(0, imageHeaderByteLength);

  if (typeof imageHeader.arrayBuffer !== "function") {
    return null;
  }

  return new Uint8Array(await imageHeader.arrayBuffer());
}

export async function getImageMagicByteMimeType(
  file: File,
): Promise<SupportedImageMagicByteMimeType | null> {
  if (file.size === 0) {
    return null;
  }

  try {
    const bytes = await readImageHeaderBytes(file);

    return bytes ? detectImageMagicByteMimeType(bytes) : null;
  } catch {
    return null;
  }
}

export async function validateImageMagicBytes(file: File): Promise<string | null> {
  if (file.size === 0) {
    return IMAGE_MAGIC_BYTE_EMPTY_FILE_MESSAGE;
  }

  try {
    const bytes = await readImageHeaderBytes(file);

    if (!bytes) {
      return null;
    }

    return detectImageMagicByteMimeType(bytes)
      ? null
      : IMAGE_MAGIC_BYTE_INVALID_MESSAGE;
  } catch {
    return null;
  }
}
