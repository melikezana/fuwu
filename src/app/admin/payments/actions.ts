"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { refundAdminIyzicoPayment } from "@/services/admin/operations";

const adminPaymentsPath = "/admin/payments";

function getActionRedirectUrl(code: string) {
  return `${adminPaymentsPath}?paymentAction=${encodeURIComponent(code)}`;
}

export async function refundIyzicoPaymentAction(formData: FormData) {
  const paymentIdValue = formData.get("paymentId");
  const paymentId = typeof paymentIdValue === "string" ? paymentIdValue.trim() : "";
  const result = await refundAdminIyzicoPayment(paymentId);

  revalidatePath(adminPaymentsPath);
  redirect(getActionRedirectUrl(result.ok ? "refund-success" : "refund-failed"));
}
