import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  AppError,
  AuthError,
  handleServiceError,
  ValidationError,
} from "@/lib/errors";
import { getSupabaseClientConfig } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
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
};

export type SubmitProviderReviewResult = {
  id: string;
};

const fallbackReviewTemplates = [
  {
    rating: 5,
    comment: "Randevu saatine sadık kaldı, işi temiz ve planlı teslim etti.",
    createdAt: "2026-04-18T09:15:00.000Z",
  },
  {
    rating: 5,
    comment: "Fiyatı baştan netleştirdi; iletişimi hızlı ve güven vericiydi.",
    createdAt: "2026-03-29T14:30:00.000Z",
  },
  {
    rating: 4,
    comment: "Detayları sakin anlattı, küçük ek işleri de aynı randevuda çözdü.",
    createdAt: "2026-03-11T11:05:00.000Z",
  },
  {
    rating: 5,
    comment: "Evin düzenine özen gösterdi ve işi beklediğimden hızlı bitirdi.",
    createdAt: "2026-02-22T16:45:00.000Z",
  },
] satisfies Array<Pick<ProviderReview, "comment" | "rating"> & { createdAt: string }>;

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
    comment: sanitizeText(record.comment ?? "", 700) || "Yorum metni paylaşılmadı.",
    createdAt: record.created_at,
  };
}

function createFallbackReviews(providerId: string): ProviderReview[] {
  return fallbackReviewTemplates.map((review, index) => ({
    id: `${providerId}-fallback-review-${index + 1}`,
    providerId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
  }));
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
    logContext: "Review Supabase read failed. Falling back to static review data.",
    publicMessage: "Yorumlar şu anda canlı veriden yüklenemedi.",
  });
}

function getFallbackProviderReviews(providerId: string): ProviderReviewsResult {
  const reviews = createFallbackReviews(providerId);

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

    const { data, error } = await supabase
      .from("reviews")
      .select("id, provider_id, rating, comment, created_at")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    if (error) {
      warnReviewFallback(error);
      return null;
    }

    return ((data ?? []) as SupabaseReviewRow[]).map(mapSupabaseReview);
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

  return getFallbackProviderReviews(providerId);
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

  const { data: eligibleRequest, error: eligibilityError } = await supabase
    .from("service_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("assigned_provider_id", input.providerId)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  if (eligibilityError) {
    throw handleServiceError(eligibilityError, {
      logContext: "Review eligibility lookup failed.",
      publicMessage: "Yorum uygunluğu şu anda kontrol edilemedi.",
      tableName: "service_requests",
    });
  }

  if (!eligibleRequest) {
    throw new AppError("review-not-eligible", {
      code: "review-not-eligible",
      publicMessage:
        "Bu ustaya yorum yazabilmek için tamamlanmış bir hizmet talebin olmalı.",
      statusCode: 403,
    });
  }

  const { data: reviewId, error } = await supabase.rpc("submit_provider_review", {
    p_comment: validation.data.comment,
    p_provider_id: input.providerId,
    p_rating: validation.data.rating,
  });

  if (error) {
    const normalizedMessage = error.message.toLocaleLowerCase("en");

    if (
      error.code === "23505" ||
      normalizedMessage.includes("review-already-submitted")
    ) {
      throw new ValidationError("Review already submitted.", {
        cause: error,
        publicMessage: "Bu usta için daha önce yorum yazdın.",
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
          "Bu ustaya yorum yazabilmek için tamamlanmış bir hizmet talebin olmalı.",
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
