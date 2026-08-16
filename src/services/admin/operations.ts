import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { handleServiceError } from "@/lib/errors";
import {
  LEGACY_SERVICE_REQUEST_STATUSES,
  PROVIDER_APPLICATION_STATUSES,
  SERVICE_REQUEST_STATUSES,
} from "@/lib/constants/statuses";
import { EMERGENCY_RESPONSE_SLA_MINUTES } from "@/lib/constants/sla";
import { isUuid } from "@/lib/utils/validation";
import type { Database } from "@/lib/supabase/types";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
import { writeAuditLog } from "@/services/audit";
import { PAYMENT_STATUSES } from "@/services/payments";
import { refundIyzicoPayment } from "@/services/payments/iyzico-marketplace";

type ProviderRow = Database["public"]["Tables"]["providers"]["Row"];
type ServiceRequestRow = Database["public"]["Tables"]["service_requests"]["Row"];
type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];
type RequestReassignmentLogRow =
  Database["public"]["Tables"]["request_reassignment_log"]["Row"];

type NamedRelation = {
  name: string | null;
};

type MaybeRelation = NamedRelation | NamedRelation[] | null;

type PhoneRelation = {
  phone: string | null;
};

type MaybePhoneRelation = PhoneRelation | PhoneRelation[] | null;

type RequestAnalyticsRecord = Pick<ServiceRequestRow, "id" | "status"> & {
  districts: MaybeRelation;
  service_categories: MaybeRelation;
};

type ProviderAnalyticsRecord = Pick<
  ProviderRow,
  "id" | "is_active" | "is_approved"
> & {
  districts: MaybeRelation;
  service_categories: MaybeRelation;
};

type AssignmentMonitoringRecord = Pick<
  ServiceRequestRow,
  "assigned_at" | "assigned_provider_id" | "created_at" | "id" | "status" | "urgency_type"
> & {
  assigned_provider: MaybeRelation;
  districts: MaybeRelation;
  profiles: MaybePhoneRelation;
  service_categories: MaybeRelation;
};

type RequestReassignmentRequestRelation = Pick<ServiceRequestRow, "created_at" | "id"> & {
  districts: MaybeRelation;
  service_categories: MaybeRelation;
};

type MaybeRequestReassignmentRequestRelation =
  | RequestReassignmentRequestRelation
  | RequestReassignmentRequestRelation[]
  | null;

type RequestReassignmentLogRecord = Pick<
  RequestReassignmentLogRow,
  | "created_at"
  | "id"
  | "is_dry_run"
  | "new_provider_id"
  | "previous_provider_id"
  | "reason"
  | "request_id"
> & {
  new_provider: MaybeRelation;
  previous_provider: MaybeRelation;
  request: MaybeRequestReassignmentRequestRelation;
};

export type AdminOverviewMetrics = {
  aktifUsta: number;
  aiAssistantOpenAiFailures24h: number;
  bekleyenTalep: number;
  incelenenTalep: number;
  iptalEdilenTalep: number;
  onayBekleyenUsta: number;
  slaBreachedEmergencyRequests: number;
  tamamlananTalep: number;
  toplamTalep: number;
  ustayaYonlendirildi: number;
};

export type AnalyticsBreakdown = Record<string, number>;

export type RequestAnalyticsData = {
  byCategory: AnalyticsBreakdown;
  byDistrict: AnalyticsBreakdown;
  byStatus: AnalyticsBreakdown;
};

export type ProviderAnalyticsData = {
  active: number;
  approved: number;
  byCategory: AnalyticsBreakdown;
  byDistrict: AnalyticsBreakdown;
  inactive: number;
};

export type AssignmentMonitoringItem = {
  assignedProviderId: string | null;
  assignedProviderName: string;
  category: string;
  createdAt: string;
  customerPhone: string;
  district: string;
  id: string;
  assignedAt: string | null;
  slaBreached: boolean;
  status: string;
};

