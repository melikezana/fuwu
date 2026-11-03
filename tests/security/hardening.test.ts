import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "@/lib/security/cronAuth";

const migration = readFileSync("supabase/migrations/20261103000300_security_hardening.sql", "utf8");
const providerService = readFileSync("src/services/providers/index.ts", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");

describe("cron anahtarı", () => {
  it("yalnızca doğru Bearer anahtarını kabul eder", () => {
    expect(isAuthorizedCronRequest("Bearer gizli-anahtar", "gizli-anahtar")).toBe(true);
    expect(isAuthorizedCronRequest("Bearer gizli-anahtaR", "gizli-anahtar")).toBe(false);
    expect(isAuthorizedCronRequest("gizli-anahtar", "gizli-anahtar")).toBe(false);
    expect(isAuthorizedCronRequest(null, "gizli-anahtar")).toBe(false);
  });
  it("anahtar tanımlı değilse her isteği reddeder", () => {
    expect(isAuthorizedCronRequest("Bearer ", "")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer undefined", undefined)).toBe(false);
  });
});

describe("veri sızıntısı ve depolama", () => {
  it("usta telefonu giriş yapmamış ziyaretçiye kapalı", () => {
    expect(migration).toMatch(/revoke select \(phone, whatsapp\) on public\.providers from anon;/);
    const publicQuery = providerService.match(/const providerSelectQuery = `([^`]*)`/)?.[1] ?? "";
    expect(publicQuery).not.toMatch(/\bphone\b|\bwhatsapp\b/);
  });
  it("herkese açık görsel klasörlerine yalnızca usta hesabı yükleyebilir", () => {
    for (const policy of ["provider_images_insert_own_path", "provider_images_update_own_path", "gallery_storage_provider_upload"]) {
      const block = migration.slice(migration.indexOf(`create policy ${policy}`), migration.indexOf(");", migration.indexOf(`create policy ${policy}`)));
      expect(block).toContain("public.current_user_has_provider()");
    }
  });
  it("SMS kancası yalnızca Türkiye cep numarasına izin verir", () => {
    const pattern = new RegExp(migration.match(/phone !~ '([^']+)'/)![1]);
    expect(pattern.test("905321234567")).toBe(true);
    expect(pattern.test("+905321234567")).toBe(true);
    expect(pattern.test("+447911123456")).toBe(false);
    expect(pattern.test("902161234567")).toBe(false);
  });
});

describe("çerçeve ayarları", () => {
  it("X-Powered-By kapalı ve görsel optimize edici kendi depoyla sınırlı", () => {
    expect(nextConfig).toMatch(/poweredByHeader:\s*false/);
    expect(nextConfig).toMatch(/pathname: "\/storage\/v1\/object\/public\/\*\*"/);
  });
});
