const invalidImageSignatureMessage =
  "Yalnızca gerçek JPEG, PNG veya WebP dosyaları yüklenebilir. Uzantısı değiştirilmiş dosyalar kabul edilmez.";

const jpegSignature = [0xff, 0xd8, 0xff] as const;
const pngSignature = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
] as const;

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

export async function validateImageMagicBytes(file: File): Promise<string | null> {
  if (file.size === 0) {
    return "Geçersiz dosya";
  }

  try {
    if (typeof file.slice !== "function") {
      return null;
    }

    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const isJpeg = hasSignature(bytes, jpegSignature);
    const isPng = hasSignature(bytes, pngSignature);
    const isWebp =
      hasAsciiSignature(bytes, "RIFF", 0) && hasAsciiSignature(bytes, "WEBP", 8);

    return isJpeg || isPng || isWebp ? null : invalidImageSignatureMessage;
  } catch {
    return null;
  }
}
