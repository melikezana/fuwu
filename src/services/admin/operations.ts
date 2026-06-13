import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { handleServiceError } from "@/lib/errors";
import {
  LEGACY_SERVICE_REQUEST_STATUSES,
  PROVIDER_APPLICATION_STATUSES,
  SERVICE_REQUEST_STATUSES,
} from "@/lib/constants/statuses";
import type { Database } from "@/lib/supabase/types";

type ProviderRow = Database["public"]["Tables"]["providers"]["Row"];
type ServiceRequestRow = Database["public"]["Tables"]["service_requests"]["Row"];
type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

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
  "assigned_provider_id" | "created_at" | "id" | "status"
> & {
  assigned_provider: MaybeRelation;
  districts: MaybeRelation;
  profiles: MaybePhoneRelation;
  service_categories: MaybeRelation;
};

export type AdminOverviewMetrics = {
  aktifUsta: number;
  bekleyenTalep: number;
  incelenenTalep: number;
  iptalEdilenTalep: number;
  onayBekleyenUsta: number;
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
  status: string;
};

export type AuditLogEntry = AuditLogRow;

export type AuditLogsData = {
  data: AuditLogEntry[];
  error: string | null;
};

function getRelationName(relation: MaybeRelation, fallback = "Belirtilmedi") {
  const record = Array.isArray(relation) ? relation[0] : relation;

  return record?.name?.trim() || fallback;
}

function getRelationPhone(relation: MaybePhoneRelation) {
  const record = Array.isArray(relation) ? relation[0] : relation;

  return record?.phone?.trim() || "Belirtilmedi";
}

export async function getAdminOperationsAccess() {
  const authContext = await getServerAuthContext();
  if (!authContext.supabase || !authContext.user || !hasAdminRole(authContext.profile)) {
    return { ok: false, supabase: null };
  }
  return { ok: true, supabase: authContext.supabase };
}

export async function getAdminOverviewMetrics(): Promise<AdminOverviewMetrics | null> {
  const { ok, supabase } = await getAdminOperationsAccess();
  if (!ok || !supabase) {
    return null;
  }

  try {
    const [
      totalRequestsResult,
      yeniRequestsResult,
      inceleniyorRequestsResult,
      yonlendirildiRequestsResult,
      tamamlandiRequestsResult,
      iptalRequestsResult,
      activeProvidersResult,
      pendingApplicationsResult,
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
    ]);

    return {
      toplamTalep: totalRequestsResult.count ?? 0,
      bekleyenTalep: yeniRequestsResult.count ?? 0,
      incelenenTalep: inceleniyorRequestsResult.count ?? 0,
      ustayaYonlendirildi: yonlendirildiRequestsResult.count ?? 0,
      tamamlananTalep: tamamlandiRequestsResult.count ?? 0,
      iptalEdilenTalep: iptalRequestsResult.count ?? 0,
      aktifUsta: activeProvidersResult.count ?? 0,
      onayBekleyenUsta: pendingApplicationsResult.count ?? 0,
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
        assigned_provider_id,
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
      assignedProviderName: getRelationName(req.assigned_provider, "Bilinmiyor"),
      category: getRelationName(req.service_categories),
      district: getRelationName(req.districts),
      customerPhone: getRelationPhone(req.profiles),
      createdAt: req.created_at,
    }));
  } catch (error) {
    handleServiceError(error, { logContext: "getAssignmentMonitoring" });
    return [];
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
