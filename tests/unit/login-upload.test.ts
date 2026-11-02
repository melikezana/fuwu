import { describe, expect, it } from "vitest";
import { validateLoginPhoneInput } from "@/lib/validations/authSchemas";
import { RAW_IMAGE_MAX_BYTES, validateRawImageFile } from "@/lib/utils/resizeImageForUpload";

describe("SMS ile giriş numarası", () => {
  it("cep telefonunu farklı yazımlarda aynı biçime çevirir", () => {
    for (const value of ["0532 123 45 67", "5321234567", "+90 532 123 45 67", "(0532) 123-45-67"]) {
      expect(validateLoginPhoneInput(value)).toMatchObject({ ok: true, data: { phone: "+905321234567" } });
    }
  });
  it("sabit hattı ve eksik haneli numarayı reddeder", () => {
    expect(validateLoginPhoneInput("0216 123 45 67").ok).toBe(false);
    expect(validateLoginPhoneInput("0532 123 45 6").ok).toBe(false);
  });
});

describe("usta fotoğrafı ön kontrolü", () => {
  const file = (name: string, type: string, size: number) => new File([new Uint8Array(size)], name, { type });
  it("telefon fotoğrafını boyutu yüzünden küçültmeden önce reddetmez", () => {
    expect(validateRawImageFile(file("IMG_1.JPG", "image/jpeg", 9 * 1024 * 1024))).toBeNull();
  });
  it("aşırı büyük, HEIC ve desteklenmeyen dosyaya anlaşılır mesaj verir", () => {
    expect(validateRawImageFile(file("a.jpg", "image/jpeg", RAW_IMAGE_MAX_BYTES + 1))).toContain("25 MB");
    expect(validateRawImageFile(file("IMG_2.HEIC", "image/heic", 10))).toContain("HEIC");
    expect(validateRawImageFile(file("a.gif", "image/gif", 10))).toContain("JPG");
  });
});
