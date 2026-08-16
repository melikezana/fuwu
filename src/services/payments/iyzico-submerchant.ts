import type { IyzicoApiResponse } from "@/services/payments/iyzico-client";
import { iyzicoRequest } from "@/services/payments/iyzico-client";

export type IyzicoSubmerchantType = "PERSONAL" | "PRIVATE_COMPANY";

export type CreateIyzicoSubmerchantInput = {
  address: string;
  conversationId: string;
  email: string;
  gsmNumber: string;
  iban: string;
  legalName: string;
  locale?: "tr" | "en";
  subMerchantExternalId: string;
  taxIdentityNumber: string;
  taxOffice?: string | null;
};

export type CreateIyzicoSubmerchantResponse = IyzicoApiResponse & {
  subMerchantKey?: string;
};

function splitLegalName(legalName: string) {
  const parts = legalName.trim().split(/\s+/).filter(Boolean);
  const contactName = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "";
  const contactSurname = parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "";

  return {
    contactName,
    contactSurname,
  };
}

function getSubmerchantType(taxIdentityNumber: string): IyzicoSubmerchantType {
  return taxIdentityNumber.replace(/\D/g, "").length === 10
    ? "PRIVATE_COMPANY"
    : "PERSONAL";
}

export async function createIyzicoSubmerchant(
  input: CreateIyzicoSubmerchantInput,
) {
  const identityDigits = input.taxIdentityNumber.replace(/\D/g, "");
  const subMerchantType = getSubmerchantType(identityDigits);
  const { contactName, contactSurname } = splitLegalName(input.legalName);
  const basePayload = {
    address: input.address,
    conversationId: input.conversationId,
    currency: "TRY",
    email: input.email,
    gsmNumber: input.gsmNumber,
    iban: input.iban.replace(/\s+/g, "").toLocaleUpperCase("tr"),
    legalCompanyTitle: input.legalName,
    locale: input.locale ?? "tr",
    name: input.legalName,
    subMerchantExternalId: input.subMerchantExternalId,
    subMerchantType,
  };
  const payload =
    subMerchantType === "PRIVATE_COMPANY"
      ? {
          ...basePayload,
          taxNumber: identityDigits,
          taxOffice: input.taxOffice?.trim(),
        }
      : {
          ...basePayload,
          contactName,
          contactSurname,
          identityNumber: identityDigits,
        };

  return iyzicoRequest<CreateIyzicoSubmerchantResponse>({
    body: payload,
    path: "/onboarding/submerchant",
  });
}
