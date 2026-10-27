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
export function isVerifiedSettlement(result: { status?: string; paymentTransactionId?: string; currency?: string; price?: unknown }, itemId: string, kind: "release" | "refund", totalMinor = 0) {
  return Boolean(itemId) && result.status === "success" && result.paymentTransactionId === itemId &&
    (kind === "release" || (totalMinor > 0 && result.currency === "TRY" && matchesMoney(result.price, totalMinor)));
}
function matchesMoney(value: unknown, minor: number) {
  return (typeof value === "string" || typeof value === "number") && /^\d+(?:\.\d{1,2}0*)?$/.test(String(value)) && minorAmount(value) === minor;
}
export function verifyCommercePayment(result: RetrieveIyzicoCheckoutResponse, order: Pick<CommerceOrder, "id" | "total_minor" | "provider_gross_minor">, token: string, conversation: string, expected?: { paymentId?: string | null; itemTransactionId?: string | null; submerchantKey?: string | null }) {
  if (result.status !== "success") throw new Error("payment_verification_failed");
  if (result.token !== token || result.conversationId !== conversation || result.basketId !== order.id || result.currency !== "TRY" || !matchesMoney(result.price, order.total_minor) || !matchesMoney(result.paidPrice, order.total_minor)) throw new Error("payment_verification_failed");
  if (result.paymentStatus !== "SUCCESS" && result.paymentStatus !== "FAILURE") throw new Error("payment_not_final");
  if (result.paymentStatus === "SUCCESS" && (!result.paymentId?.trim() || result.fraudStatus !== 1 || result.itemTransactions?.length !== 1 || !result.itemTransactions[0].paymentTransactionId?.trim() || !matchesMoney(result.itemTransactions[0].subMerchantPrice, order.provider_gross_minor) || !matchesMoney(result.itemTransactions[0].price, order.total_minor) || result.itemTransactions[0].itemId !== order.id || (expected?.paymentId && result.paymentId !== expected.paymentId) || (expected?.itemTransactionId && result.itemTransactions[0].paymentTransactionId !== expected.itemTransactionId) || (expected?.submerchantKey && result.itemTransactions[0].subMerchantKey !== expected.submerchantKey))) throw new Error("payment_verification_failed");
  return result.paymentStatus === "SUCCESS";
}
