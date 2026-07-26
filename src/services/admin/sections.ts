import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { handleServiceError } from "@/lib/errors";
import { sanitizeText } from "@/lib/validations";
import { isUuid } from "@/lib/utils";
import { writeAuditLog } from "@/services/audit";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type AdminSupabaseClient = SupabaseClient<Database>;

type AdminGate =
  | { isConfigured: boolean; ok: false; supabase: null; userId: null }
  | { isConfigured: true; ok: true; supabase: AdminSupabaseClient; userId: string };

async function adminGate(): Promise<AdminGate> {
  const ctx = await getServerAuthContext();
  if (!ctx.supabase || !ctx.user || !hasAdminRole(ctx.profile)) {
    return { isConfigured: ctx.isConfigured, ok: false, supabase: null, userId: null };
  }
  return { isConfigured: true, ok: true, supabase: ctx.supabase, userId: ctx.user.id };
}

export type AdminActionResult = { message: string; ok: boolean };

export async function deleteAdminReview(reviewId: string): Promise<AdminActionResult> {
  const id = sanitizeText(reviewId, 80);
  if (!id || !isUuid(id)) {
    return { message: "Geçersiz yorum kimliği.", ok: false };
  }

  const gate = await adminGate();
  if (!gate.ok || !gate.supabase) {
    return { message: "Bu işlem için admin yetkisi gerekli.", ok: false };
  }

  const rateLimit = await checkRateLimitWithRedis({
    action: "admin:review.delete",
    limit: 60,
    supabase: gate.supabase,
    userId: gate.userId,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return { message: "Çok fazla işlem yaptın, biraz bekle.", ok: false };
  }

  const { data, error } = await gate.supabase
    .from("reviews")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    handleServiceError(error, { logContext: "deleteAdminReview" });
    return { message: "Yorum silinemedi.", ok: false };
  }
  if (!data) {
    return { message: "Yorum bulunamadı (zaten silinmiş olabilir).", ok: false };
  }

  await writeAuditLog(
    {
      action: "review.deleted",
      actorUserId: gate.userId,
      entityId: id,
      entityType: "review",
      metadata: {},
    },
    gate.supabase,
  );

  return { message: "Yorum silindi.", ok: true };
}

function relationName(
  relation: { name: string | null } | { name: string | null }[] | null,
  fallback = "—",
): string {
  const record = Array.isArray(relation) ? relation[0] : relation;
  return record?.name?.trim() || fallback;
}

function relationFullName(
  relation: { full_name: string | null } | { full_name: string | null }[] | null,
  fallback = "—",
): string {
  const record = Array.isArray(relation) ? relation[0] : relation;
  return record?.full_name?.trim() || fallback;
}

/* ------------------------------------------------------------------ */
/* ÖDEMELER / FİNANS                                                   */
/* ------------------------------------------------------------------ */

export type AdminPayment = {
  amount: number | null;
  category: string;
  confirmedAt: string | null;
  createdAt: string;
  district: string;
  id: string;
  method: string;
  status: string;
};

export type AdminPaymentsData = {
  error: string | null;
  isConfigured: boolean;
  rows: AdminPayment[];
  totals: {
    confirmedAmount: number;
    confirmedCount: number;
    pendingCount: number;
    totalCount: number;
  };
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Nakit",
  iban: "IBAN / Havale",
  online_soon: "Online (yakında)",
};

export function paymentMethodLabel(method: string): string {
  return paymentMethodLabels[method] ?? method;
}

