import { createHash, randomUUID } from "node:crypto";
import { getServerAuthContext } from "@/services/auth/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
import { PROVIDER_VERIFICATION_DOCUMENTS_BUCKET, validateProviderVerificationDocumentFile, verificationDocumentContentType } from "@/services/storage/providerVerificationDocuments";
import { isUuid } from "@/lib/utils/validation";
import { trustReadIssue } from "@/lib/trust/documents";
import type { DocumentIssue, TrustApplication } from "@/lib/trust/types";

export async function readTrustApplication(id: string): Promise<{ file: TrustApplication | null; issue: DocumentIssue | null }> {
 const { supabase, user } = await getServerAuthContext();
 if (!supabase || !user || !isUuid(id)) return { file: null, issue: "access_denied" };
 try {
  const { data, error } = await supabase.rpc("trust_application_file", { p_application_id: id }).abortSignal(AbortSignal.timeout(8000));
  if (error) return { file: null, issue: trustReadIssue(error) };
  if (!data || typeof data !== "object" || Array.isArray(data) || data.id !== id || !Array.isArray(data.documents)) return { file: null, issue: "metadata_unreadable" };
  return { file: data as unknown as TrustApplication, issue: null };
 } catch { return { file: null, issue: "connection_error" }; }
}

// Only call on the server. Both initial application uploads and Partner use this boundary.
export async function uploadTrustDocument(file: File): Promise<{ path?: string; message?: string }> {
 const { supabase, user } = await getServerAuthContext();
 if (!supabase || !user) return { message: "Belge eklemek için giriş yap." };
 const validation = validateProviderVerificationDocumentFile(file);
 if (validation) return { message: validation };
 const mime = await verificationDocumentContentType(file);
 const ext = file.name.split(".").pop()?.toLowerCase();
 const expected: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
 if (!ext || !mime || expected[ext] !== mime || (file.type && file.type !== mime)) return { message: "Belgenin uzantısı, dosya türü ve içeriği eşleşmeli." };
 const rate = await checkRateLimitWithRedis({ action: "trust:upload", limit: 5, windowMs: 3600000, supabase, userId: user.id });
 if (!rate.allowed) return { message: "Belge yükleme sınırına ulaştın. Daha sonra tekrar dene." };
 const server = createSupabaseServiceRoleClient();
 if (!server) return { message: "Güvenli belge hizmeti hazır değil. Destek ekibi kurulumu kontrol etmeli." };
 const path = `${user.id}/provider-applications/${new Date().getUTCFullYear()}/${randomUUID()}.${ext}`;
 const bytes = new Uint8Array(await file.arrayBuffer());
 const { error } = await server.storage.from(PROVIDER_VERIFICATION_DOCUMENTS_BUCKET).upload(path, bytes, { contentType: mime, cacheControl: "0", upsert: false });
 if (error) return { message: "Belge özel alana yüklenemedi. Yeniden dene." };
 const { error: metadataError } = await server.from("provider_document_uploads").insert({ path, owner_id: user.id, mime, size_bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), scan_status: "unavailable" });
 if (metadataError) return { message: "Dosya alındı ancak güvenlik kaydı tamamlanamadı. Destek ekibiyle iletişime geç." };
 return { path };
}
