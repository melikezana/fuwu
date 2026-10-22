import type { CommerceOrder } from "./types";
import type { RetrieveIyzicoCheckoutResponse } from "@/services/payments/iyzico-checkout";

export function assertSandbox() {
  const url = new URL(process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com");
  if (url.origin !== "https://sandbox-api.iyzipay.com" || url.pathname !== "/" || url.username || url.password) throw new Error("sandbox_unavailable");
  if (!process.env.IYZICO_API_KEY?.trim() || !process.env.IYZICO_SECRET_KEY?.trim()) throw new Error("sandbox_unavailable");
}
export function sandboxPaymentUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !["sandbox-cpp.iyzipay.com", "sandbox-api.iyzipay.com"].includes(url.hostname) || url.username || url.password || url.port) throw new Error("invalid_payment_url");
  return url.toString();
}
export function minorAmount(value: unknown) {
  if ((typeof value !== "string" && typeof value !== "number") || value === "" || !Number.isFinite(Number(value)) || Number(value) < 0) return null;
  return Math.round(Number(value) * 100);
}
export function verifyCommercePayment(result: RetrieveIyzicoCheckoutResponse, order: CommerceOrder, token: string, conversation: string) {
  if (result.status !== "success" && result.paymentStatus !== "FAILURE") throw new Error("payment_verification_failed");
  if (result.token !== token || result.conversationId !== conversation || result.basketId !== order.id || result.currency !== "TRY" || minorAmount(result.price) !== order.total_minor || minorAmount(result.paidPrice) !== order.total_minor) throw new Error("payment_verification_failed");
  if (result.paymentStatus !== "SUCCESS" && result.paymentStatus !== "FAILURE") throw new Error("payment_not_final");
  if (result.paymentStatus === "SUCCESS" && (!result.paymentId || result.fraudStatus !== 1 || result.itemTransactions?.length !== 1 || minorAmount(result.itemTransactions[0].subMerchantPrice) !== order.provider_gross_minor || minorAmount(result.itemTransactions[0].price) !== order.total_minor || result.itemTransactions[0].itemId !== order.id)) throw new Error("payment_verification_failed");
  return result.paymentStatus === "SUCCESS";
}
