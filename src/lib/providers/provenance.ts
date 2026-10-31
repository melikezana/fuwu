// Exact IDs from supabase/seed/seed.sql. Text heuristics are never deletion evidence.
export const SEEDED_PROVIDER_IDS = Array.from({ length: 13 }, (_, index) =>
  `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);
// Owner-confirmed test profiles, final readiness request (2026-10-31).
// Accounts, applications and history are preserved.
export const CONFIRMED_TEST_PROVIDER_IDS = [
  "4d0d8f4a-692e-4792-9fa6-5877ba76c55f",
  "78bc496a-7f93-43fb-8748-33b5d6cde252",
  "8a0fd4ad-4b34-4089-8737-3cebc64e4295",
  "ec711057-c9a3-4a03-9737-4f560e3c39cb",
];
const testProviders = new Set([...SEEDED_PROVIDER_IDS, ...CONFIRMED_TEST_PROVIDER_IDS]);
export type ProviderProvenance = { id: string; record_kind?: string };
export function isRealPublishedProvider(record: ProviderProvenance): boolean {
  return record.record_kind === "real" && !testProviders.has(record.id.toLowerCase());
}
