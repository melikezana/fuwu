export type PartnerReadiness = {
 status: "pending_review" | "approved" | "changes_requested" | "hidden";
 published: boolean; record_kind: string; active: boolean; approved: boolean;
 identity_verified: boolean; phone_verified: boolean; professional_verified: boolean;
 description: string | null; phone: string | null; photo: string | null; category_id: string | null; district_id: string | null;
 service_count: number; calendar_days: number; districts: string[]; has_document: boolean;
 application_status?: "pending" | "approved" | "rejected" | null;
 trust_missing?: string[];
};
export function isPartnerReadiness(value: unknown): value is PartnerReadiness {
 if (!value || typeof value !== "object" || Array.isArray(value)) return false;
 const row = value as Record<string, unknown>;
 return ["pending_review", "approved", "changes_requested", "hidden"].includes(String(row.status)) &&
  ["real", "test", "unclassified"].includes(String(row.record_kind)) &&
  ["published", "active", "approved", "identity_verified", "phone_verified", "professional_verified", "has_document"].every(key => typeof row[key] === "boolean") &&
  ["description", "phone", "photo", "category_id", "district_id"].every(key => row[key] === null || typeof row[key] === "string") &&
  ["service_count", "calendar_days"].every(key => Number.isSafeInteger(row[key]) && Number(row[key]) >= 0) && Number(row.calendar_days) <= 7 &&
  Array.isArray(row.districts) && row.districts.every(district => typeof district === "string") &&
  (row.trust_missing === undefined || (Array.isArray(row.trust_missing) && row.trust_missing.every(item => typeof item === "string"))) &&
  (row.application_status === undefined || row.application_status === null || ["pending", "approved", "rejected"].includes(String(row.application_status)));
}
export const readinessStages = ["Başvuru Alındı", "Profil Hazırlanıyor", "Doğrulama Tamamlandı", "Yayına Hazır"] as const;
export function assessPartnerReadiness(input: PartnerReadiness) {
 const missing = [!input.photo && "Profil fotoğrafı", !input.phone?.trim() && "Telefon", !input.category_id && "Uzmanlık", !input.district_id && "İlçe", (input.description?.trim().length ?? 0) < 30 && "Hizmet açıklaması", input.service_count < 1 && "Hizmetler", input.calendar_days < 1 && "Çalışma takvimi"].filter(Boolean) as string[];
 const documentMissing = input.trust_missing || [];
 const verified = input.identity_verified && input.phone_verified && documentMissing.length === 0;
 const ready = missing.length === 0 && verified && input.published && input.active && input.approved;
 const remainingSteps = missing.length + documentMissing.length + (input.identity_verified ? 0 : 1) + (input.phone_verified ? 0 : 1);
 const lifecycle = !input.active ? "Askıya Alındı" : input.published ? "Yayında" : input.status === "changes_requested" || input.application_status === "rejected" ? "Düzeltme Gerekli" : missing.length ? "Profil Hazırlanıyor" : !verified ? "Doğrulama Bekleniyor" : input.status === "approved" ? "Yayına Hazır" : "İncelemede";
 return { missing, remainingSteps, lifecycle, completion: Math.round((7 - missing.length) / 7 * 100), verified, ready, stage: ready ? 4 : verified ? 3 : 2 };
}
