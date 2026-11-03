import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseClientConfig } from "@/lib/supabase/client";
import { checkApiRateLimit, getApiRateLimitHeaders } from "@/lib/security/apiRateLimit";

// Kesinti izleme için sağlık ucu: site ve veritabanı yanıt veriyor mu? Kişisel veya iç bilgi döndürmez.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const limited = await checkApiRateLimit(request, { action: "api.health", limit: 30, windowMs: 60_000 });
  if (!limited.allowed) return NextResponse.json({ status: "rate_limited" }, { status: 429, headers: { ...noStore, ...getApiRateLimitHeaders(limited) } });

  const started = Date.now();
  let database: "ok" | "fail" = "fail";
  const config = getSupabaseClientConfig();
  if (config) {
    const db = createClient(config.url, config.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const result = await db.from("service_categories").select("id").limit(1).abortSignal(AbortSignal.timeout(3000)).then(r => r, () => ({ error: true }));
    database = result.error ? "fail" : "ok";
  }
  const ok = database === "ok";
  return NextResponse.json({ status: ok ? "ok" : "degraded", database, latencyMs: Date.now() - started, checkedAt: new Date().toISOString() }, { status: ok ? 200 : 503, headers: noStore });
}
