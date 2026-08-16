import type { IyzicoApiResponse } from "@/services/payments/iyzico-client";
import { iyzicoRequest } from "@/services/payments/iyzico-client";

export type IyzicoApprovePaymentItemResponse = IyzicoApiResponse & {
  paymentTransactionId?: string;
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
