import { NextRequest, NextResponse } from "next/server";
import { getServerAuthContext } from "@/services/auth/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { isUuid } from "@/lib/utils/validation";
import { PROVIDER_VERIFICATION_DOCUMENTS_BUCKET } from "@/services/storage/providerVerificationDocuments";
export const runtime = "nodejs";
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
 const fail = (status: number) => NextResponse.json({ message: "Belge açılamadı. Yetki, dosya ve bağlantı kontrol edilmeli." }, { status, headers });
 try {
  const { id } = await params;
  const { supabase, user } = await getServerAuthContext();
  if (!user || !supabase) return fail(401);
  if (!isUuid(id)) return fail(404);
  const server = createSupabaseServiceRoleClient();
  if (!server) return fail(503);
  // RPC authorizes current owner/admin and commits access audit before granting access.
  const { data: path, error } = await supabase.rpc("trust_document_access", { p_id: id });
  if (error || !path) return fail(error?.code === "42501" ? 403 : 503);
  const { data, error: signError } = await server.storage.from(PROVIDER_VERIFICATION_DOCUMENTS_BUCKET).createSignedUrl(path, 60, { download: "fuwu-belge" });
  if (signError || !data?.signedUrl) return fail(503);
  return new NextResponse(null, { status: 303, headers: { ...headers, Location: data.signedUrl } });
 } catch { return fail(503); }
}
