import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { isUuid } from "@/lib/utils/validation";

export const APPLICATION_SOURCE_KINDS = ["real", "test", "incomplete"] as const;
export type ApplicationSourceKind = (typeof APPLICATION_SOURCE_KINDS)[number] | "unclassified";
export const APPLICATION_SOURCE_LABELS: Record<ApplicationSourceKind, string> = {
  unclassified: "Kaynağı incelenmedi",
  real: "Gerçek başvuru",
  test: "Deneme kaydı",
  incomplete: "Eksik başvuru",
};
export type ApplicationSource = { linked: boolean; has_provider: boolean; source_kind: ApplicationSourceKind; note: string | null; reviewed_at: string | null };

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const kinds: readonly string[] = ["unclassified", ...APPLICATION_SOURCE_KINDS];

// Bozuk ya da eksik yanıt "bağlı" ya da "gerçek" sayılmaz; ekran bilinmiyor der.
export function parseApplicationSources(data: unknown): Record<string, ApplicationSource> | null {
  if (!record(data)) return null;
  for (const [id, value] of Object.entries(data)) {
    if (!isUuid(id) || !record(value) || typeof value.linked !== "boolean" || typeof value.has_provider !== "boolean" || typeof value.source_kind !== "string" || !kinds.includes(value.source_kind)) return null;
    if (value.note !== null && typeof value.note !== "string") return null;
    if (value.reviewed_at !== null && typeof value.reviewed_at !== "string") return null;
  }
  return data as Record<string, ApplicationSource>;
}

export async function getApplicationSources(): Promise<Record<string, ApplicationSource> | null> {
  const { supabase, user, profile } = await getServerAuthContext();
  if (!supabase || !user || !hasAdminRole(profile)) return null;
  try {
    const { data, error } = await supabase.rpc("admin_application_sources", {}).abortSignal(AbortSignal.timeout(8000));
    return error ? null : parseApplicationSources(data);
  } catch {
    return null;
  }
}

export type ClassifyResult = "saved" | "invalid" | "forbidden" | "failed";
export async function classifyApplicationSource(applicationId: string, kind: string, note: string): Promise<ClassifyResult> {
  const trimmed = note.trim();
  if (!isUuid(applicationId) || !(APPLICATION_SOURCE_KINDS as readonly string[]).includes(kind) || trimmed.length < 10 || trimmed.length > 500) return "invalid";
  const { supabase, user, profile } = await getServerAuthContext();
  if (!supabase || !user || !hasAdminRole(profile)) return "forbidden";
  try {
    const { error } = await supabase.rpc("admin_classify_application", { p_application_id: applicationId, p_kind: kind, p_note: trimmed }).abortSignal(AbortSignal.timeout(8000));
    return !error ? "saved" : error.code === "42501" ? "forbidden" : error.code === "22023" ? "invalid" : "failed";
  } catch {
    return "failed";
  }
}