export type RequestReassignmentLogItem = {
  category: string;
  createdAt: string;
  district: string;
  id: string;
  isDryRun: boolean;
  newProviderId: string | null;
  newProviderName: string;
  previousProviderId: string | null;
  previousProviderName: string;
  reason: RequestReassignmentLogRow["reason"];
  reasonLabel: string;
  requestCreatedAt: string | null;
  requestId: string;
  requestLabel: string;
};

export type RequestReassignmentLogsData = {
  data: RequestReassignmentLogItem[];
  error: string | null;
};

export type AuditLogEntry = AuditLogRow;

export type AuditLogsData = {
  data: AuditLogEntry[];
  error: string | null;
};

export type AdminActionResult = {
  message: string;
  ok: boolean;
};

function getRelationName(relation: MaybeRelation, fallback = "Belirtilmedi") {
  const record = Array.isArray(relation) ? relation[0] : relation;

  return record?.name?.trim() || fallback;
}

function getRelationPhone(relation: MaybePhoneRelation) {
  const record = Array.isArray(relation) ? relation[0] : relation;

  return record?.phone?.trim() || "Belirtilmedi";
}

function getRequestRelation(relation: MaybeRequestReassignmentRequestRelation) {
  return Array.isArray(relation) ? relation[0] : relation;
}

function getRequestCode(requestId: string) {
  return `FW-${requestId.slice(0, 8).toLocaleUpperCase("tr")}`;
}

function getReassignmentReasonLabel(reason: RequestReassignmentLogRow["reason"]) {
  if (reason === "sla_breach_reassigned") {
    return "Yeniden atandı";
  }

  if (reason === "no_eligible_provider" || reason === "no_eligible_provider_dry_run") {
    return "Uygun aday yok";
  }

  if (reason === "max_reassignment_limit_reached") {
    return "Limit doldu";
  }

  return "Dry-run aday";
}

function getEmergencySlaCutoffIso() {
  return new Date(
    Date.now() - EMERGENCY_RESPONSE_SLA_MINUTES * 60 * 1000,
  ).toISOString();
}

function getAiAssistantFailureCutoffIso() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

function isEmergencyResponseSlaBreached(request: AssignmentMonitoringRecord) {
  if (
    request.urgency_type !== "emergency" ||
    request.status !== SERVICE_REQUEST_STATUSES.assigned ||
    !request.assigned_at
  ) {
    return false;
  }

  const assignedAtMs = new Date(request.assigned_at).getTime();

  return (
    Number.isFinite(assignedAtMs) &&
    assignedAtMs + EMERGENCY_RESPONSE_SLA_MINUTES * 60 * 1000 < Date.now()
  );
}

export async function getAdminOperationsAccess() {
  const authContext = await getServerAuthContext();
  if (!authContext.supabase || !authContext.user || !hasAdminRole(authContext.profile)) {
    return { ok: false, supabase: null, userId: null };
  }
  return { ok: true, supabase: authContext.supabase, userId: authContext.user.id };
}

