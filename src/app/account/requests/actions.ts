"use server";

import { revalidatePath } from "next/cache";
import { getPublicErrorMessage } from "@/lib/errors";
import { getServerAuthContext } from "@/services/auth/server";
import { confirmPaymentByCustomer } from "@/services/payments";

export type ConfirmPaymentActionResult =
  | {
      amount: number | null;
      currency: "TRY";
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

export async function confirmPaymentByCustomerAction(
  requestId: string,
  verificationCode: string,
): Promise<ConfirmPaymentActionResult> {
  try {
    const authContext = await getServerAuthContext();

    if (!authContext.supabase) {
      return {
        message: "Ödemeyi onaylamak için giriş yapmalısın.",
        ok: false,
      };
    }

    const payment = await confirmPaymentByCustomer(
      requestId,
      verificationCode,
      authContext.supabase,
    );
    revalidatePath("/account/requests");
    revalidatePath("/dashboard/requests");
    revalidatePath("/dashboard");
    revalidatePath(`/order-tracking/${requestId}`);

    return {
      amount: payment.amount,
      currency: "TRY",
      ok: true,
    };
  } catch (error) {
    return {
      message: getPublicErrorMessage(
        error,
        "Ödeme onayı kaydedilemedi. Lütfen tekrar dene.",
      ),
      ok: false,
    };
  }
}
