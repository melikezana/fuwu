import type { DocumentIssue, DocumentRule, DocumentStatus, TrustDocument } from "./types";
export function documentState(doc: TrustDocument, today = new Date().toISOString().slice(0, 10)): DocumentStatus {
 if (doc.storage_missing) return "technical_error";
 if (doc.expires_on && doc.expires_on < today) return "resubmit";
 return doc.status;
}
export function legacyDocumentIssue(path: string | null, url: string | null): DocumentIssue {
 return path || url ? "legacy_schema" : "not_uploaded";
}
export function trustReadIssue(error: { code?: string }): DocumentIssue {
 if (error.code === "42501") return "access_denied";
 if (["PGRST202", "PGRST205", "42883", "42P01", "42703"].includes(error.code ?? "")) return "metadata_unreadable";
 return "connection_error";
}
export function missingRequirements(rules: DocumentRule[], docs: TrustDocument[], categoryId: string, stage: DocumentRule["stage"], today: string) {
 return rules.filter(r => r.enabled && r.required && r.legal_status === "approved" && r.reviewed_at && r.effective_date <= today && r.stage === stage && (!r.category_id || r.category_id === categoryId))
 .filter(r => !docs.some(d => !d.superseded && d.document_type === r.document_type && documentState(d, today) === "approved"));
}