function parsePaymentAmount(value: number | string | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function normalizeRefundPrice(value: number) {
  return Number(value.toFixed(2));
}

export async function refundAdminIyzicoPayment(
  paymentId: string,
): Promise<AdminActionResult> {
  if (!isUuid(paymentId)) {
    return { message: "Geçersiz ödeme kimliği.", ok: false };
  }

  const { ok, supabase, userId } = await getAdminOperationsAccess();

  if (!ok || !supabase || !userId) {
    return { message: "Bu işlem için admin yetkisi gerekli.", ok: false };
  }

  const rateLimit = await checkRateLimitWithRedis({
    action: "admin:payment.refund",
    limit: 20,
    supabase,
    userId,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return { message: "Çok fazla işlem yaptın, biraz bekle.", ok: false };
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select(
      "id, request_id, amount, payment_method, status, iyzico_conversation_id, iyzico_payment_transaction_id",
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentError) {
    handleServiceError(paymentError, { logContext: "refundAdminIyzicoPayment lookup" });
    return { message: "Ödeme kaydı okunamadı.", ok: false };
  }

  if (!payment) {
    return { message: "Ödeme bulunamadı.", ok: false };
  }

  if (payment.payment_method !== "iyzico") {
    return { message: "Yalnızca iyzico ödemeleri bu aksiyonla iade edilebilir.", ok: false };
  }

  if (payment.status !== PAYMENT_STATUSES.escrowHeld) {
    return { message: "Yalnızca emanet hesapta bekleyen ödemeler iade edilebilir.", ok: false };
  }

  if (!payment.iyzico_conversation_id || !payment.iyzico_payment_transaction_id) {
    return { message: "iyzico işlem bilgisi eksik olduğu için iade başlatılamadı.", ok: false };
  }

  const amount = parsePaymentAmount(payment.amount);

  if (!amount || amount <= 0) {
    return { message: "İade tutarı için geçerli ödeme tutarı bulunamadı.", ok: false };
  }

  try {
    const refundResponse = await refundIyzicoPayment({
      conversationId: payment.iyzico_conversation_id,
      paymentTransactionId: payment.iyzico_payment_transaction_id,
      price: normalizeRefundPrice(amount),
    });
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        escrow_refunded_at: now,
        refund_id:
          refundResponse.refundHostReference ??
          refundResponse.paymentId ??
          refundResponse.paymentTransactionId ??
          null,
        status: PAYMENT_STATUSES.escrowRefunded,
        updated_at: now,
      })
      .eq("id", payment.id)
      .eq("status", PAYMENT_STATUSES.escrowHeld);

    if (updateError) {
      handleServiceError(updateError, { logContext: "refundAdminIyzicoPayment update" });
      return { message: "İade alındı ancak ödeme kaydı güncellenemedi.", ok: false };
    }

    await writeAuditLog(
      {
        action: "payment.refunded",
        actorUserId: userId,
        entityId: payment.id,
        entityType: "payment",
        metadata: {
          amount,
          paymentTransactionId: payment.iyzico_payment_transaction_id,
          requestId: payment.request_id,
          refundHostReference: refundResponse.refundHostReference ?? null,
        },
      },
      supabase,
    );

    return {
      message: "iyzico iade işlemi başlatıldı ve ödeme iade edildi olarak işaretlendi.",
      ok: true,
    };
  } catch (error) {
    handleServiceError(error, { logContext: "refundAdminIyzicoPayment iyzico" });
    return { message: "iyzico iade isteği başarısız oldu.", ok: false };
  }
}

export async function getAdminOverviewMetrics(): Promise<AdminOverviewMetrics | null> {
  const { ok, supabase } = await getAdminOperationsAccess();
  if (!ok || !supabase) {
    return null;
  }

  try {
    const slaCutoffIso = getEmergencySlaCutoffIso();
    const aiAssistantFailureCutoffIso = getAiAssistantFailureCutoffIso();
    const [
      totalRequestsResult,
      yeniRequestsResult,
      inceleniyorRequestsResult,
      yonlendirildiRequestsResult,
      tamamlandiRequestsResult,
      iptalRequestsResult,
      activeProvidersResult,
      pendingApplicationsResult,
      slaBreachedEmergencyRequestsResult,
      aiAssistantOpenAiFailuresResult,
    ] = await Promise.all([
      supabase.from("service_requests").select("id", { count: "exact", head: true }),
      supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .in("status", [
          SERVICE_REQUEST_STATUSES.pending,
          LEGACY_SERVICE_REQUEST_STATUSES.yeni,
          LEGACY_SERVICE_REQUEST_STATUSES.inceleniyor,
        ]),
      supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", SERVICE_REQUEST_STATUSES.inProgress),
      supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", SERVICE_REQUEST_STATUSES.assigned),
      supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", SERVICE_REQUEST_STATUSES.completed),
      supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", SERVICE_REQUEST_STATUSES.cancelled),
      supabase.from("providers").select("id", { count: "exact", head: true }).eq("is_active", true).eq("is_approved", true),
      supabase.from("provider_applications").select("id", { count: "exact", head: true }).eq("status", PROVIDER_APPLICATION_STATUSES.pending),
      supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .eq("urgency_type", "emergency")
        .eq("status", SERVICE_REQUEST_STATUSES.assigned)
        .not("assigned_at", "is", null)
        .lt("assigned_at", slaCutoffIso),
      supabase
        .from("audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("action", "ai_assistant.openai_failure")
        .gte("created_at", aiAssistantFailureCutoffIso),
    ]);

    return {
      toplamTalep: totalRequestsResult.count ?? 0,
      aiAssistantOpenAiFailures24h: aiAssistantOpenAiFailuresResult.count ?? 0,
      bekleyenTalep: yeniRequestsResult.count ?? 0,
      incelenenTalep: inceleniyorRequestsResult.count ?? 0,
      ustayaYonlendirildi: yonlendirildiRequestsResult.count ?? 0,
      tamamlananTalep: tamamlandiRequestsResult.count ?? 0,
      iptalEdilenTalep: iptalRequestsResult.count ?? 0,
      aktifUsta: activeProvidersResult.count ?? 0,
      onayBekleyenUsta: pendingApplicationsResult.count ?? 0,
      slaBreachedEmergencyRequests: slaBreachedEmergencyRequestsResult.count ?? 0,
    };
  } catch (error) {
    handleServiceError(error, { logContext: "getAdminOverviewMetrics" });
    return null;
  }
}

export async function getRequestAnalytics(): Promise<RequestAnalyticsData | null> {
  const { ok, supabase } = await getAdminOperationsAccess();
  if (!ok || !supabase) return null;

  try {
    const { data: requests, error } = await supabase
      .from("service_requests")
      .select(`
        id, status,
        service_categories(name),
        districts(name)
      `);

    if (error || !requests) return null;

    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byDistrict: Record<string, number> = {};

    for (const req of (requests ?? []) as unknown as RequestAnalyticsRecord[]) {
      const status = req.status || "bilinmiyor";
      const category = getRelationName(req.service_categories);
      const district = getRelationName(req.districts);

      byStatus[status] = (byStatus[status] || 0) + 1;
      byCategory[category] = (byCategory[category] || 0) + 1;
      byDistrict[district] = (byDistrict[district] || 0) + 1;
    }

    return { byStatus, byCategory, byDistrict };
  } catch (error) {
    handleServiceError(error, { logContext: "getRequestAnalytics" });
    return null;
  }
}

export async function getProviderAnalytics(): Promise<ProviderAnalyticsData | null> {
  const { ok, supabase } = await getAdminOperationsAccess();
  if (!ok || !supabase) return null;

  try {
    const { data: providers, error } = await supabase
      .from("providers")
      .select(`
        id, is_active, is_approved,
        service_categories(name),
        districts(name)
      `);

    if (error || !providers) return null;

    let active = 0;
    let inactive = 0;
    let approved = 0;
    const byCategory: Record<string, number> = {};
    const byDistrict: Record<string, number> = {};

    for (const p of (providers ?? []) as unknown as ProviderAnalyticsRecord[]) {
      if (p.is_active) active++; else inactive++;
      if (p.is_approved) approved++;

      const category = getRelationName(p.service_categories);
      const district = getRelationName(p.districts);

      byCategory[category] = (byCategory[category] || 0) + 1;
      byDistrict[district] = (byDistrict[district] || 0) + 1;
    }

    return { active, inactive, approved, byCategory, byDistrict };
  } catch (error) {
    handleServiceError(error, { logContext: "getProviderAnalytics" });
    return null;
  }
}

export async function getAssignmentMonitoring(): Promise<AssignmentMonitoringItem[] | null> {
  const { ok, supabase } = await getAdminOperationsAccess();
  if (!ok || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from("service_requests")
      .select(`
        id,
        status,
        urgency_type,
        assigned_provider_id,
        assigned_at,
        created_at,
        service_categories(name),
        districts(name),
        profiles(phone),
        assigned_provider:providers!service_requests_assigned_provider_id_fkey(name)
      `)
      .not("assigned_provider_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return ((data ?? []) as unknown as AssignmentMonitoringRecord[]).map((req) => ({
      id: req.id,
      status: req.status,
      assignedProviderId: req.assigned_provider_id,
      assignedAt: req.assigned_at ?? null,
      assignedProviderName: getRelationName(req.assigned_provider, "Bilinmiyor"),
      category: getRelationName(req.service_categories),
      district: getRelationName(req.districts),
      customerPhone: getRelationPhone(req.profiles),
      createdAt: req.created_at,
      slaBreached: isEmergencyResponseSlaBreached(req),
    }));
  } catch (error) {
    handleServiceError(error, { logContext: "getAssignmentMonitoring" });
    return [];
  }
}

