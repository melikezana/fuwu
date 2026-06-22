"use server";

import { revalidatePath } from "next/cache";
import { getPublicErrorMessage } from "@/lib/errors";
import { getServerAuthContext } from "@/services/auth/server";
import {
  submitProviderReview,
  type SubmitProviderReviewInput,
} from "@/services/reviews";

export type SubmitProviderReviewActionResult =
  | {
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

export async function submitProviderReviewAction(
  input: SubmitProviderReviewInput,
): Promise<SubmitProviderReviewActionResult> {
  try {
    const authContext = await getServerAuthContext();

    if (!authContext.supabase) {
      return {
        message: "Yorum yazmak için giriş yapmalısın.",
        ok: false,
      };
    }

    await submitProviderReview(input, authContext.supabase);
    revalidatePath(`/providers/${input.providerId}`);
    revalidatePath("/dashboard");

    return { ok: true };
  } catch (error) {
    return {
      message: getPublicErrorMessage(
        error,
        "Yorumun gönderilemedi. Lütfen tekrar dene.",
      ),
      ok: false,
    };
  }
}
