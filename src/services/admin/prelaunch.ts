import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
export type CapacityRow = { district_id: string; district: string; category_id: string; category: string; applications: number; published: number; verified: number; stores: number; calendars: number; interest: number };
export type PrelaunchSnapshot = { version: number; active_categories?: number; pending_applications?: number; review_required?: number; network: { applications: number; pending: number; unclassified: number; published: number; verified: number; stores: number; calendars: number }; interest: number; pilot: CapacityRow[]; capacity?: CapacityRow[]; readiness?: { pending_real_applications: number; ready: number; incomplete: number; missing_verification: number }; settings: Record<string,string> };

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const count = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0;
function capacityRows(value: unknown): value is CapacityRow[] {
  return Array.isArray(value) && value.every(row => record(row) && ["district_id", "district", "category_id", "category"].every(key => typeof row[key] === "string") && ["applications", "published", "verified", "stores", "calendars", "interest"].every(key => count(row[key])));
}
function validSnapshot(data: unknown): data is PrelaunchSnapshot {
  if (!record(data) || typeof data.version !== "number" || ![1, 2].includes(data.version) || !record(data.network) || !count(data.interest) || !capacityRows(data.pilot) || !record(data.settings)) return false;
  if (!["applications", "pending", "unclassified", "published", "verified", "stores", "calendars"].every(key => count((data.network as Record<string, unknown>)[key]))) return false;
  if (!Object.values(data.settings).every(value => typeof value === "string")) return false;
  if (["active_categories", "pending_applications", "review_required"].some(key => data[key] !== undefined && !count(data[key]))) return false;
  if ((data.version === 2 || data.capacity !== undefined) && !capacityRows(data.capacity)) return false;
  if ((data.version === 2 || data.readiness !== undefined) && (!record(data.readiness) || !["pending_real_applications", "ready", "incomplete", "missing_verification"].every(key => count((data.readiness as Record<string, unknown>)[key])))) return false;
  return true;
}
export async function getPrelaunchSnapshot(): Promise<PrelaunchSnapshot | null> {
  const { supabase, user, profile } = await getServerAuthContext();
  if (!supabase || !user || !hasAdminRole(profile)) return null;
  try {
    const { data, error } = await supabase.rpc("admin_control_snapshot", {}).abortSignal(AbortSignal.timeout(8000));
    return error || !validSnapshot(data) ? null : data;
  } catch {
    return null;
  }
}
