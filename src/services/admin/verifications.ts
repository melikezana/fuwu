import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { handleServiceError } from "@/lib/errors";
import { PROVIDER_VERIFICATION_DOCUMENTS_BUCKET } from "@/services/storage/providerVerificationDocuments";

export type VerificationDocItem = {
  applicantName: string;
  createdAt: string;
  documentUrl: string | null;
  id: string;
  phone: string;
  status: string;
};

export type AdminVerificationsData = {
  error: string | null;
  isConfigured: boolean;
  rows: VerificationDocItem[];
};

export async function getAdminVerificationDocuments(): Promise<AdminVerificationsData> {
  const ctx = await getServerAuthContext();
  if (!ctx.supabase || !ctx.user || !hasAdminRole(ctx.profile)) {
    return {
      error: ctx.isConfigured ? "Bu alana erişim yetkin yok." : "Supabase bağlı değil.",
      isConfigured: ctx.isConfigured,
      rows: [],
    };
  }

  try {
    const { data, error } = await ctx.supabase
      .from("provider_applications")
      .select("id, full_name, phone, status, verification_document_path, created_at")
      .not("verification_document_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      handleServiceError(error, { logContext: "getAdminVerificationDocuments" });
      return { error: "Belgeler okunamadı.", isConfigured: true, rows: [] };
    }

    const records = (data ?? []) as unknown as Array<{
      created_at: string;
      full_name: string | null;
      id: string;
      phone: string | null;
      status: string;
      verification_document_path: string | null;
    }>;

    const rows: VerificationDocItem[] = [];
    for (const record of records) {
      let documentUrl: string | null = null;
      if (record.verification_document_path) {
        const { data: signed } = await ctx.supabase.storage
          .from(PROVIDER_VERIFICATION_DOCUMENTS_BUCKET)
          .createSignedUrl(record.verification_document_path, 300);
        documentUrl = signed?.signedUrl ?? null;
      }

      rows.push({
        applicantName: record.full_name?.trim() || "—",
        createdAt: record.created_at,
        documentUrl,
        id: record.id,
        phone: record.phone?.trim() || "",
        status: record.status,
      });
    }

    return { error: null, isConfigured: true, rows };
  } catch (error) {
    handleServiceError(error, { logContext: "getAdminVerificationDocuments" });
    return { error: "Belgeler okunamadı.", isConfigured: true, rows: [] };
  }
}
