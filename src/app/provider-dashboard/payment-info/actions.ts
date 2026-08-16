"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appRoutes } from "@/lib/constants/navigation";
import type { Database } from "@/lib/supabase/types";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
import { sanitizePhone, sanitizeText } from "@/lib/validations";
import { getServerAuthContext } from "@/services/auth/server";
import { writeAuditLog } from "@/services/audit";
import { createIyzicoSubmerchant } from "@/services/payments/iyzico-submerchant";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";

type ProviderUpdate = Database["public"]["Tables"]["providers"]["Update"];

const paymentInfoPath = appRoutes.providerDashboardPaymentInfo;

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toLocaleUpperCase("tr");
}

function normalizeIdentityNumber(value: string) {
  return value.replace(/\D/g, "");
}

function getActionRedirectUrl(code: string) {
  return `${paymentInfoPath}?paymentInfoAction=${encodeURIComponent(code)}`;
}

function redirectToPaymentInfoMessage(code: string): never {
  revalidatePath(paymentInfoPath);
  revalidatePath(appRoutes.providerDashboard);
  revalidatePath(appRoutes.providerDashboardRequests);
  redirect(getActionRedirectUrl(code));
}

function validatePaymentInfoInput(formData: FormData) {
  const payoutIban = normalizeIban(getFormString(formData, "payoutIban"));
  const taxIdentityNumber = normalizeIdentityNumber(
    getFormString(formData, "taxIdentityNumber"),
  );
  const taxOffice = sanitizeText(getFormString(formData, "taxOffice"), 120);
  const legalName = sanitizeText(getFormString(formData, "legalName"), 180);
  const payoutAddress = sanitizeText(getFormString(formData, "payoutAddress"), 255);

  if (!/^TR\d{24}$/.test(payoutIban)) {
    return { code: "payment-info-invalid-iban" as const };
  }

  if (![10, 11].includes(taxIdentityNumber.length)) {
    return { code: "payment-info-invalid-tax-id" as const };
  }

  if (taxIdentityNumber.length === 10 && taxOffice.length < 3) {
    return { code: "payment-info-tax-office-required" as const };
  }

  if (legalName.length < 3) {
    return { code: "payment-info-invalid-legal-name" as const };
  }

  if (payoutAddress.length < 5) {
    return { code: "payment-info-invalid-address" as const };
  }

  return {
    code: "ok" as const,
    legalName,
    payoutAddress,
    payoutIban,
    taxIdentityNumber,
    taxOffice,
  };
}

export async function updateProviderPaymentInfoAction(formData: FormData) {
  const input = validatePaymentInfoInput(formData);

  if (input.code !== "ok") {
    redirectToPaymentInfoMessage(input.code);
  }

  const [providerAccess, authContext] = await Promise.all([
    getProviderDashboardAccess(),
    getServerAuthContext(),
  ]);

  if (!providerAccess.ok || !authContext.supabase || !authContext.user) {
    redirectToPaymentInfoMessage("provider-not-authorized");
  }

  const email = authContext.user.email?.trim();
  const gsmNumber = sanitizePhone(providerAccess.profile.phone);

  if (!email) {
    redirectToPaymentInfoMessage("payment-info-missing-email");
  }

  if (!gsmNumber) {
    redirectToPaymentInfoMessage("payment-info-missing-phone");
  }

  const rateLimitResult = await checkRateLimitWithRedis({
    action: `provider:iyzico_onboarding:${providerAccess.profile.id}`,
    limit: 5,
    supabase: authContext.supabase,
    userId: authContext.user.id,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimitResult.allowed) {
    redirectToPaymentInfoMessage("payment-info-rate-limited");
  }

  const now = new Date().toISOString();
  const conversationId = `provider-${providerAccess.profile.id}-${Date.now()}`;
  const baseUpdatePayload: ProviderUpdate = {
    iyzico_submerchant_conversation_id: conversationId,
    iyzico_submerchant_status: "pending_review",
    legal_name: input.legalName,
    payout_address: input.payoutAddress,
    payout_iban: input.payoutIban,
    tax_identity_number: input.taxIdentityNumber,
    tax_office: input.taxOffice || null,
    updated_at: now,
  };
  const { error: baseUpdateError } = await authContext.supabase
    .from("providers")
    .update(baseUpdatePayload)
    .eq("id", providerAccess.profile.id)
    .eq("user_id", authContext.user.id)
    .select("id")
    .maybeSingle();

  if (baseUpdateError) {
    console.error("[Fuwu] Provider payment info update failed.", {
      providerId: providerAccess.profile.id,
      error: baseUpdateError,
    });
    redirectToPaymentInfoMessage("payment-info-update-failed");
  }

  let subMerchantKey = "";

  try {
    const iyzicoResponse = await createIyzicoSubmerchant({
      address: input.payoutAddress,
      conversationId,
      email,
      gsmNumber,
      iban: input.payoutIban,
      legalName: input.legalName,
      subMerchantExternalId: providerAccess.profile.id,
      taxIdentityNumber: input.taxIdentityNumber,
      taxOffice: input.taxOffice,
    });

    subMerchantKey = iyzicoResponse.subMerchantKey?.trim() ?? "";
  } catch (error) {
    console.error("[Fuwu] iyzico submerchant creation failed.", {
      providerId: providerAccess.profile.id,
      error,
    });
    redirectToPaymentInfoMessage("payment-info-iyzico-failed");
  }

  if (!subMerchantKey) {
    redirectToPaymentInfoMessage("payment-info-iyzico-missing-key");
  }

  const { error: keyUpdateError } = await authContext.supabase
    .from("providers")
    .update({
      iyzico_submerchant_key: subMerchantKey,
      iyzico_submerchant_status: "pending_review",
      updated_at: new Date().toISOString(),
    } satisfies ProviderUpdate)
    .eq("id", providerAccess.profile.id)
    .eq("user_id", authContext.user.id)
    .select("id")
    .maybeSingle();

  if (keyUpdateError) {
    console.error("[Fuwu] Provider iyzico submerchant key update failed.", {
      providerId: providerAccess.profile.id,
      error: keyUpdateError,
    });
    redirectToPaymentInfoMessage("payment-info-update-failed");
  }

  await writeAuditLog(
    {
      action: "provider.payment_onboarding_submitted",
      actorUserId: authContext.user.id,
      entityId: providerAccess.profile.id,
      entityType: "provider",
      metadata: {
        conversationId,
        hasSubMerchantKey: Boolean(subMerchantKey),
        submerchantStatus: "pending_review",
      },
    },
    authContext.supabase,
  );

  redirectToPaymentInfoMessage("payment-info-submitted");
}
