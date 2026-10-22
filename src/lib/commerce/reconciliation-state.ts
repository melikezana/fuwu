import type { CommerceOrder } from "./types";

type TransactionState = { status: string; payout_state: string; refund_state: string; created_at: string; item_transaction_id?: string | null; has_item_transaction?: boolean };
export function reconciliationReasons(order: CommerceOrder, transaction: TransactionState | null | undefined, now: number): string[] {
  const reasons: string[] = [];
  if (order.payment_status === "PAID" && transaction?.status !== "SUCCEEDED") reasons.push("Ödenmiş siparişin doğrulanmış kuruluş kaydı bulunmuyor.");
  if (["CONFIRMED", "PROVIDER_ON_THE_WAY", "IN_PROGRESS", "COMPLETED"].includes(order.status) && order.payment_status !== "PAID") reasons.push("Hizmet durumu ile ödeme durumu uyuşmuyor.");
  if (transaction?.status === "SUCCEEDED" && ["UNPAID", "FAILED"].includes(order.payment_status)) reasons.push("Başarılı kuruluş kaydı siparişe işlenmemiş.");
  if (transaction?.status === "INITIALIZING" && Date.parse(transaction.created_at) < now - 300000) reasons.push("Ödeme oturumu beş dakikadan uzun süredir hazırlanıyor. Oturumu yeniden başlatmadan kuruluş kaydını inceleyin.");
  if (transaction?.status === "AWAITING" && Date.parse(order.expires_at) <= now) reasons.push("Rezervasyon süresi doldu; kuruluşun nihai ödeme sonucu sorgulanmalı.");
  if (transaction?.status === "SUCCEEDED" && (transaction.item_transaction_id === null || transaction.has_item_transaction === false)) reasons.push("Kuruluşun kalem işlem kimliği eksik; iade veya hak ediş başlatılamıyor.");
  if (transaction?.refund_state === "IN_FLIGHT" || transaction?.payout_state === "IN_FLIGHT") reasons.push("İade veya hak ediş sonucu belirsiz. Aynı işlemi yeniden göndermeyin; iyzico panelindeki sonucu ve audit kaydını karşılaştırın. Ödeme sorgusu bu işlemi tek başına sonuçlandırmaz.");
  return reasons;
}
