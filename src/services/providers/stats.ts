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
  thisWeekEarnings: number;
  lastWeekEarnings: number;
  weeklyTrendPercent: number;
  weeklyTrendDirection: "up" | "down" | "neutral";
  monthlyEarnings: MonthlyEarningsPoint[];
};

export type MonthlyEarningsPoint = {
  completed: number;
  earnings: number;
  label: string;
  month: string;
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

const istanbulMonthFormatter = new Intl.DateTimeFormat("en-CA", { month: "2-digit", timeZone: "Europe/Istanbul", year: "numeric" });
const turkishMonthLabel = new Intl.DateTimeFormat("tr-TR", { month: "short", timeZone: "UTC" });

function istanbulMonthKey(value: string | Date) {
  const parts = istanbulMonthFormatter.formatToParts(new Date(value));
  const year = parts.find(part => part.type === "year")?.value ?? "0000";
  const month = parts.find(part => part.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

/** Last `months` calendar months (Europe/Istanbul), oldest first, including empty months. */
export function buildMonthlyEarnings(
  completedRequests: Array<Pick<StatsRequestRow, "created_at" | "offered_price">>,
  months = 6,
  now: Date = new Date(),
): MonthlyEarningsPoint[] {
  const [currentYear, currentMonth] = istanbulMonthKey(now).split("-").map(Number);
  const points: MonthlyEarningsPoint[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(currentYear, currentMonth - 1 - offset, 15));
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    points.push({ completed: 0, earnings: 0, label: turkishMonthLabel.format(date), month });
  }
  const byMonth = new Map(points.map(point => [point.month, point]));
  for (const request of completedRequests) {
    const point = byMonth.get(istanbulMonthKey(request.created_at));
    if (!point) continue;
    point.completed += 1;
    point.earnings += Number(request.offered_price) || 0;
  }
  return points;
}

function calcResponseRate(total: number, responded: number) {
  if (total === 0) return 100;
  return Math.round((responded / total) * 100);
}

function calcWeeklyTrend(completedRequests: StatsRequestRow[]) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const thisWeekCompleted = completedRequests.filter((r) => r.created_at >= sevenDaysAgo);
  const lastWeekCompleted = completedRequests.filter(
    (r) => r.created_at >= fourteenDaysAgo && r.created_at < sevenDaysAgo,
  );

  const thisWeekEarnings = thisWeekCompleted.reduce(
    (sum, r) => sum + (Number(r.offered_price) || 0),
    0,
  );
  const lastWeekEarnings = lastWeekCompleted.reduce(
    (sum, r) => sum + (Number(r.offered_price) || 0),
    0,
  );

  let percentChange = 0;
  let direction: "up" | "down" | "neutral" = "neutral";

  if (lastWeekEarnings === 0) {
    if (thisWeekEarnings > 0) {
      percentChange = 100;
      direction = "up";
    } else {
      percentChange = 0;
      direction = "neutral";
    }
  } else {
    const diff = thisWeekEarnings - lastWeekEarnings;
    percentChange = Math.round((Math.abs(diff) / lastWeekEarnings) * 100);
    direction = diff > 0 ? "up" : diff < 0 ? "down" : "neutral";
  }

  return {
    thisWeekEarnings,
    lastWeekEarnings,
    weeklyTrendPercent: percentChange,
    weeklyTrendDirection: direction,
  };
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
    thisWeekEarnings: 0,
    lastWeekEarnings: 0,
    weeklyTrendPercent: 0,
    weeklyTrendDirection: "neutral",
    monthlyEarnings: buildMonthlyEarnings([]),
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

    const weeklyTrend = calcWeeklyTrend(completed);

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
      ...weeklyTrend,
      monthlyEarnings: buildMonthlyEarnings(completed),
    };
  } catch {
    return emptyStats;
  }
}
