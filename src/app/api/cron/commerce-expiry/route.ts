import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET ? Buffer.from(`Bearer ${process.env.CRON_SECRET}`) : null;
  const actual = Buffer.from(request.headers.get("authorization") || "");
  if (!expected || actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = createSupabaseServiceRoleClient();
  if (!db) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { data, error } = await db.rpc("commerce_expire_holds", {});
  const { error: evidenceError } = await db.rpc("commerce_record_health", { p_name: "cron", p_passed: !error, p_detail: error ? "Rezervasyon temizliği başarısız." : `Yetkili cron tamamlandı; ${data ?? 0} rezervasyon temizlendi.` });
  if (evidenceError && !error) return NextResponse.json({ expired: data, error: "health_evidence_failed" }, { status: 503 });
  return NextResponse.json(error ? { error: "expiry_failed" } : { expired: data }, { status: error ? 503 : 200 });
}
