import type { Json } from "@/lib/supabase/types";
export const documentStatusLabels = { not_uploaded: "Yüklenmedi", uploaded: "Yüklendi", in_review: "İncelemede", approved: "Onaylandı", resubmit: "Yeniden Yükle", rejected: "Reddedildi", technical_error: "Teknik Hata" } as const;
export type DocumentStatus = keyof typeof documentStatusLabels;
export type DocumentIssue = "not_uploaded" | "unmatched_application" | "storage_missing" | "access_denied" | "metadata_unreadable" | "legacy_schema" | "connection_error";
export const documentIssueLabels: Record<DocumentIssue, string> = {
 not_uploaded: "Bu başvuruya belge yüklenmedi.", unmatched_application: "Belge başvuruyla eşleştirilemedi.", storage_missing: "Belge kaydı var; dosya özel depoda bulunamadı.", access_denied: "Belgeye erişim yetkisi doğrulanamadı.", metadata_unreadable: "Belge bilgileri okunamadı. Kurulum kontrol edilmeli.", legacy_schema: "Eski belge kaydı tür ve sürüm incelemesi gerektiriyor.", connection_error: "Bağlantı kurulamadı. Yeniden dene.",
};
export type TrustDocument = { id: string; document_type: string; label: string; version: number; status: Exclude<DocumentStatus, "not_uploaded" | "technical_error">; expires_on: string | null; reason: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string; superseded: boolean; storage_missing: boolean };
export type DocumentRule = { id: string; provider_id?: string | null; category_id: string | null; document_type: string; stage: "application" | "publication" | "payment"; scope: string; regulatory_rule_version: string; source_url: string; effective_date: string; reviewed_at: string | null; legal_status: "draft" | "approved" | "retired"; required: boolean; enabled: boolean };
export type TrustApplication = { id: string; name: string; phone: string; status: string; bound: boolean; category_id: string; district_id: string; documents: TrustDocument[]; legacy_status: string; phone_verified: boolean; identity_verified: boolean; rules: DocumentRule[]; history: { actor_user_id: string | null; action: string; created_at: string; metadata: Record<string, Json> }[] };
type Table<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: [] };
export type TrustTables = {
 order_scope_changes: Table<{ id: string; order_id: string; scope: string; extra_minor: number; status: "proposed" | "accepted" | "declined"; created_at: string }>;
 provider_document_types: Table<{ code: string; label: string; purpose: string; retention_days: number; enabled: boolean }>;
 provider_document_rules: Table<DocumentRule>;
 provider_document_uploads: Table<{ path: string; owner_id: string; mime: string; size_bytes: number; sha256: string; scan_status: "unavailable" | "clean" | "blocked"; created_at: string }>;
 trust_safety_cases: Table<{ id: string; order_id: string | null; provider_id: string | null; reporter_id: string; reporter_side: "customer" | "provider"; kind: string; reason: string; status: string; resolution: string | null; created_at: string }>;
};
export type TrustFunctions = {
 trust_report_account: { Args: { p_provider_id: string; p_reason: string }; Returns: string };
 trust_scope_change: { Args: { p_order_id: string; p_scope?: string; p_extra_minor?: number; p_change_id?: string; p_accept?: boolean }; Returns: undefined };
 trust_save_document_type: { Args: { p_type: Json; p_reason: string }; Returns: undefined };
 trust_application_summaries: { Args: { p_ids: string[] }; Returns: Json };
 trust_application_file: { Args: { p_application_id: string }; Returns: Json };
 trust_attach_document: { Args: { p_application_id: string; p_path: string; p_type: string; p_expires_on?: string | null }; Returns: string };
 trust_review_document: { Args: { p_id: string; p_version: number; p_status: string; p_reason: string }; Returns: undefined };
 trust_document_access: { Args: { p_id: string }; Returns: string };
 trust_save_rule: { Args: { p_rule: Json; p_reason: string }; Returns: string };
 trust_issue_service_code: { Args: { p_order_id: string }; Returns: Json };
 trust_report_case: { Args: { p_order_id: string; p_kind: string; p_reason: string }; Returns: string };
 trust_resolve_case: { Args: { p_id: string; p_status: string; p_reason: string }; Returns: undefined };
 trust_admin_queue: { Args: Record<string, never>; Returns: Json };
};