export async function getAdminPayments(): Promise<AdminPaymentsData> {
  const empty: AdminPaymentsData["totals"] = {
    confirmedAmount: 0,
    confirmedCount: 0,
    pendingCount: 0,
    totalCount: 0,
  };

  const gate = await adminGate();
  if (!gate.ok || !gate.supabase) {
    return {
      error: gate.isConfigured ? "Bu alana erişim yetkin yok." : "Supabase bağlı değil.",
      isConfigured: gate.isConfigured,
      rows: [],
      totals: empty,
    };
  }

  try {
    // Metrikler tüm tablo üzerinden hesaplanır (500 sınırından etkilenmez).
    const [totalRes, confirmedRes, listRes] = await Promise.all([
      gate.supabase.from("payments").select("id", { count: "exact", head: true }),
      gate.supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed"),
      gate.supabase
        .from("payments")
        .select(
          `id, amount, payment_method, status, confirmed_at, created_at,
           service_requests(service_categories(name), districts(name))`,
        )
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    if (listRes.error) {
      handleServiceError(listRes.error, { logContext: "getAdminPayments" });
      return { error: "Ödemeler okunamadı.", isConfigured: true, rows: [], totals: empty };
    }

    // Onaylı ciro: onaylı ödemelerin tutarını sayfalayarak topla (tam doğru).
    let confirmedAmount = 0;
    for (let from = 0; from < 100000; from += 1000) {
      const { data: amountRows, error: amountError } = await gate.supabase
        .from("payments")
        .select("amount")
        .eq("status", "confirmed")
        .range(from, from + 999);
      if (amountError || !amountRows) break;
      for (const row of amountRows as Array<{ amount: number | null }>) {
        confirmedAmount += Number(row.amount ?? 0);
      }
      if (amountRows.length < 1000) break;
    }

    const totalCount = totalRes.count ?? 0;
    const confirmedCount = confirmedRes.count ?? 0;
    const totals = {
      confirmedAmount,
      confirmedCount,
      pendingCount: Math.max(0, totalCount - confirmedCount),
      totalCount,
    };

    const rows: AdminPayment[] = ((listRes.data ?? []) as unknown as Array<{
      amount: number | null;
      confirmed_at: string | null;
      created_at: string;
      id: string;
      payment_method: string;
      status: string;
      service_requests:
        | {
            districts: { name: string | null } | { name: string | null }[] | null;
            service_categories: { name: string | null } | { name: string | null }[] | null;
          }
        | {
            districts: { name: string | null } | { name: string | null }[] | null;
            service_categories: { name: string | null } | { name: string | null }[] | null;
          }[]
        | null;
    }>).map((raw) => {
      const request = Array.isArray(raw.service_requests)
        ? raw.service_requests[0]
        : raw.service_requests;

      return {
        amount: raw.amount === null ? null : Number(raw.amount),
        category: relationName(request?.service_categories ?? null),
        confirmedAt: raw.confirmed_at,
        createdAt: raw.created_at,
        district: relationName(request?.districts ?? null),
        id: raw.id,
        method: raw.payment_method,
        status: raw.status,
      };
    });

    return { error: null, isConfigured: true, rows, totals };
  } catch (error) {
    handleServiceError(error, { logContext: "getAdminPayments" });
    return { error: "Ödemeler okunamadı.", isConfigured: true, rows: [], totals: empty };
  }
}

/* ------------------------------------------------------------------ */
/* YORUMLAR                                                            */
/* ------------------------------------------------------------------ */

export type AdminReview = {
  comment: string | null;
  createdAt: string;
  customerName: string;
  id: string;
  providerName: string;
  rating: number;
};

export type AdminReviewsData = {
  error: string | null;
  isConfigured: boolean;
  rows: AdminReview[];
};

export async function getAdminReviews(): Promise<AdminReviewsData> {
  const gate = await adminGate();
  if (!gate.ok || !gate.supabase) {
    return {
      error: gate.isConfigured ? "Bu alana erişim yetkin yok." : "Supabase bağlı değil.",
      isConfigured: gate.isConfigured,
      rows: [],
    };
  }

  try {
    const { data, error } = await gate.supabase
      .from("reviews")
      .select(`id, rating, comment, created_at, providers(name), profiles(full_name)`)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      handleServiceError(error, { logContext: "getAdminReviews" });
      return { error: "Yorumlar okunamadı.", isConfigured: true, rows: [] };
    }

    const rows: AdminReview[] = ((data ?? []) as unknown as Array<{
      comment: string | null;
      created_at: string;
      id: string;
      profiles: { full_name: string | null } | { full_name: string | null }[] | null;
      providers: { name: string | null } | { name: string | null }[] | null;
      rating: number;
    }>).map((raw) => ({
      comment: raw.comment,
      createdAt: raw.created_at,
      customerName: relationFullName(raw.profiles),
      id: raw.id,
      providerName: relationName(raw.providers),
      rating: raw.rating,
    }));

    return { error: null, isConfigured: true, rows };
  } catch (error) {
    handleServiceError(error, { logContext: "getAdminReviews" });
    return { error: "Yorumlar okunamadı.", isConfigured: true, rows: [] };
  }
}

/* ------------------------------------------------------------------ */
/* AUDIT LOG                                                           */
/* ------------------------------------------------------------------ */

export type AdminAuditLog = {
  action: string;
  actorUserId: string | null;
  createdAt: string;
  entityId: string | null;
  entityType: string;
  id: string;
};

export type AdminAuditLogsData = {
  error: string | null;
  isConfigured: boolean;
  page: number;
  pageSize: number;
  rows: AdminAuditLog[];
  total: number;
};

const AUDIT_PAGE_SIZE = 25;

export async function getAdminAuditLogs(params?: {
  action?: string;
  entityType?: string;
  page?: number;
}): Promise<AdminAuditLogsData> {
  const page = Math.max(1, Number(params?.page) || 1);

  const gate = await adminGate();
  if (!gate.ok || !gate.supabase) {
    return {
      error: gate.isConfigured ? "Bu alana erişim yetkin yok." : "Supabase bağlı değil.",
      isConfigured: gate.isConfigured,
      page,
      pageSize: AUDIT_PAGE_SIZE,
      rows: [],
      total: 0,
    };
  }

  try {
    const from = (page - 1) * AUDIT_PAGE_SIZE;
    const to = from + AUDIT_PAGE_SIZE - 1;

    let query = gate.supabase
      .from("audit_logs")
      .select("id, actor_user_id, entity_type, entity_id, action, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, to);

    const action = params?.action ? sanitizeText(params.action, 60) : "";
    if (action) {
      query = query.ilike("action", `%${action.replace(/[%,()]/g, " ")}%`);
    }

    const entityType = params?.entityType ? sanitizeText(params.entityType, 40) : "";
    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    const { data, error, count } = await query;

    if (error) {
      handleServiceError(error, { logContext: "getAdminAuditLogs" });
      return {
        error: "Audit log okunamadı.",
        isConfigured: true,
        page,
        pageSize: AUDIT_PAGE_SIZE,
        rows: [],
        total: 0,
      };
    }

    const rows: AdminAuditLog[] = ((data ?? []) as unknown as Array<{
      action: string;
      actor_user_id: string | null;
      created_at: string;
      entity_id: string | null;
      entity_type: string;
      id: string;
    }>).map((raw) => ({
      action: raw.action,
      actorUserId: raw.actor_user_id,
      createdAt: raw.created_at,
      entityId: raw.entity_id,
      entityType: raw.entity_type,
      id: raw.id,
    }));

    return {
      error: null,
      isConfigured: true,
      page,
      pageSize: AUDIT_PAGE_SIZE,
      rows,
      total: count ?? rows.length,
    };
  } catch (error) {
    handleServiceError(error, { logContext: "getAdminAuditLogs" });
    return {
      error: "Audit log okunamadı.",
      isConfigured: true,
      page,
      pageSize: AUDIT_PAGE_SIZE,
      rows: [],
      total: 0,
    };
  }
}
