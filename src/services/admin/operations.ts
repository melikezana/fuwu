import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { handleServiceError } from "@/lib/errors";
import { SERVICE_REQUEST_STATUSES, PROVIDER_APPLICATION_STATUSES } from "@/lib/constants/statuses";

export async function getAdminOperationsAccess() {
  const authContext = await getServerAuthContext();
  if (!authContext.supabase || !authContext.user || !hasAdminRole(authContext.profile)) {
    return { ok: false, supabase: null };
  }
  return { ok: true, supabase: authContext.supabase };
}

export async function getAdminOverviewMetrics() {
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
      supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", SERVICE_REQUEST_STATUSES.yeni),
      supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", SERVICE_REQUEST_STATUSES.inceleniyor),
      supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", SERVICE_REQUEST_STATUSES.ustayaYonlendirildi),
      supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", SERVICE_REQUEST_STATUSES.tamamlandi),
      supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", SERVICE_REQUEST_STATUSES.iptal),
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

export async function getRequestAnalytics() {
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

    for (const req of requests) {
      const status = req.status || "bilinmiyor";
      const cat = Array.isArray(req.service_categories) ? req.service_categories[0]?.name : req.service_categories?.name;
      const category = cat || "Belirtilmedi";
      const distData = Array.isArray(req.districts) ? req.districts[0]?.name : req.districts?.name;
      const district = distData || "Belirtilmedi";

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

export async function getProviderAnalytics() {
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

    for (const p of providers) {
      if (p.is_active) active++; else inactive++;
      if (p.is_approved) approved++;

      const cat = Array.isArray(p.service_categories) ? p.service_categories[0]?.name : p.service_categories?.name;
      const category = cat || "Belirtilmedi";
      const distData = Array.isArray(p.districts) ? p.districts[0]?.name : p.districts?.name;
      const district = distData || "Belirtilmedi";

      byCategory[category] = (byCategory[category] || 0) + 1;
      byDistrict[district] = (byDistrict[district] || 0) + 1;
    }

    return { active, inactive, approved, byCategory, byDistrict };
  } catch (error) {
    handleServiceError(error, { logContext: "getProviderAnalytics" });
    return null;
  }
}

export async function getAssignmentMonitoring() {
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

    return data.map((req: any) => ({
      id: req.id,
      status: req.status,
      assignedProviderId: req.assigned_provider_id,
      assignedProviderName: Array.isArray(req.assigned_provider)
        ? req.assigned_provider[0]?.name
        : req.assigned_provider?.name ?? "Bilinmiyor",
      category: Array.isArray(req.service_categories) ? req.service_categories[0]?.name : req.service_categories?.name ?? "Belirtilmedi",
      district: Array.isArray(req.districts) ? req.districts[0]?.name : req.districts?.name ?? "Belirtilmedi",
      customerPhone: Array.isArray(req.profiles) ? req.profiles[0]?.phone : req.profiles?.phone ?? "Belirtilmedi",
      createdAt: req.created_at,
    }));
  } catch (error) {
    handleServiceError(error, { logContext: "getAssignmentMonitoring" });
    return [];
  }
}

export async function getLatestAuditLogs() {
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

    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: "Audit logs yapılandırması henüz tamamlanmadı." };
  }
}
