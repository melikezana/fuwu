import {
  createSupabaseServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { getPublicErrorMessage, handleServiceError } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { sanitizeText } from "@/lib/validations";
import {
  notifyProviderApplicationApproved,
  notifyProviderApplicationRejected,
} from "@/services/notifications";

type ProviderRow = Database["public"]["Tables"]["providers"]["Row"];
type ProviderApplicationRow =
  Database["public"]["Tables"]["provider_applications"]["Row"];
type ServiceRequestRow =
  Database["public"]["Tables"]["service_requests"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type AdminSupabaseClient = SupabaseClient<Database>;

const ADMIN_ROLE = "admin";
const adminMissingSessionMessage =
  "Admin paneline erişmek için giriş yapmalısın.";
const adminNotAuthorizedMessage = "Bu alana erişim yetkin yok.";

type NamedRelation = {
  name: string | null;
};

type MaybeRelation = NamedRelation | NamedRelation[] | null;

type ProfileRelation = {
  full_name: string | null;
  phone: string | null;
};

type MaybeProfileRelation = ProfileRelation | ProfileRelation[] | null;

export type AdminProfile = Pick<
  ProfileRow,
  "full_name" | "id" | "phone" | "role"
>;

export type AdminAccessAllowed = {
  isConfigured: true;
  ok: true;
  profile: AdminProfile;
  role: "admin";
  userId: string;
};

export type AdminAccessDenied = {
  isConfigured: boolean;
  message: string;
  ok: false;
  reason: "missing-session" | "not-admin";
  role?: string | null;
  userId?: string;
};

export type AdminAccessResult = AdminAccessAllowed | AdminAccessDenied;

type AdminSupabaseAccess =
  | {
      access: AdminAccessAllowed;
      supabase: AdminSupabaseClient;
    }
  | {
      access: AdminAccessDenied;
      supabase: null;
    };

type AdminProviderRecord = Pick<
  ProviderRow,
  | "average_price_max"
  | "average_price_min"
  | "id"
  | "is_active"
  | "is_approved"
  | "name"
  | "phone"
  | "rating"
  | "whatsapp"
> & {
  districts: MaybeRelation;
  service_categories: MaybeRelation;
};

type AdminProviderApplicationRecord = Pick<
  ProviderApplicationRow,
  | "created_at"
  | "description"
  | "experience_years"
  | "full_name"
  | "id"
  | "phone"
  | "status"
  | "whatsapp"
> & {
  districts: MaybeRelation;
  service_categories: MaybeRelation;
};

type AdminProviderApplicationApprovalRecord = Pick<
  ProviderApplicationRow,
  | "category_id"
  | "description"
  | "district_id"
  | "experience_years"
  | "full_name"
  | "id"
  | "phone"
  | "status"
  | "whatsapp"
>;

type AdminProviderApplicationRejectionRecord = Pick<
  ProviderApplicationRow,
  "status"
>;

type AdminServiceRequestRecord = Pick<
  ServiceRequestRow,
  | "created_at"
  | "description"
  | "id"
  | "preferred_date"
  | "preferred_time"
  | "status"
  | "urgency"
  | "user_id"
> & {
  districts: MaybeRelation;
  profiles: MaybeProfileRelation;
  service_categories: MaybeRelation;
};

type AdminProviderPublicationUpdate = Partial<
  Pick<ProviderRow, "is_active" | "is_approved">
>;

type AdminProviderApplicationProviderActionResult =
  AdminProviderApplicationActionResult & {
    providerId?: string;
  };

export type AdminProvider = {
  averagePriceRange: string;
  category: string;
  district: string;
  id: string;
  isActive: boolean;
  isApproved: boolean;
  name: string;
  phone: string;
  rating: number;
  whatsapp: string;
};

export type AdminProviderApplication = {
  category: string;
  createdAt: string;
  description: string;
  district: string;
  experience: string;
  fullName: string;
  id: string;
  phone: string;
  status: string;
  whatsapp: string;
};

export type AdminServiceRequest = {
  category: string;
  createdAt: string;
  customerName: string;
  district: string;
  id: string;
  phone: string;
  preferredDate: string | null;
  preferredTime: string | null;
  status: string;
  urgency: string;
};

export type AdminReadResult<T> = {
  error: string | null;
  isConfigured: boolean;
  rows: T[];
};

export type AdminDashboardSummary = {
  activeProviders: number;
  newServiceRequests: number;
  pendingApplications: number;
  totalProviders: number;
  totalServiceRequests: number;
};

export type AdminDashboardResult = {
  error: string | null;
  isConfigured: boolean;
  summary: AdminDashboardSummary;
};

export type AdminProviderStatusAction =
  | "activate"
  | "approve"
  | "deactivate"
  | "unpublish";

export type AdminProviderStatusActionCode =
  | "admin-not-authorized"
  | "provider-action-failed"
  | "provider-activated"
  | "provider-approved"
  | "provider-deactivated"
  | "provider-invalid-action"
  | "provider-missing-id"
  | "provider-not-found"
  | "provider-unpublished"
  | "supabase-not-configured";

export type AdminProviderStatusActionResult = {
  code: AdminProviderStatusActionCode;
  ok: boolean;
};

export type AdminProviderApplicationActionCode =
  | "admin-not-authorized"
  | "application-action-failed"
  | "application-already-approved"
  | "application-already-rejected"
  | "application-approved-provider-created"
  | "application-missing-id"
  | "application-not-found"
  | "application-rejected"
  | "provider-create-failed"
  | "supabase-not-configured";

export type AdminProviderApplicationActionResult = {
  code: AdminProviderApplicationActionCode;
  ok: boolean;
};

export type AdminServiceRequestStatus =
  | "cancelled"
  | "completed"
  | "in_progress"
  | "matched"
  | "open";

export type AdminServiceRequestActionCode =
  | "admin-not-authorized"
  | "service-request-action-failed"
  | "service-request-invalid-status"
  | "service-request-missing-id"
  | "service-request-not-found"
  | "service-request-updated"
  | "supabase-not-configured";

export type AdminServiceRequestActionResult = {
  code: AdminServiceRequestActionCode;
  ok: boolean;
};

const adminServiceRequestStatuses: AdminServiceRequestStatus[] = [
  "open",
  "in_progress",
  "matched",
  "completed",
  "cancelled",
];

const emptyDashboardSummary: AdminDashboardSummary = {
  activeProviders: 0,
  newServiceRequests: 0,
  pendingApplications: 0,
  totalProviders: 0,
  totalServiceRequests: 0,
};

const adminProviderStatusActions: AdminProviderStatusAction[] = [
  "activate",
  "approve",
  "deactivate",
  "unpublish",
];

function getRelationName(relation: MaybeRelation) {
  const record = Array.isArray(relation) ? relation[0] : relation;
  return record?.name?.trim() || "Belirtilmedi";
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAveragePriceRange(
  minimumPrice: number | null,
  maximumPrice: number | null,
) {
  if (typeof minimumPrice === "number" && typeof maximumPrice === "number") {
    return `${formatPrice(minimumPrice)} - ${formatPrice(maximumPrice)} TL`;
  }

  if (typeof minimumPrice === "number") {
    return `${formatPrice(minimumPrice)} TL ve üzeri`;
  }

  if (typeof maximumPrice === "number") {
    return `${formatPrice(maximumPrice)} TL'ye kadar`;
  }

  return "Belirtilmedi";
}

function getProfileName(relation: MaybeProfileRelation, userId: string) {
  const record = Array.isArray(relation) ? relation[0] : relation;
  const profileName = record?.full_name?.trim();

  if (profileName) {
    return profileName;
  }

  return `Müşteri ${userId.slice(0, 8).toLocaleUpperCase("tr")}`;
}

function getProfilePhone(relation: MaybeProfileRelation) {
  const record = Array.isArray(relation) ? relation[0] : relation;
  return record?.phone?.trim() || null;
}

function getRequestContactFromDescription(description: string | null) {
  const contactLine = description
    ?.split("\n")
    .map((line) => line.trim())
    .find((line) =>
      line.toLocaleLowerCase("tr").startsWith("iletişim:"),
    );

  if (!contactLine) {
    return {
      name: null,
      phone: null,
    };
  }

  const separatorIndex = contactLine.indexOf(":");
  const contactValue = contactLine.slice(separatorIndex + 1).trim();
  const [name, phone] = contactValue.split("/").map((part) => part.trim());

  return {
    name: name || null,
    phone: phone || null,
  };
}

function getRequestCustomerName(
  relation: MaybeProfileRelation,
  userId: string,
  description: string | null,
) {
  const record = Array.isArray(relation) ? relation[0] : relation;
  const profileName = record?.full_name?.trim();

  if (profileName) {
    return profileName;
  }

  const contact = getRequestContactFromDescription(description);

  if (contact.name) {
    return contact.name;
  }

  return getProfileName(relation, userId);
}

function getRequestPhone(
  relation: MaybeProfileRelation,
  description: string | null,
) {
  const profilePhone = getProfilePhone(relation);

  if (profilePhone) {
    return profilePhone;
  }

  const contact = getRequestContactFromDescription(description);

  return contact.phone || "Belirtilmedi";
}

function getAdminReadError(
  error: unknown,
  message = "Supabase verisi şu anda okunamadı.",
) {
  const appError = handleServiceError(error, {
    logContext: "Admin Supabase read failed.",
    publicMessage: message,
  });

  return getPublicErrorMessage(appError, message);
}

function warnAdminWriteError(context: string, error: unknown) {
  handleServiceError(error, {
    logContext: `Admin Supabase ${context} failed.`,
    publicMessage: "Admin işlemi şu anda tamamlanamadı.",
  });
}

function warnAdminAccessError(context: string, error: unknown) {
  handleServiceError(error, {
    logContext: `Admin access ${context} failed.`,
    publicMessage: adminNotAuthorizedMessage,
  });
}

function createAdminActionResult(
  code: AdminProviderApplicationActionCode,
  ok: boolean,
): AdminProviderApplicationActionResult {
  return {
    code,
    ok,
  };
}

function createServiceRequestActionResult(
  code: AdminServiceRequestActionCode,
  ok: boolean,
): AdminServiceRequestActionResult {
  return {
    code,
    ok,
  };
}

function createProviderStatusActionResult(
  code: AdminProviderStatusActionCode,
  ok: boolean,
): AdminProviderStatusActionResult {
  return {
    code,
    ok,
  };
}

function isAdminServiceRequestStatus(
  status: string,
): status is AdminServiceRequestStatus {
  return adminServiceRequestStatuses.includes(status as AdminServiceRequestStatus);
}

function isAdminProviderStatusAction(
  action: string,
): action is AdminProviderStatusAction {
  return adminProviderStatusActions.includes(action as AdminProviderStatusAction);
}

function createEmptyReadResult<T>(
  error: string | null = null,
  isConfigured = isSupabaseServerConfigured,
): AdminReadResult<T> {
  return {
    error,
    isConfigured,
    rows: [],
  };
}

async function getAdminAccessForClient(
  supabase: AdminSupabaseClient,
): Promise<AdminAccessResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    warnAdminAccessError("user lookup", userError);
  }

  if (!user) {
    return {
      isConfigured: isSupabaseServerConfigured,
      message: adminMissingSessionMessage,
      ok: false,
      reason: "missing-session",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    warnAdminAccessError("profile role lookup", profileError);
  }

  const adminProfile = profile as AdminProfile | null;

  if (adminProfile?.role === ADMIN_ROLE) {
    return {
      isConfigured: true,
      ok: true,
      profile: adminProfile,
      role: ADMIN_ROLE,
      userId: user.id,
    };
  }

  return {
    isConfigured: true,
    message: adminNotAuthorizedMessage,
    ok: false,
    reason: "not-admin",
    role: adminProfile?.role ?? null,
    userId: user.id,
  };
}

async function getAdminSupabaseAccess(): Promise<AdminSupabaseAccess> {
  if (!isSupabaseServerConfigured) {
    return {
      access: {
        isConfigured: false,
        message: adminMissingSessionMessage,
        ok: false,
        reason: "missing-session",
      },
      supabase: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      access: {
        isConfigured: false,
        message: adminMissingSessionMessage,
        ok: false,
        reason: "missing-session",
      },
      supabase: null,
    };
  }

  const access = await getAdminAccessForClient(supabase);

  if (!access.ok) {
    return {
      access,
      supabase: null,
    };
  }

  return {
    access,
    supabase,
  };
}

export async function getAdminAccess(): Promise<AdminAccessResult> {
  const { access } = await getAdminSupabaseAccess();

  return access;
}

async function getSupabaseForAdminRead() {
  return getAdminSupabaseAccess();
}

async function getSupabaseForAdminWrite() {
  return getAdminSupabaseAccess();
}

function createApplicationStatusConflictResult(status: string) {
  if (status === "approved") {
    return createAdminActionResult("application-already-approved", false);
  }

  if (status === "rejected") {
    return createAdminActionResult("application-already-rejected", false);
  }

  return createAdminActionResult("application-action-failed", false);
}

async function updatePendingProviderApplicationStatus(
  supabase: AdminSupabaseClient,
  applicationId: string,
  status: "approved" | "rejected",
) {
  const { data, error } = await supabase
    .from("provider_applications")
    .update({ status })
    .eq("id", applicationId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    warnAdminWriteError("provider application status update", error);
    return createAdminActionResult("application-action-failed", false);
  }

  if (!data) {
    return createAdminActionResult("application-not-found", false);
  }

  return createAdminActionResult(
    status === "approved" ? "application-approved-provider-created" : "application-rejected",
    true,
  );
}

async function rollbackProviderApplicationStatus(
  supabase: AdminSupabaseClient,
  applicationId: string,
) {
  const { error } = await supabase
    .from("provider_applications")
    .update({ status: "pending" })
    .eq("id", applicationId)
    .eq("status", "approved");

  if (error) {
    warnAdminWriteError("provider application approval rollback", error);
  }
}

async function createProviderFromApplication(
  supabase: AdminSupabaseClient,
  application: AdminProviderApplicationApprovalRecord,
): Promise<AdminProviderApplicationProviderActionResult> {
  if (!application.category_id || !application.district_id) {
    return createAdminActionResult("provider-create-failed", false);
  }

  const phone = application.phone.trim();
  const whatsapp = application.whatsapp?.trim() || phone;
  const description =
    application.description?.trim() ||
    `${application.full_name} Fuwu usta başvurusundan oluşturulan sağlayıcı profili.`;

  const { data: createdProvider, error } = await supabase
    .from("providers")
    .insert({
      category_id: application.category_id,
      description,
      district_id: application.district_id,
      experience_years: application.experience_years,
      is_active: true,
      is_approved: true,
      name: application.full_name.trim(),
      phone,
      whatsapp,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    warnAdminWriteError("provider creation", error);
    return createAdminActionResult("provider-create-failed", false);
  }

  if (!createdProvider) {
    return createAdminActionResult("provider-create-failed", false);
  }

  return {
    ...createAdminActionResult("application-approved-provider-created", true),
    providerId: createdProvider.id,
  };
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardResult> {
  const adminAccess = await getSupabaseForAdminRead();
  const { supabase } = adminAccess;

  if (!supabase) {
    return {
      error: adminAccess.access.message,
      isConfigured: adminAccess.access.isConfigured,
      summary: emptyDashboardSummary,
    };
  }

  const [
    totalProvidersResult,
    activeProvidersResult,
    pendingApplicationsResult,
    totalServiceRequestsResult,
    newServiceRequestsResult,
  ] = await Promise.all([
    supabase.from("providers").select("id", { count: "exact", head: true }),
    supabase
      .from("providers")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("is_approved", true),
    supabase
      .from("provider_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("service_requests").select("id", { count: "exact", head: true }),
    supabase
      .from("service_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
  ]);

  const results = [
    totalProvidersResult,
    activeProvidersResult,
    pendingApplicationsResult,
    totalServiceRequestsResult,
    newServiceRequestsResult,
  ];
  const firstError = results.find((result) => result.error)?.error ?? null;

  return {
    error: firstError
      ? getAdminReadError(
          firstError,
          "Dashboard istatistikleri şu anda Supabase'den yüklenemedi.",
        )
      : null,
    isConfigured: true,
    summary: {
      activeProviders: activeProvidersResult.count ?? 0,
      newServiceRequests: newServiceRequestsResult.count ?? 0,
      pendingApplications: pendingApplicationsResult.count ?? 0,
      totalProviders: totalProvidersResult.count ?? 0,
      totalServiceRequests: totalServiceRequestsResult.count ?? 0,
    },
  };
}

export async function approveAdminProviderApplication(
  applicationId: string,
): Promise<AdminProviderApplicationActionResult> {
  const normalizedApplicationId = sanitizeText(applicationId, 80);

  if (!normalizedApplicationId) {
    return createAdminActionResult("application-missing-id", false);
  }

  const adminAccess = await getSupabaseForAdminWrite();
  const { supabase } = adminAccess;

  if (!supabase) {
    return createAdminActionResult(
      adminAccess.access.isConfigured
        ? "admin-not-authorized"
        : "supabase-not-configured",
      false,
    );
  }

  const { data, error } = await supabase
    .from("provider_applications")
    .select(
      `
        id,
        full_name,
        phone,
        whatsapp,
        category_id,
        district_id,
        experience_years,
        description,
        status
      `,
    )
    .eq("id", normalizedApplicationId)
    .maybeSingle();

  if (error) {
    warnAdminWriteError("provider application lookup", error);
    return createAdminActionResult("application-action-failed", false);
  }

  if (!data) {
    return createAdminActionResult("application-not-found", false);
  }

  const application = data as AdminProviderApplicationApprovalRecord;

  if (application.status !== "pending") {
    return createApplicationStatusConflictResult(application.status);
  }

  const statusResult = await updatePendingProviderApplicationStatus(
    supabase,
    normalizedApplicationId,
    "approved",
  );

  if (!statusResult.ok) {
    return statusResult;
  }

  const providerResult = await createProviderFromApplication(
    supabase,
    application,
  );

  if (!providerResult.ok) {
    await rollbackProviderApplicationStatus(supabase, normalizedApplicationId);
    return providerResult;
  }

  await notifyProviderApplicationApproved({
    applicationId: normalizedApplicationId,
    providerId: providerResult.providerId,
  });

  return providerResult;
}

export async function rejectAdminProviderApplication(
  applicationId: string,
): Promise<AdminProviderApplicationActionResult> {
  const normalizedApplicationId = sanitizeText(applicationId, 80);

  if (!normalizedApplicationId) {
    return createAdminActionResult("application-missing-id", false);
  }

  const adminAccess = await getSupabaseForAdminWrite();
  const { supabase } = adminAccess;

  if (!supabase) {
    return createAdminActionResult(
      adminAccess.access.isConfigured
        ? "admin-not-authorized"
        : "supabase-not-configured",
      false,
    );
  }

  const { data, error } = await supabase
    .from("provider_applications")
    .select("status")
    .eq("id", normalizedApplicationId)
    .maybeSingle();

  if (error) {
    warnAdminWriteError("provider application lookup", error);
    return createAdminActionResult("application-action-failed", false);
  }

  if (!data) {
    return createAdminActionResult("application-not-found", false);
  }

  const application = data as AdminProviderApplicationRejectionRecord;

  if (application.status !== "pending") {
    return createApplicationStatusConflictResult(application.status);
  }

  const statusResult = await updatePendingProviderApplicationStatus(
    supabase,
    normalizedApplicationId,
    "rejected",
  );

  if (!statusResult.ok) {
    return statusResult;
  }

  await notifyProviderApplicationRejected({
    applicationId: normalizedApplicationId,
  });

  return statusResult;
}

export async function updateAdminServiceRequestStatus(
  requestId: string,
  status: string,
): Promise<AdminServiceRequestActionResult> {
  const normalizedRequestId = sanitizeText(requestId, 80);
  const normalizedStatus = sanitizeText(status, 40);

  if (!normalizedRequestId) {
    return createServiceRequestActionResult("service-request-missing-id", false);
  }

  if (!isAdminServiceRequestStatus(normalizedStatus)) {
    return createServiceRequestActionResult("service-request-invalid-status", false);
  }

  const adminAccess = await getSupabaseForAdminWrite();
  const { supabase } = adminAccess;

  if (!supabase) {
    return createServiceRequestActionResult(
      adminAccess.access.isConfigured
        ? "admin-not-authorized"
        : "supabase-not-configured",
      false,
    );
  }

  const { data, error } = await supabase
    .from("service_requests")
    .update({ status: normalizedStatus })
    .eq("id", normalizedRequestId)
    .select("id")
    .maybeSingle();

  if (error) {
    warnAdminWriteError("service request status update", error);
    return createServiceRequestActionResult("service-request-action-failed", false);
  }

  if (!data) {
    return createServiceRequestActionResult("service-request-not-found", false);
  }

  return createServiceRequestActionResult("service-request-updated", true);
}

export async function updateAdminProviderStatus(
  providerId: string,
  action: string,
): Promise<AdminProviderStatusActionResult> {
  const normalizedProviderId = sanitizeText(providerId, 80);
  const normalizedAction = sanitizeText(action, 40);

  if (!normalizedProviderId) {
    return createProviderStatusActionResult("provider-missing-id", false);
  }

  if (!isAdminProviderStatusAction(normalizedAction)) {
    return createProviderStatusActionResult("provider-invalid-action", false);
  }

  const adminAccess = await getSupabaseForAdminWrite();
  const { supabase } = adminAccess;

  if (!supabase) {
    return createProviderStatusActionResult(
      adminAccess.access.isConfigured
        ? "admin-not-authorized"
        : "supabase-not-configured",
      false,
    );
  }

  const updatePayload: AdminProviderPublicationUpdate =
    normalizedAction === "activate"
      ? { is_active: true }
      : normalizedAction === "deactivate"
        ? { is_active: false }
        : normalizedAction === "approve"
          ? { is_active: true, is_approved: true }
          : { is_approved: false };

  const { data, error } = await supabase
    .from("providers")
    .update(updatePayload)
    .eq("id", normalizedProviderId)
    .select("id")
    .maybeSingle();

  if (error) {
    warnAdminWriteError("provider status update", error);
    return createProviderStatusActionResult("provider-action-failed", false);
  }

  if (!data) {
    return createProviderStatusActionResult("provider-not-found", false);
  }

  const successCodeByAction: Record<
    AdminProviderStatusAction,
    AdminProviderStatusActionCode
  > = {
    activate: "provider-activated",
    approve: "provider-approved",
    deactivate: "provider-deactivated",
    unpublish: "provider-unpublished",
  };

  return createProviderStatusActionResult(successCodeByAction[normalizedAction], true);
}

export async function getAdminProviders(): Promise<AdminReadResult<AdminProvider>> {
  const adminAccess = await getSupabaseForAdminRead();
  const { supabase } = adminAccess;

  if (!supabase) {
    return createEmptyReadResult(
      adminAccess.access.message,
      adminAccess.access.isConfigured,
    );
  }

  const { data, error } = await supabase
    .from("providers")
    .select(
      `
        id,
        name,
        phone,
        whatsapp,
        average_price_min,
        average_price_max,
        rating,
        is_active,
        is_approved,
        service_categories(name),
        districts(name)
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return createEmptyReadResult(getAdminReadError(error));
  }

  return {
    error: null,
    isConfigured: true,
    rows: ((data ?? []) as unknown as AdminProviderRecord[]).map((provider) => ({
      averagePriceRange: formatAveragePriceRange(
        provider.average_price_min,
        provider.average_price_max,
      ),
      category: getRelationName(provider.service_categories),
      district: getRelationName(provider.districts),
      id: provider.id,
      isActive: provider.is_active,
      isApproved: provider.is_approved,
      name: provider.name,
      phone: provider.phone,
      rating: Number(provider.rating ?? 0),
      whatsapp: provider.whatsapp?.trim() || "Belirtilmedi",
    })),
  };
}

export async function getAdminProviderApplications(): Promise<
  AdminReadResult<AdminProviderApplication>
> {
  const adminAccess = await getSupabaseForAdminRead();
  const { supabase } = adminAccess;

  if (!supabase) {
    return createEmptyReadResult(
      adminAccess.access.message,
      adminAccess.access.isConfigured,
    );
  }

  const { data, error } = await supabase
    .from("provider_applications")
    .select(
      `
        id,
        full_name,
        phone,
        whatsapp,
        experience_years,
        description,
        status,
        created_at,
        service_categories(name),
        districts(name)
      `,
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return createEmptyReadResult(getAdminReadError(error));
  }

  return {
    error: null,
    isConfigured: true,
    rows: ((data ?? []) as unknown as AdminProviderApplicationRecord[]).map(
      (application) => ({
        category: getRelationName(application.service_categories),
        createdAt: application.created_at,
        description: application.description,
        district: getRelationName(application.districts),
        experience: `${application.experience_years} yıl`,
        fullName: application.full_name,
        id: application.id,
        phone: application.phone,
        status: application.status,
        whatsapp: application.whatsapp,
      }),
    ),
  };
}

export async function getAdminServiceRequests(): Promise<
  AdminReadResult<AdminServiceRequest>
> {
  const adminAccess = await getSupabaseForAdminRead();
  const { supabase } = adminAccess;

  if (!supabase) {
    return createEmptyReadResult(
      adminAccess.access.message,
      adminAccess.access.isConfigured,
    );
  }

  const { data, error } = await supabase
    .from("service_requests")
    .select(
      `
        id,
        user_id,
        urgency,
        status,
        preferred_date,
        preferred_time,
        description,
        created_at,
        service_categories(name),
        districts(name),
        profiles(full_name, phone)
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return createEmptyReadResult(getAdminReadError(error));
  }

  return {
    error: null,
    isConfigured: true,
    rows: ((data ?? []) as unknown as AdminServiceRequestRecord[]).map((request) => ({
      category: getRelationName(request.service_categories),
      createdAt: request.created_at,
      customerName: getRequestCustomerName(
        request.profiles,
        request.user_id,
        request.description,
      ),
      district: getRelationName(request.districts),
      id: request.id,
      phone: getRequestPhone(request.profiles, request.description),
      preferredDate: request.preferred_date,
      preferredTime: request.preferred_time,
      status: request.status,
      urgency: request.urgency,
    })),
  };
}
