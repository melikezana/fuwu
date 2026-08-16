import type { IyzicoApiResponse } from "@/services/payments/iyzico-client";
import { iyzicoRequest } from "@/services/payments/iyzico-client";

export type IyzicoApprovePaymentItemResponse = IyzicoApiResponse & {
  paymentTransactionId?: string;
};

export type IyzicoRefundPaymentResponse = IyzicoApiResponse & {
  currency?: string;
  paymentId?: string;
  paymentTransactionId?: string;
  price?: number | string;
  refundHostReference?: string;
};

export function approveIyzicoPaymentItem({
  conversationId,
  paymentTransactionId,
}: {
  conversationId: string;
  paymentTransactionId: string;
}) {
  return iyzicoRequest<IyzicoApprovePaymentItemResponse>({
    body: {
      conversationId,
      locale: "tr",
      paymentTransactionId,
    },
    path: "/payment/iyzipos/item/approve",
  });
}

export function refundIyzicoPayment({
  conversationId,
  ip,
  paymentTransactionId,
  price,
}: {
  conversationId: string;
  ip?: string;
  paymentTransactionId: string;
  price: number;
}) {
  return iyzicoRequest<IyzicoRefundPaymentResponse>({
    body: {
      conversationId,
      currency: "TRY",
      ip: ip || "127.0.0.1",
      locale: "tr",
      paymentTransactionId,
      price,
    },
    path: "/payment/refund",
  });
}
