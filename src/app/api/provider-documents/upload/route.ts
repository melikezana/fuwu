import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, boundRequestBody, RequestBoundaryError } from "@/lib/security/requestBoundary";
import { getServerAuthContext } from "@/services/auth/server";
import { uploadTrustDocument } from "@/services/trust/documents";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
 const headers = { "Cache-Control": "private, no-store" };
 try {
  assertSameOrigin(request);
  const { user } = await getServerAuthContext();
  if (!user) return NextResponse.json({ message: "Giriş yap." }, { status: 401, headers });
  const bytes = await boundRequestBody(request, 5 * 1024 * 1024 + 65536);
  const form = await new Request(request.url, { method: "POST", headers: request.headers, body: bytes }).formData();
  const file = form.get("document");
  if (!(file instanceof File)) return NextResponse.json({ message: "Belge seç." }, { status: 400, headers });
  const result = await uploadTrustDocument(file);
  return NextResponse.json(result, { status: result.path ? 200 : 422, headers });
 } catch (error) {
  return NextResponse.json({ message: error instanceof RequestBoundaryError && error.status === 413 ? "Belge en fazla 5 MB olabilir." : "Belge yüklenemedi. Yeniden dene." }, { status: error instanceof RequestBoundaryError ? error.status : 503, headers });
 }
}
