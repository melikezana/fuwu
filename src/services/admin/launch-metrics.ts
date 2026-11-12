import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";

export const WEEKLY_METRIC_KEYS = ["applications_received", "providers_approved", "stores_updated", "interest_granted", "interest_withdrawn", "orders_created", "orders_completed", "support_received", "support_resolved"] as const;
export type WeeklyMetricKey = (typeof WEEKLY_METRIC_KEYS)[number];
export type WeeklyLaunchRow = { week_start: string } & Record<WeeklyMetricKey, number>;
export type UnauthorizedActionRow = { day: string; entity_type: string; total: number; anonymous: number; distinct_accounts: number };
export type WeeklyLaunchMetrics = {
  version: 1;
  weeks: WeeklyLaunchRow[];
  totals: { published_providers: number; published_stores: number; consented_interest: number; open_support: number };
  applications: { total: number; linked: number; unlinked: Record<string, number> };
  unauthorized_actions: UnauthorizedActionRow[];
};

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const day = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

// Bilinmeyen veya bozuk yanıt sıfır olarak gösterilmez; panel "okunamadı" der.
export function parseWeeklyLaunchMetrics(data: unknown): WeeklyLaunchMetrics | null {
  if (!record(data) || data.version !== 1 || !Array.isArray(data.weeks) || !record(data.totals) || !record(data.applications) || !Array.isArray(data.unauthorized_actions)) return null;
  if (!data.weeks.every(row => record(row) && day(row.week_start) && WEEKLY_METRIC_KEYS.every(key => count(row[key])))) return null;
  if (!["published_providers", "published_stores", "consented_interest", "open_support"].every(key => count((data.totals as Record<string, unknown>)[key]))) return null;
  const applications = data.applications;
  if (!count(applications.total) || !count(applications.linked) || !record(applications.unlinked) || !Object.values(applications.unlinked).every(count)) return null;
  if (!data.unauthorized_actions.every(row => record(row) && day(row.day) && typeof row.entity_type === "string" && count(row.total) && count(row.anonymous) && count(row.distinct_accounts))) return null;
  return data as unknown as WeeklyLaunchMetrics;
}

export async function getWeeklyLaunchMetrics(weeks = 8): Promise<WeeklyLaunchMetrics | null> {
  const { supabase, user, profile } = await getServerAuthContext();
  if (!supabase || !user || !hasAdminRole(profile)) return null;
  try {
    const { data, error } = await supabase.rpc("admin_weekly_launch_metrics", { p_weeks: weeks }).abortSignal(AbortSignal.timeout(8000));
    return error ? null : parseWeeklyLaunchMetrics(data);
  } catch {
    return null;
  }
}
