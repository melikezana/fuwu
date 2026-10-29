// Exact IDs from supabase/seed/seed.sql. Text heuristics are never deletion evidence.
export const SEEDED_PROVIDER_IDS = Array.from({ length: 13 }, (_, index) =>
  `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);
export type ProviderProvenance = { id: string; record_kind?: string };
export function isRealPublishedProvider(record: ProviderProvenance): boolean {
  return record.record_kind === "real" && !SEEDED_PROVIDER_IDS.includes(record.id);
}
