import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { SERVICE_REQUEST_STATUSES } from "@/lib/constants/statuses";

export type ProviderStats = {
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  acceptedRequests: number;
  totalEarnings: number;
  averageRating: number;
  reviewCount: number;
  responseRate: number;
  thisMonthCompleted: number;
  thisMonthEarnings: number;
};

type StatsRequestRow = {
  id: string;
  status: string;
  offered_price: number | null;
  created_at: string;
};

type StatsReviewRow = {
  rating: number;
};

function getThisMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function calcResponseRate(total: number, responded: number) {
  if (total === 0) return 100;
  return Math.round((responded / total) * 100);
}

export async function getProviderStats(
  providerId: string,
  supabase: SupabaseClient<Database>,
): Promise<ProviderStats> {
  const emptyStats: ProviderStats = {
    totalRequests: 0,
    completedRequests: 0,
    pendingRequests: 0,
    rejectedRequests: 0,
    acceptedRequests: 0,
    totalEarnings: 0,
    averageRating: 0,
    reviewCount: 0,
    responseRate: 100,
    thisMonthCompleted: 0,
    thisMonthEarnings: 0,
  };

  try {
    const [requestsResult, reviewsResult] = await Promise.all([
      supabase
        .from("service_requests")
        .select("id, status, offered_price, created_at")
        .eq("assigned_provider_id", providerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("reviews")
        .select("rating")
        .eq("provider_id", providerId),
    ]);

    if (requestsResult.error || reviewsResult.error) {
      return emptyStats;
    }

    const requests = (requestsResult.data ?? []) as StatsRequestRow[];
    const reviews = (reviewsResult.data ?? []) as StatsReviewRow[];
    const monthStart = getThisMonthStart();

    const completed = requests.filter(
      (r) => r.status === SERVICE_REQUEST_STATUSES.completed,
    );
    const pending = requests.filter(
      (r) =>
        r.status === SERVICE_REQUEST_STATUSES.pending ||
        r.status === SERVICE_REQUEST_STATUSES.assigned,
    );
    const rejected = requests.filter(
      (r) => r.status === SERVICE_REQUEST_STATUSES.rejected,
    );
    const accepted = requests.filter(
      (r) =>
        r.status === SERVICE_REQUEST_STATUSES.accepted ||
        r.status === SERVICE_REQUEST_STATUSES.inProgress,
    );

    const thisMonthCompleted = completed.filter(
      (r) => r.created_at >= monthStart,
    );

    const totalEarnings = completed.reduce(
      (sum, r) => sum + (Number(r.offered_price) || 0),
      0,
    );
    const thisMonthEarnings = thisMonthCompleted.reduce(
      (sum, r) => sum + (Number(r.offered_price) || 0),
      0,
    );

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    const responded = accepted.length + rejected.length + completed.length;

    return {
      totalRequests: requests.length,
      completedRequests: completed.length,
      pendingRequests: pending.length,
      rejectedRequests: rejected.length,
      acceptedRequests: accepted.length,
      totalEarnings,
      averageRating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length,
      responseRate: calcResponseRate(requests.length, responded),
      thisMonthCompleted: thisMonthCompleted.length,
      thisMonthEarnings,
    };
  } catch {
    return emptyStats;
  }
}
