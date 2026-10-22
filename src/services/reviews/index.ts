import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  AppError,
  AuthError,
  handleServiceError,
  ValidationError,
} from "@/lib/errors";
import { getSupabaseClientConfig } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
import {
  sanitizeText,
  validateReviewInput,
  type ReviewInput,
} from "@/lib/validations";
import { isUuid } from "@/lib/utils/validation";

export type ProviderReview = {
  id: string;
  providerId: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type ProviderReviewSource = "supabase" | "fallback";

export type ProviderReviewSummary = {
  averageRating: number;
  reviewCount: number;
};

export type ProviderReviewsResult = {
  reviews: ProviderReview[];
  source: ProviderReviewSource;
  summary: ProviderReviewSummary;
};

type SupabaseReviewRow = Pick<
  Database["public"]["Tables"]["reviews"]["Row"],
  "comment" | "created_at" | "id" | "provider_id" | "rating"
>;

type ReviewSupabaseClient = SupabaseClient<Database>;

export type SubmitProviderReviewInput = ReviewInput & {
  providerId: string;
  orderId?: string;
  requestId?: string;
};

export type ReviewEligibility = { kind: "order" | "request"; id: string; label: string; completedAt: string };

export async function getReviewEligibility(providerId: string, supabase: ReviewSupabaseClient): Promise<ReviewEligibility[]> {
  if (!isUuid(providerId)) return [];
  const { data, error } = await supabase.rpc("review_eligible_sources", { p_provider_id: providerId });
  // An unavailable eligibility check must never open the form.
  return error || !Array.isArray(data) ? [] : data as unknown as ReviewEligibility[];
}

export type SubmitProviderReviewResult = {
  id: string;
};

const providerReviewRateLimitMessage =
  "Kısa sürede çok sayıda yorum gönderdin. Lütfen biraz sonra tekrar dene.";

const providerReviewSubmitRateLimit = {
  action: "provider_review_submit",
  limit: 5,
  windowMs: 10 * 60 * 1000,
} as const;

function createReviewsSupabaseClient(): SupabaseClient<Database> | null {
  const config = getSupabaseClientConfig();

  if (!config) {
    return null;
  }

  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function normalizeRating(value: number | null | undefined) {
  const rating = Number(value ?? 0);

  if (!Number.isFinite(rating)) {
    return 0;
  }

  return Math.min(5, Math.max(0, rating));
}

function mapSupabaseReview(record: SupabaseReviewRow): ProviderReview {
  return {
    id: record.id,
    providerId: record.provider_id,
    rating: normalizeRating(record.rating),
    comment: sanitizeText(record.comment ?? "", 1000) || "Yorum metni paylaşılmadı.",
    createdAt: record.created_at,
  };
}

function calculateReviewSummary(reviews: ProviderReview[]): ProviderReviewSummary {
  if (reviews.length === 0) {
    return {
      averageRating: 0,
      reviewCount: 0,
    };
  }

  const totalRating = reviews.reduce((total, review) => total + review.rating, 0);

  return {
    averageRating: Math.round((totalRating / reviews.length) * 10) / 10,
    reviewCount: reviews.length,
  };
}

function warnReviewFallback(error: unknown) {
  handleServiceError(error, {
    logContext: "Review Supabase read failed. Returning unavailable review state.",
    publicMessage: "Yorumlar şu anda canlı veriden yüklenemedi.",
  });
}

function getFallbackProviderReviews(): ProviderReviewsResult {
  const reviews: ProviderReview[] = [];

  return {
    reviews,
    source: "fallback",
    summary: calculateReviewSummary(reviews),
  };
}

async function fetchProviderReviewsFromSupabase(
  providerId: string,
): Promise<ProviderReview[] | null> {
  try {
    if (!isUuid(providerId)) {
      return null;
    }

    const supabase = createReviewsSupabaseClient();

    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase.rpc("public_provider_reviews", { p_provider_id: providerId });

    if (error) {
      warnReviewFallback(error);
      return null;
    }

    return ((data ?? []) as unknown as SupabaseReviewRow[]).map(mapSupabaseReview);
  } catch (error) {
    warnReviewFallback(error);
    return null;
  }
}

export async function getProviderReviews(providerId: string): Promise<ProviderReviewsResult> {
  const reviews = await fetchProviderReviewsFromSupabase(providerId);

  if (reviews) {
    return {
      reviews,
      source: "supabase",
      summary: calculateReviewSummary(reviews),
    };
  }

  return getFallbackProviderReviews();
}

async function assertProviderReviewRateLimit(
  supabase: ReviewSupabaseClient,
  userId: string,
) {
  const result = await checkRateLimitWithRedis({
    action: providerReviewSubmitRateLimit.action,
    limit: providerReviewSubmitRateLimit.limit,
    supabase,
    userId,
    windowMs: providerReviewSubmitRateLimit.windowMs,
  });

  if (!result.allowed) {
    throw new ValidationError("Provider review submit rate limit exceeded.", {
      publicMessage: providerReviewRateLimitMessage,
      statusCode: 429,
    });
  }
}

export async function submitProviderReview(
  input: SubmitProviderReviewInput,
  supabase: ReviewSupabaseClient,
): Promise<SubmitProviderReviewResult> {
  if (!isUuid(input.providerId)) {
    throw new ValidationError("Review provider id is invalid.", {
      publicMessage: "Usta bilgisi geçerli değil.",
    });
  }

  const validation = validateReviewInput(input);

  if (!validation.ok) {
    throw new ValidationError("Review input validation failed.", {
      publicMessage: validation.message,
    });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError("Review submission requires authentication.", {
      cause: authError,
      publicMessage: "Yorum yazmak için giriş yapmalısın.",
    });
  }

  await assertProviderReviewRateLimit(supabase, user.id);

  if ((input.orderId && !isUuid(input.orderId)) || (input.requestId && !isUuid(input.requestId))) {
    throw new ValidationError("Invalid review source.", { publicMessage: "Hizmet kaydı geçerli değil." });
  }
  // Older callers retain the legacy RPC; new callers always send an explicit source.
  const result = input.orderId || input.requestId ? await supabase.rpc("submit_service_review", {
    p_provider_id: input.providerId,
    p_order_id: input.orderId ?? null,
    p_request_id: input.requestId ?? null,
    p_comment: validation.data.comment,
    p_rating: validation.data.rating,
  }) : await supabase.rpc("submit_provider_review", {
    p_comment: validation.data.comment,
    p_provider_id: input.providerId,
    p_rating: validation.data.rating,
  });
  const { data: reviewId, error } = result;

  if (error) {
    const normalizedMessage = error.message.toLocaleLowerCase("en");

    if (
      error.code === "23505" ||
      normalizedMessage.includes("review-already-submitted")
    ) {
      throw new ValidationError("Review already submitted.", {
        cause: error,
        publicMessage: "Bu hizmeti daha önce değerlendirdin.",
      });
    }

    if (
      error.code === "42501" ||
      normalizedMessage.includes("review-not-eligible")
    ) {
      throw new AppError("review-not-eligible", {
        cause: error,
        code: "review-not-eligible",
        publicMessage:
          "Yalnızca sana ait, tamamlanmış ve henüz değerlendirilmemiş hizmeti değerlendirebilirsin.",
        statusCode: 403,
      });
    }

    throw handleServiceError(error, {
      logContext: "Provider review submission failed.",
      publicMessage: "Yorumun gönderilemedi. Lütfen tekrar dene.",
      tableName: "reviews",
    });
  }

  return { id: reviewId };
}
