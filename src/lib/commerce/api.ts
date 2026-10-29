import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { logWarn } from "@/lib/logger";
import { assertSameOrigin, boundRequestBody, RequestBoundaryError } from "@/lib/security/requestBoundary";

const requests = new AsyncLocalStorage<string>();
export const commerceRequestId = () => requests.getStore() ?? randomUUID();

const errors: Record<string, [number, string]> = {
  unauthorized: [401, "Devam etmek için giriş yap."],
  forbidden: [403, "Bu işlem için yetkin yok."],
  transition_forbidden: [403, "Bu işlem için yetkin yok."],
  order_not_found: [404, "Sipariş bulunamadı."],
  payment_not_found: [404, "Ödeme kaydı bulunamadı."],
  invalid_selection: [400, "Seçimlerini kontrol edip tekrar dene."],
  invalid_address: [400, "Adresini kontrol et."],
  invalid_completion_code: [400, "Tamamlama kodunu kontrol et."],
  completion_code_locked: [429, "Bir süre bekleyip tekrar dene."],
  code_locked: [429, "Bir süre bekleyip tekrar dene."],
  too_many_holds: [429, "Mevcut siparişini tamamlayıp tekrar dene."],
  rate_limit: [429, "Bir süre bekleyip tekrar dene."],
  payload_too_large: [413, "Gönderilen veri çok büyük."],
  slot_unavailable: [409, "Bu saat artık uygun değil. Yeni bir saat seç."],
  offering_unavailable: [409, "Hizmet şu anda satın alınamıyor."],
  price_changed: [409, "Fiyat güncellendi. Güncel tutarı kontrol et."],
  fee_changed: [409, "Toplam tutar güncellendi. Güncel tutarı kontrol et."],
  fee_consent_required: [409, "Güncel ücretleri onayla."],
  idempotency_conflict: [409, "Bu işlem farklı seçimlerle kullanıldı. Siparişini kontrol et."],
  hold_expired: [409, "Rezervasyonun süresi doldu. Yeni bir saat seç."],
  payment_initializing: [409, "Ödeme işlemi kontrol ediliyor. Siparişini takip et."],
  payment_verification_failed: [502, "Ödeme sonucu doğrulanamadı. Siparişini takip et."],
  payment_update_failed: [503, "Ödeme sonucu kaydedilemedi. Siparişini takip et."],
  invalid_service_variant: [400, "Hizmet paketini kontrol et."],
  invalid_district: [400, "Hizmet bölgesini kontrol et."],
  invalid_hours: [400, "Çalışma saatlerini kontrol et."],
  selection_conflict: [409, "Bu seçimle başka bir kayıt var. Seçimlerini kontrol et."],
  server_payment_only: [403, "Ödeme sonucu sunucuda doğrulanmalı."],
};

// Codes are an exact allowlist. SQL details, processor messages and user input never pass through.
const safeCodes = new Set([
  ...Object.keys(errors), "sandbox_unavailable", "store_unavailable", "pricing_unavailable",
  "variant_unavailable", "invalid_order", "invalid_store", "invalid_capacity", "invalid_variant",
  "invalid_review", "review_not_eligible", "invalid_signature", "invalid_callback", "invalid_token",
  "invalid_payload", "missing_conversation_id", "missing_payment_id", "supabase_not_configured",
  "favorites_unavailable", "expiry_failed", "health_evidence_failed", "service_unavailable",
]);

export function commerceDatabaseError(error: { code?: string; message?: string }) {
  if (error.message && safeCodes.has(error.message)) return error.message;
  if (error.code === "42501") return "forbidden";
  if (error.code === "23505") return "selection_conflict";
  if (error.code === "23503" || error.code === "23514" || error.code?.startsWith("22")) return "invalid_selection";
  return "service_unavailable";
}

export function withCommerceApi<T extends unknown[]>(handler: (request: NextRequest, ...args: T) => Promise<Response>) {
  return async (request: NextRequest, ...args: T) => requests.run(randomUUID(), async () => {
    const requestId = commerceRequestId();
    let response: Response;
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
        const processorCallback = ["/api/commerce/payment-callback", "/api/payments/iyzico/webhook"].includes(request.nextUrl.pathname);
        if (!processorCallback) assertSameOrigin(request);
        const body = await boundRequestBody(request);
        request = new NextRequest(request.url, { method: request.method, headers: request.headers, body });
      }
      response = await handler(request, ...args);
    }
    catch (error) {
      if (error instanceof RequestBoundaryError) response = NextResponse.json({ error: error.code }, { status: error.status });
      else {
      logWarn("Commerce API request failed.", { requestId, classification: "dependency_or_internal_failure" });
      response = NextResponse.json({ error: "service_unavailable" }, { status: 503 });
      }
    }
    if (response.status >= 400) {
      const body = await response.clone().json().catch(() => null);
      const code = typeof body?.error === "string" && safeCodes.has(body.error) ? body.error : "service_unavailable";
      const known = errors[code];
      const status = known?.[0] ?? (code === "service_unavailable" || code === "supabase_not_configured" ? 503 : response.status);
      logWarn("Commerce API returned an error.", { requestId, code, status });
      const headers = new Headers();
      for (const name of ["retry-after", "ratelimit-limit", "ratelimit-remaining", "ratelimit-reset", "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset"]) {
        const value = response.headers.get(name); if (value) headers.set(name, value);
      }
      response = NextResponse.json({ error: code, code, message: known?.[1] ?? (status < 500 ? "İşlem tamamlanamadı. Seçimlerini kontrol et." : "Hizmet geçici olarak kullanılamıyor. Lütfen tekrar dene."), requestId }, { status, headers });
    }
    response.headers.set("x-request-id", requestId);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  });
}
