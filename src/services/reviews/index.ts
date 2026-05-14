import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClientConfig } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
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
    comment: record.comment?.trim() || "Yorum metni paylaşılmadı.",
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
  if (process.env.NODE_ENV !== "production") {
    console.warn("Review Supabase read failed. Falling back to static review data.", error);
  }
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
