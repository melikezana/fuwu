import type { IyzicoApiResponse } from "@/services/payments/iyzico-client";
import { iyzicoRequest } from "@/services/payments/iyzico-client";

export type IyzicoCheckoutBuyer = {
  city: string;
  country: string;
  email: string;
  gsmNumber?: string;
  id: string;
  identityNumber: string;
  ip: string;
  name: string;
  registrationAddress: string;
  surname: string;
  zipCode: string;
};

export type IyzicoCheckoutAddress = {
  address: string;
  city: string;
  contactName: string;
  country: string;
  zipCode: string;
};

export type IyzicoCheckoutBasketItem = {
  category1: string;
  category2?: string;
  id: string;
  itemType: "PHYSICAL" | "VIRTUAL";
  name: string;
  price: number;
  subMerchantKey: string;
  subMerchantPrice: number;
};

export type InitializeIyzicoCheckoutInput = {
  basketId: string;
  basketItems: IyzicoCheckoutBasketItem[];
  billingAddress: IyzicoCheckoutAddress;
  buyer: IyzicoCheckoutBuyer;
  callbackUrl: string;
  conversationId: string;
  paidPrice: number;
  price: number;
  shippingAddress: IyzicoCheckoutAddress;
};

export type InitializeIyzicoCheckoutResponse = IyzicoApiResponse & {
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  signature?: string;
  token?: string;
};

export type IyzicoPaymentItemTransaction = {
  paymentTransactionId?: string;
  price?: number | string;
  subMerchantKey?: string;
  subMerchantPrice?: number | string;
};

export type RetrieveIyzicoCheckoutResponse = IyzicoApiResponse & {
  basketId?: string;
  currency?: string;
  itemTransactions?: IyzicoPaymentItemTransaction[];
  paidPrice?: number | string;
  paymentId?: string;
  paymentStatus?: string;
  price?: number | string;
  signature?: string;
  token?: string;
};

export function initializeIyzicoCheckoutForm(
  input: InitializeIyzicoCheckoutInput,
) {
  return iyzicoRequest<InitializeIyzicoCheckoutResponse>({
    body: {
      basketId: input.basketId,
      basketItems: input.basketItems,
      billingAddress: input.billingAddress,
      buyer: input.buyer,
      callbackUrl: input.callbackUrl,
      conversationId: input.conversationId,
      currency: "TRY",
      enabledInstallments: [1],
      locale: "tr",
      paidPrice: input.paidPrice,
      paymentGroup: "PRODUCT",
      price: input.price,
      shippingAddress: input.shippingAddress,
    },
    path: "/payment/iyzipos/checkoutform/initialize/auth/ecom",
  });
}

export function retrieveIyzicoCheckoutFormResult({
  conversationId,
  token,
}: {
  conversationId: string;
  token: string;
}) {
  return iyzicoRequest<RetrieveIyzicoCheckoutResponse>({
    body: {
      conversationId,
      locale: "tr",
      token,
    },
    path: "/payment/iyzipos/checkoutform/auth/ecom/detail",
  });
}
