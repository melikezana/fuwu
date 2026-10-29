import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
type Pilot = { district_id: string; district: string; category_id: string; category: string; applications: number; published: number; verified: number; stores: number; calendars: number; interest: number };
export type PrelaunchSnapshot = { version: number; network: { applications: number; pending: number; unclassified: number; published: number; verified: number; stores: number; calendars: number }; interest: number; pilot: Pilot[]; settings: Record<string,string> };
export async function getPrelaunchSnapshot(): Promise<PrelaunchSnapshot | null> {
  const { supabase, user, profile } = await getServerAuthContext();
  if (!supabase || !user || !hasAdminRole(profile)) return null;
  const { data, error } = await supabase.rpc("admin_prelaunch_snapshot", {}).abortSignal(AbortSignal.timeout(8000));
  if (error || !data || typeof data !== "object" || Array.isArray(data) || data.version !== 1 || !data.network || !Array.isArray(data.pilot)) return null;
  return data as unknown as PrelaunchSnapshot;
}
