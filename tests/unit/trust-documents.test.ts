import { describe, expect, it } from "vitest";
import { documentState, legacyDocumentIssue, missingRequirements, trustReadIssue } from "@/lib/trust/documents";
import type { DocumentRule, TrustDocument } from "@/lib/trust/types";
import { validateProviderApplicationInput } from "@/lib/validations/providerSchemas";
import { calculateEstimatedArrivalText } from "@/services/tracking";
const today = "2026-10-31";
const doc: TrustDocument = { id: "doc", document_type: "qualification", label: "Yeterlilik", version: 2, status: "approved", expires_on: "2027-01-01", reason: "Reviewed relevant qualification", reviewed_by: "admin", reviewed_at: "2026-10-30", created_at: "2026-10-30", superseded: false, storage_missing: false };
const rule: DocumentRule = { id: "rule", category_id: "electrical", document_type: "qualification", stage: "publication", scope: "Exact trade; equivalent certificates accepted", regulatory_rule_version: "1", source_url: "https://www.myk.gov.tr/tr/page/135", effective_date: "2026-01-01", reviewed_at: "2026-10-30", legal_status: "approved", required: true, enabled: true };
describe("document evidence and requirement boundaries", () => {
 it.each(["Kadıköy", "Şile", "Unknown"])("never fabricates ETA from district %s without route evidence", district => expect(calculateEstimatedArrivalText({ district, urgencyType: "emergency" })).toBeNull());
 it.each(["uploaded", "in_review", "approved", "resubmit", "rejected"] as const)("preserves independent %s document status", status => expect(documentState({ ...doc, status }, today)).toBe(status));
 it("distinguishes unavailable object from absent document", () => { expect(documentState({ ...doc, storage_missing: true }, today)).toBe("technical_error"); expect(legacyDocumentIssue(null, null)).toBe("not_uploaded"); expect(legacyDocumentIssue(null, "old-private-url")).toBe("legacy_schema"); });
 it("expires an approved document but accepts the final valid day", () => { expect(documentState({ ...doc, expires_on: "2026-10-30" }, today)).toBe("resubmit"); expect(documentState({ ...doc, expires_on: today }, today)).toBe("approved"); });
 it.each([["42501", "access_denied"], ["PGRST202", "metadata_unreadable"], ["42703", "metadata_unreadable"], ["08006", "connection_error"]])("classifies %s without calling it missing", (code, issue) => expect(trustReadIssue({ code })).toBe(issue));
 it("does not enforce another category or a payment-stage rule at publication", () => { expect(missingRequirements([rule], [], "cleaning", "publication", today)).toEqual([]); expect(missingRequirements([{ ...rule, stage: "payment" }], [], "electrical", "publication", today)).toEqual([]); });
 it.each([{ enabled: false }, { legal_status: "draft" as const }, { reviewed_at: null }, { effective_date: "2027-01-01" }, { required: false }])("does not enforce unreviewed, disabled, optional or future rules", change => expect(missingRequirements([{ ...rule, ...change }], [], "electrical", "publication", today)).toEqual([]));
 it("requires current approved type rather than any file", () => { for (const change of [{ document_type: "identity" }, { status: "rejected" as const }, { superseded: true }, { storage_missing: true }, { expires_on: "2026-01-01" }]) expect(missingRequirements([rule], [{ ...doc, ...change }], "electrical", "publication", today)).toHaveLength(1); expect(missingRequirements([rule], [doc], "electrical", "publication", today)).toEqual([]); });
 it("allows a four-field application without collecting extra evidence", () => { expect(validateProviderApplicationInput({ fullName: "Test Applicant", phone: "+905550001111", categoryId: "category", districtId: "district", availability: "", hasEquipment: "", experienceYears: "", introduction: "", portfolioUrl: "" }).ok).toBe(true); });
});