export async function getRequestReassignmentLogs(
  limit = 25,
): Promise<RequestReassignmentLogsData> {
  const { ok, supabase } = await getAdminOperationsAccess();
  if (!ok || !supabase) return { data: [], error: null };

  try {
    const { data, error } = await supabase
      .from("request_reassignment_log")
      .select(`
        id,
        request_id,
        previous_provider_id,
        new_provider_id,
        is_dry_run,
        reason,
        created_at,
        request:service_requests!request_reassignment_log_request_id_fkey(
          id,
          created_at,
          service_categories(name),
          districts(name)
        ),
        previous_provider:providers!request_reassignment_log_previous_provider_id_fkey(name),
        new_provider:providers!request_reassignment_log_new_provider_id_fkey(name)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      handleServiceError(error, { logContext: "getRequestReassignmentLogs" });
      return { data: [], error: "SLA aşım kayıtları okunamadı." };
    }

    const rows = ((data ?? []) as unknown as RequestReassignmentLogRecord[]).map((log) => {
      const request = getRequestRelation(log.request);

      return {
        category: getRelationName(request?.service_categories ?? null),
        createdAt: log.created_at,
        district: getRelationName(request?.districts ?? null),
        id: log.id,
        isDryRun: log.is_dry_run,
        newProviderId: log.new_provider_id,
        newProviderName: log.new_provider_id
          ? getRelationName(log.new_provider, "Bilinmiyor")
          : log.reason === "max_reassignment_limit_reached"
            ? "Limit nedeniyle durdu"
          : "Uygun aday yok",
        previousProviderId: log.previous_provider_id,
        previousProviderName: getRelationName(log.previous_provider, "Bilinmiyor"),
        reason: log.reason,
        reasonLabel: getReassignmentReasonLabel(log.reason),
        requestCreatedAt: request?.created_at ?? null,
        requestId: log.request_id,
        requestLabel: getRequestCode(log.request_id),
      };
    });

    return { data: rows, error: null };
  } catch (error) {
    handleServiceError(error, { logContext: "getRequestReassignmentLogs" });
    return { data: [], error: "SLA aşım kayıtları yapılandırması henüz tamamlanmadı." };
  }
}

export async function getLatestAuditLogs(): Promise<AuditLogsData> {
  const { ok, supabase } = await getAdminOperationsAccess();
  if (!ok || !supabase) return { data: [], error: null };

  try {
    // Intentionally allowing safe failure if table isn't fully ready or fields differ
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return { data: [], error: "Audit logs şu an okunamıyor." };
    }

    return { data: (data ?? []) as unknown as AuditLogEntry[], error: null };
  } catch {
    return { data: [], error: "Audit logs yapılandırması henüz tamamlanmadı." };
  }
}
