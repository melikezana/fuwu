import { getPublicErrorMessage, handleServiceError } from "@/lib/errors";
import {
  PROVIDER_APPLICATION_STATUSES,
  isProviderApplicationStatus,
  isProviderAvailabilityStatus,
  normalizeProviderAvailabilityStatus,
  SERVICE_REQUEST_STATUSES,
  SERVICE_REQUEST_STATUS_VALUES,
  isServiceRequestTransitionAllowed,
  normalizeServiceRequestStatus,
  type ProviderAvailabilityStatus,
  type ProviderApplicationStatus,
  type ServiceRequestStatus,
} from "@/lib/constants/statuses";
import { ValidationError } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import {
  calculateProviderProfileCompletion,
  formatProviderResponseTime,
  formatProviderWorkingHours,
  getProviderOperationalStatus,
  providerWorkingHourOptions,
} from "@/lib/providers/trust";
import { sanitizePhone, sanitizeText } from "@/lib/validations";
import { isUuid } from "@/lib/utils";
import {
  notifyProviderApplicationApproved,
  notifyProviderApplicationRejected,
} from "@/services/notifications";
import {
  createServiceFailure,
  createServiceSuccess,
} from "@/services/serviceResponse";
import {
  assignProviderToEmergencyRequest,
  assignProviderToRequest,
} from "@/services/requests";
import { calculateEstimatedArrivalText } from "@/services/tracking";
import { authAccessMessages, hasAdminRole } from "@/services/auth/constants";
import { getServerAuthContext } from "@/services/auth/server";

type ProviderRow = Database["public"]["Tables"]["providers"]["Row"];
type ProviderApplicationRow =
  Database["public"]["Tables"]["provider_applications"]["Row"];
type ServiceRequestRow =
  Database["public"]["Tables"]["service_requests"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type AdminSupabaseClient = SupabaseClient<Database>;

const adminMissingSessionMessage = authAccessMessages.loginRequired;
const adminNotAuthorizedMessage = authAccessMessages.accessDenied;

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
  | "description"
  | "id"
  | "identity_verified"
  | "is_active"
  | "is_approved"
  | "is_verified"
  | "last_active_at"
  | "name"
  | "phone"
  | "phone_verified"
  | "profile_completion_score"
  | "profile_image_url"
  | "rating"
  | "response_time_minutes"
  | "whatsapp"
  | "working_hours"
> & {
  availability?: string | null;
  districts: MaybeRelation;
  service_categories: MaybeRelation;
};

type AdminProviderApplicationRecord = Pick<
  ProviderApplicationRow,
  | "created_at"
  | "experience_years"
  | "full_name"
  | "id"
  | "phone"
  | "status"
  | "introduction"
> & {
  districts: MaybeRelation;
  service_categories: MaybeRelation;
};

type AdminProviderApplicationApprovalRecord = Pick<
  ProviderApplicationRow,
  | "availability"
  | "category_id"
  | "district_id"
  | "experience_years"
  | "full_name"
  | "id"
  | "phone"
  | "status"
  | "introduction"
> & {
  user_id?: string | null;
};

type ExistingProviderApprovalRecord = Pick<
  ProviderRow,
  "id" | "is_active" | "is_approved" | "user_id"
>;

type ApprovedProviderApplicationPayload = {
  availability: ProviderAvailabilityStatus | null;
  description: string;
  name: string;
  phone: string;
  userId: string | null;
};

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
  | "urgency_type"
  | "budget_tag"
  | "offered_price"
  | "payment_preference"
  | "confirmation_code"
  | "estimated_arrival_text"
  | "approximate_location"
  | "emergency_status"
  | "accepted_provider_id"
  | "accepted_at"
  | "user_id"
  | "assigned_provider_id"
> & {
  districts: MaybeRelation;
  profiles: MaybeProfileRelation;
  service_categories: MaybeRelation;
  assigned_provider:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
};

type AdminServiceRequestStatusRecord = Pick<
  ServiceRequestRow,
  "assigned_provider_id" | "id" | "status" | "urgency_type"
> & {
  districts: MaybeRelation;
};

type AdminProviderPublicationUpdate = Partial<
  Pick<ProviderRow, "is_active" | "is_approved" | "is_verified" | "last_active_at">
>;

type AdminProviderTrustUpdate = Partial<
  Pick<ProviderRow, "availability" | "response_time_minutes" | "working_hours">
>;

type AdminProviderApplicationProviderActionResult =
  AdminProviderApplicationActionResult & {
    providerId?: string;
  };

export type AdminProvider = {
  averagePriceRange: string;
  availability: ProviderAvailabilityStatus;
  availabilityStatusLabel: string;
  availabilityStatusTone: "green" | "neutral" | "orange";
  category: string;
  district: string;
  identityVerified: boolean;
  id: string;
  isActive: boolean;
  isApproved: boolean;
  isVerified: boolean;
  lastActiveAt: string | null;
  name: string;
  phone: string;
  phoneVerified: boolean;
  profileCompletionMissingFields: string[];
  profileCompletionScore: number;
  rating: number;
  responseTime: string;
  responseTimeMinutes: number | null;
  whatsapp: string;
  workingHours: string;
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
  urgencyType: string;
  budgetTag: string | null;
  offeredPrice: number | null;
  paymentPreference: string | null;
  confirmationCode: string | null;
  estimatedArrivalText: string | null;
  approximateLocation: string | null;
  emergencyStatus: string | null;
  acceptedProviderId: string | null;
  acceptedAt: string | null;
  assignedProviderId: string | null;
  assignedProviderName: string | null;
};

export type AdminReadResult<T> = {
  error: string | null;
  isConfigured: boolean;
  rows: T[];
};

export type AdminDashboardSummary = {
  activeProviders: number;
  approvedApplications: number;
  newServiceRequests: number;
  pendingApplications: number;
  rejectedApplications: number;
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
  | "unpublish"
  | "unverify"
  | "verify";

export type AdminProviderStatusActionCode =
  | "admin-not-authorized"
  | "provider-action-failed"
  | "provider-activated"
  | "provider-approved"
  | "provider-deactivated"
  | "provider-invalid-availability"
  | "provider-invalid-action"
  | "provider-missing-id"
  | "provider-not-found"
  | "provider-trust-updated"
  | "provider-unpublished"
  | "provider-unverified"
  | "provider-verified"
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
  | "application-approved-provider-exists"
  | "application-invalid-id"
  | "application-invalid-status"
  | "application-missing-id"
  | "application-not-found"
  | "application-rejected"
  | "provider-create-failed"
  | "supabase-not-configured";

export type AdminProviderApplicationActionResult = {
  code: AdminProviderApplicationActionCode;
  ok: boolean;
};

export type AdminServiceRequestStatus = ServiceRequestStatus;

export type AdminServiceRequestActionCode =
  | "admin-not-authorized"
  | "service-request-action-failed"
  | "service-request-invalid-status"
  | "service-request-invalid-transition"
  | "service-request-missing-id"
  | "service-request-missing-provider"
  | "service-request-not-found"
  | "service-request-updated"
  | "supabase-not-configured";

export type AdminServiceRequestActionResult = {
  code: AdminServiceRequestActionCode;
  ok: boolean;
};

export type AdminAssignableProvider = {
  districtId: string;
  experienceYears: number;
  id: string;
  name: string;
  phone: string;
};

const adminServiceRequestStatuses: AdminServiceRequestStatus[] =
  SERVICE_REQUEST_STATUS_VALUES;

const emptyDashboardSummary: AdminDashboardSummary = {
  activeProviders: 0,
  approvedApplications: 0,
  newServiceRequests: 0,
  pendingApplications: 0,
  rejectedApplications: 0,
  totalProviders: 0,
  totalServiceRequests: 0,
};

const adminProviderStatusActions: AdminProviderStatusAction[] = [
  "activate",
  "approve",
  "deactivate",
  "unpublish",
  "unverify",
  "verify",
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
    return `${formatPrice(minimumPrice)} TL ve Ã¼zeri`;
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

  return `MÃ¼ÅŸteri ${userId.slice(0, 8).toLocaleUpperCase("tr")}`;
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
      line.toLocaleLowerCase("tr").startsWith("iletiÅŸim:"),
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
  message = "Supabase verisi ÅŸu anda okunamadÄ±.",
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
    publicMessage: "Admin iÅŸlemi ÅŸu anda tamamlanamadÄ±.",
  });
}

const optionalAdminProviderColumnNames = [
  "availability",
  "identity_verified",
  "is_verified",
  "last_active_at",
  "phone_verified",
  "profile_completion_score",
  "profile_image_url",
  "response_time_minutes",
  "working_hours",
];

function isMissingOptionalProviderColumn(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: unknown; details?: unknown; message?: unknown };
  const errorText = [record.code, record.details, record.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase("tr");

  return (
    errorText.includes("column") &&
    optionalAdminProviderColumnNames.some((columnName) => errorText.includes(columnName))
  );
}

function isMissingAdminColumn(error: unknown, columnName: string) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: unknown; details?: unknown; message?: unknown };
  const errorText = [record.code, record.details, record.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase("tr");

  return errorText.includes("column") && errorText.includes(columnName);
}

async function insertAuditLog({
  action,
  actorUserId,
  entityId,
  entityType,
  metadata = {},
  supabase,
}: {
  action: string;
  actorUserId: string;
  entityId: string | null;
  entityType: string;
  metadata?: Json;
  supabase: AdminSupabaseClient;
}) {
  const { error } = await supabase.from("audit_logs").insert({
    action,
    actor_user_id: actorUserId,
    entity_id: entityId,
    entity_type: entityType,
    metadata,
  });

  if (error) {
    warnAdminWriteError("audit log insert", error);
  }
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
  return adminServiceRequestStatuses.includes(
    status as AdminServiceRequestStatus,
  );
}

function isAdminProviderStatusAction(
  action: string,
): action is AdminProviderStatusAction {
  return adminProviderStatusActions.includes(action as AdminProviderStatusAction);
}

function createEmptyReadResult<T>(
  error: string | null = null,
  isConfigured = true,
): AdminReadResult<T> {
  return createAdminReadResult([], error, isConfigured);
}

function createAdminReadResult<T>(
  rows: T[],
  error: string | null = null,
  isConfigured = true,
): AdminReadResult<T> {
  const response = error
    ? createServiceFailure<T[]>(error)
    : createServiceSuccess<T[]>(rows);

  return {
    error: response.error,
    isConfigured,
    rows: response.data ?? rows,
  };
}

async function getAdminSupabaseAccess(): Promise<AdminSupabaseAccess> {
  const authContext = await getServerAuthContext();

  if (!authContext.supabase) {
    return {
      access: {
        isConfigured: authContext.isConfigured,
        message: adminMissingSessionMessage,
        ok: false,
        reason: "missing-session",
      },
      supabase: null,
    };
  }

  if (!authContext.user) {
    return {
      access: {
        isConfigured: authContext.isConfigured,
        message: adminMissingSessionMessage,
        ok: false,
        reason: "missing-session",
      },
      supabase: null,
    };
  }

  if (hasAdminRole(authContext.profile)) {
    return {
      access: {
        isConfigured: true,
        ok: true,
        profile: authContext.profile as AdminProfile,
        role: "admin",
        userId: authContext.user.id,
      },
      supabase: authContext.supabase,
    };
  }

  return {
    access: {
      isConfigured: true,
      message: adminNotAuthorizedMessage,
      ok: false,
      reason: "not-admin",
      role: authContext.profile?.role ?? null,
      userId: authContext.user.id,
    },
    supabase: null,
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
  if (status === PROVIDER_APPLICATION_STATUSES.approved) {
    return createAdminActionResult("application-already-approved", false);
  }

  if (status === PROVIDER_APPLICATION_STATUSES.rejected) {
    return createAdminActionResult("application-already-rejected", false);
  }

  if (!isProviderApplicationStatus(status)) {
    return createAdminActionResult("application-invalid-status", false);
  }

  return createAdminActionResult("application-action-failed", false);
}

function createInvalidApplicationIdResult(action: string) {
  handleServiceError(
    new ValidationError("Invalid provider application UUID.", {
      publicMessage: "Geçersiz başvuru kimliği.",
    }),
    {
      logContext: `Admin provider application ${action} rejected invalid UUID.`,
    },
  );

  return createAdminActionResult("application-invalid-id", false);
}

function normalizeAdminApplicationId(applicationId: string, action: string) {
  const normalizedApplicationId = sanitizeText(applicationId, 80);

  if (!normalizedApplicationId) {
    return createAdminActionResult("application-missing-id", false);
  }

  if (!isUuid(normalizedApplicationId)) {
    return createInvalidApplicationIdResult(action);
  }

  return normalizedApplicationId;
}

async function updatePendingProviderApplicationStatus(
  supabase: AdminSupabaseClient,
  applicationId: string,
  status: ProviderApplicationStatus,
) {
  if (
    !isProviderApplicationStatus(status) ||
    status === PROVIDER_APPLICATION_STATUSES.pending
  ) {
    handleServiceError(
      new ValidationError("Invalid provider application status update.", {
        publicMessage: "Geçersiz başvuru durumu.",
      }),
      {
        logContext: "Admin provider application update rejected invalid status.",
      },
    );

    return createAdminActionResult("application-invalid-status", false);
  }

  const { data, error } = await supabase
    .from("provider_applications")
    .update({ status })
    .eq("id", applicationId)
    .eq("status", PROVIDER_APPLICATION_STATUSES.pending)
    .select("id")
    .maybeSingle();

  if (error) {
    warnAdminWriteError("provider application status update", error);
    return createAdminActionResult("application-action-failed", false);
  }

  if (!data) {
    const { data: currentApplication, error: lookupError } = await supabase
      .from("provider_applications")
      .select("status")
      .eq("id", applicationId)
      .maybeSingle();

    if (lookupError) {
      warnAdminWriteError("provider application status conflict lookup", lookupError);
      return createAdminActionResult("application-action-failed", false);
    }

    if (currentApplication?.status) {
      return createApplicationStatusConflictResult(String(currentApplication.status));
    }

    return createAdminActionResult("application-not-found", false);
  }

  return createAdminActionResult(
    status === PROVIDER_APPLICATION_STATUSES.approved
      ? "application-approved-provider-created"
      : "application-rejected",
    true,
  );
}

async function rollbackProviderApplicationStatus(
  supabase: AdminSupabaseClient,
  applicationId: string,
) {
  const { error } = await supabase
    .from("provider_applications")
    .update({ status: PROVIDER_APPLICATION_STATUSES.pending })
    .eq("id", applicationId)
    .eq("status", PROVIDER_APPLICATION_STATUSES.approved);

  if (error) {
    warnAdminWriteError("provider application approval rollback", error);
  }
}

async function grantProviderRoleToApplicant(
  supabase: AdminSupabaseClient,
  userId: string,
) {
  const { error } = await supabase
    .from("profiles")
    .update({ role: "provider" })
    .eq("id", userId);

  if (error) {
    warnAdminWriteError("provider role grant", error);
    return false;
  }

  return true;
}

async function approveExistingProviderForApplicant(
  supabase: AdminSupabaseClient,
  provider: ExistingProviderApprovalRecord,
  application: AdminProviderApplicationApprovalRecord,
  payload: ApprovedProviderApplicationPayload,
) {
  const updatePayload: Database["public"]["Tables"]["providers"]["Update"] = {
    category_id: application.category_id,
    description: payload.description,
    district_id: application.district_id,
    experience_years: application.experience_years,
    is_active: true,
    is_approved: true,
    is_verified: true,
    last_active_at: new Date().toISOString(),
    name: payload.name,
    phone: payload.phone,
    whatsapp: payload.phone,
  };

  if (payload.availability) {
    updatePayload.availability = payload.availability;
  }

  if (payload.userId) {
    updatePayload.user_id = payload.userId;
  }

  const { error } = await supabase
    .from("providers")
    .update(updatePayload)
    .eq("id", provider.id);

  if (error) {
    warnAdminWriteError("provider applicant link update", error);
    return false;
  }

  return true;
}

async function findExistingProviderForApproval(
  supabase: AdminSupabaseClient,
  application: AdminProviderApplicationApprovalRecord,
  applicantUserId: string | null,
  phone: string,
) {
  if (applicantUserId) {
    const { data: providerByUser, error: providerByUserError } = await supabase
      .from("providers")
      .select("id, user_id, is_active, is_approved")
      .eq("user_id", applicantUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (providerByUserError) {
      warnAdminWriteError("provider user duplicate lookup", providerByUserError);
      return {
        error: providerByUserError,
        provider: null,
      };
    }

    if (providerByUser?.id) {
      return {
        error: null,
        provider: providerByUser as ExistingProviderApprovalRecord,
      };
    }
  }

  const { data: providerByServiceArea, error: providerByServiceAreaError } =
    await supabase
      .from("providers")
      .select("id, user_id, is_active, is_approved")
      .eq("phone", phone)
      .eq("category_id", application.category_id)
      .eq("district_id", application.district_id)
      .limit(1)
      .maybeSingle();

  if (providerByServiceAreaError) {
    warnAdminWriteError("provider duplicate lookup", providerByServiceAreaError);
    return {
      error: providerByServiceAreaError,
      provider: null,
    };
  }

  return {
    error: null,
    provider: providerByServiceArea as ExistingProviderApprovalRecord | null,
  };
}

async function findApplicantUserIdForApplication(
  supabase: AdminSupabaseClient,
  application: Pick<AdminProviderApplicationApprovalRecord, "phone" | "user_id">,
) {
  if (application.user_id) {
    return application.user_id;
  }

  const phone = sanitizePhone(application.phone);

  if (!phone) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();

  if (error) {
    warnAdminWriteError("provider applicant profile lookup", error);
    return null;
  }

  return data?.id ?? null;
}

function getApprovedProviderAvailability(
  availability: string | null | undefined,
) {
  const normalizedAvailability = sanitizeText(
    availability ?? "",
    40,
  ).toLocaleLowerCase("tr");

  return isProviderAvailabilityStatus(normalizedAvailability)
    ? normalizedAvailability
    : null;
}

async function createProviderFromApplication(
  supabase: AdminSupabaseClient,
  application: AdminProviderApplicationApprovalRecord,
): Promise<AdminProviderApplicationProviderActionResult> {
  if (!application.category_id || !application.district_id) {
    return createAdminActionResult("provider-create-failed", false);
  }

  const phone = sanitizePhone(application.phone);
  const whatsapp = phone;
  const description =
    sanitizeText(application.introduction ?? "", 1200) ||
    `${sanitizeText(application.full_name, 120)} Fuwu usta baÅŸvurusundan oluÅŸturulan saÄŸlayÄ±cÄ± profili.`;
  const name = sanitizeText(application.full_name, 120);

  if (!name || !phone) {
    return createAdminActionResult("provider-create-failed", false);
  }

  const applicantUserId = await findApplicantUserIdForApplication(
    supabase,
    application,
  );

  const providerPayload: ApprovedProviderApplicationPayload = {
    availability: getApprovedProviderAvailability(application.availability),
    description,
    name,
    phone,
    userId: applicantUserId,
  };
  const { error: existingProviderError, provider: existingProvider } =
    await findExistingProviderForApproval(
      supabase,
      application,
      applicantUserId,
      phone,
    );

  if (existingProviderError) {
    return createAdminActionResult("provider-create-failed", false);
  }

  if (existingProvider?.id) {
    const wasLinked = await approveExistingProviderForApplicant(
      supabase,
      existingProvider,
      application,
      providerPayload,
    );

    if (!wasLinked) {
      return createAdminActionResult("provider-create-failed", false);
    }

    if (applicantUserId) {
      await grantProviderRoleToApplicant(supabase, applicantUserId);
    }

    return {
      ...createAdminActionResult("application-approved-provider-exists", true),
      providerId: existingProvider.id,
    };
  }

  const insertPayload: Database["public"]["Tables"]["providers"]["Insert"] = {
    average_price_max: null,
    average_price_min: null,
    category_id: application.category_id,
    description,
    district_id: application.district_id,
    experience_years: application.experience_years,
    is_active: true,
    is_approved: true,
    is_verified: true,
    last_active_at: new Date().toISOString(),
    name,
    phone,
    rating: 0,
    user_id: applicantUserId,
    whatsapp,
  };

  if (providerPayload.availability) {
    insertPayload.availability = providerPayload.availability;
  }

  const { data: createdProvider, error } = await supabase
    .from("providers")
    .insert(insertPayload)
    .select("id")
    .maybeSingle();

  if (error) {
    warnAdminWriteError("provider creation", error);
    return createAdminActionResult("provider-create-failed", false);
  }

  if (!createdProvider) {
    return createAdminActionResult("provider-create-failed", false);
  }

  if (applicantUserId) {
    await grantProviderRoleToApplicant(supabase, applicantUserId);
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
    approvedApplicationsResult,
    rejectedApplicationsResult,
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
      .eq("status", PROVIDER_APPLICATION_STATUSES.pending),
    supabase
      .from("provider_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", PROVIDER_APPLICATION_STATUSES.approved),
    supabase
      .from("provider_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", PROVIDER_APPLICATION_STATUSES.rejected),
    supabase.from("service_requests").select("id", { count: "exact", head: true }),
    supabase
      .from("service_requests")
      .select("id", { count: "exact", head: true })
      .or(`status.eq.${SERVICE_REQUEST_STATUSES.yeni},status.eq.open`),
  ]);

  const results = [
    totalProvidersResult,
    activeProvidersResult,
    pendingApplicationsResult,
    approvedApplicationsResult,
    rejectedApplicationsResult,
    totalServiceRequestsResult,
    newServiceRequestsResult,
  ];
  const firstError = results.find((result) => result.error)?.error ?? null;

  return {
    error: firstError
      ? getAdminReadError(
          firstError,
          "Dashboard istatistikleri ÅŸu anda Supabase'den yÃ¼klenemedi.",
        )
      : null,
    isConfigured: true,
    summary: {
      activeProviders: activeProvidersResult.count ?? 0,
      approvedApplications: approvedApplicationsResult.count ?? 0,
      newServiceRequests: newServiceRequestsResult.count ?? 0,
      pendingApplications: pendingApplicationsResult.count ?? 0,
      rejectedApplications: rejectedApplicationsResult.count ?? 0,
      totalProviders: totalProvidersResult.count ?? 0,
      totalServiceRequests: totalServiceRequestsResult.count ?? 0,
    },
  };
}

async function getProviderApplicationForApproval(
  supabase: AdminSupabaseClient,
  applicationId: string,
) {
  const applicationSelectWithUserId = `
        id,
        user_id,
        full_name,
        phone,
        category_id,
        district_id,
        experience_years,
        availability,
        introduction,
        status
      `;
  const applicationSelect = `
        id,
        full_name,
        phone,
        category_id,
        district_id,
        experience_years,
        availability,
        introduction,
        status
      `;

  const result = await supabase
    .from("provider_applications")
    .select(applicationSelectWithUserId)
    .eq("id", applicationId)
    .maybeSingle();

  if (result.error && isMissingAdminColumn(result.error, "user_id")) {
    return supabase
      .from("provider_applications")
      .select(applicationSelect)
      .eq("id", applicationId)
      .maybeSingle();
  }

  return result;
}

export async function approveAdminProviderApplication(
  applicationId: string,
): Promise<AdminProviderApplicationActionResult> {
  const normalizedApplicationId = normalizeAdminApplicationId(
    applicationId,
    "approval",
  );

  if (typeof normalizedApplicationId !== "string") {
    return normalizedApplicationId;
  }

  try {
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

    const { data, error } = await getProviderApplicationForApproval(
      supabase,
      normalizedApplicationId,
    );

    if (error) {
      warnAdminWriteError("provider application lookup", error);
      return createAdminActionResult("application-action-failed", false);
    }

    if (!data) {
      return createAdminActionResult("application-not-found", false);
    }

    const application = data as AdminProviderApplicationApprovalRecord;

    if (!isProviderApplicationStatus(application.status)) {
      return createAdminActionResult("application-invalid-status", false);
    }

    if (application.status !== PROVIDER_APPLICATION_STATUSES.pending) {
      return createApplicationStatusConflictResult(application.status);
    }

    const statusResult = await updatePendingProviderApplicationStatus(
      supabase,
      normalizedApplicationId,
      PROVIDER_APPLICATION_STATUSES.approved,
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

    try {
      await notifyProviderApplicationApproved({
        applicationId: normalizedApplicationId,
        providerId: providerResult.providerId,
      });
    } catch (error) {
      warnAdminWriteError("provider application approval notification", error);
    }

    await insertAuditLog({
      action: "provider_application.approved",
      actorUserId: adminAccess.access.userId,
      entityId: normalizedApplicationId,
      entityType: "provider_application",
      metadata: {
        providerId: providerResult.providerId ?? null,
        resultCode: providerResult.code,
      },
      supabase,
    });

    return providerResult;
  } catch (error) {
    warnAdminWriteError("provider application approval", error);
    return createAdminActionResult("application-action-failed", false);
  }
}

export async function rejectAdminProviderApplication(
  applicationId: string,
): Promise<AdminProviderApplicationActionResult> {
  const normalizedApplicationId = normalizeAdminApplicationId(
    applicationId,
    "rejection",
  );

  if (typeof normalizedApplicationId !== "string") {
    return normalizedApplicationId;
  }

  try {
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

    if (!isProviderApplicationStatus(application.status)) {
      return createAdminActionResult("application-invalid-status", false);
    }

    if (application.status !== PROVIDER_APPLICATION_STATUSES.pending) {
      return createApplicationStatusConflictResult(application.status);
    }

    const statusResult = await updatePendingProviderApplicationStatus(
      supabase,
      normalizedApplicationId,
      PROVIDER_APPLICATION_STATUSES.rejected,
    );

    if (!statusResult.ok) {
      return statusResult;
    }

    try {
      await notifyProviderApplicationRejected({
        applicationId: normalizedApplicationId,
      });
    } catch (error) {
      warnAdminWriteError("provider application rejection notification", error);
    }

    await insertAuditLog({
      action: "provider_application.rejected",
      actorUserId: adminAccess.access.userId,
      entityId: normalizedApplicationId,
      entityType: "provider_application",
      metadata: {
        resultCode: statusResult.code,
      },
      supabase,
    });

    return statusResult;
  } catch (error) {
    warnAdminWriteError("provider application rejection", error);
    return createAdminActionResult("application-action-failed", false);
  }
}

export async function updateAdminServiceRequestStatus(
  requestId: string,
  status: string,
): Promise<AdminServiceRequestActionResult> {
  const normalizedRequestId = sanitizeText(requestId, 80);
  const normalizedStatus = normalizeServiceRequestStatus(sanitizeText(status, 40));

  if (!normalizedRequestId) {
    return createServiceRequestActionResult("service-request-missing-id", false);
  }

  if (!normalizedStatus || !isAdminServiceRequestStatus(normalizedStatus)) {
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

  const { data: existingRequest, error: lookupError } = await supabase
    .from("service_requests")
    .select("id, status, urgency_type, assigned_provider_id, districts(name)")
    .eq("id", normalizedRequestId)
    .maybeSingle();

  if (lookupError) {
    warnAdminWriteError("service request lookup", lookupError);
    return createServiceRequestActionResult("service-request-action-failed", false);
  }

  if (!existingRequest) {
    return createServiceRequestActionResult("service-request-not-found", false);
  }

  const currentRequest = existingRequest as AdminServiceRequestStatusRecord;
  const previousStatusValue = String(currentRequest.status);
  const previousStatus = normalizeServiceRequestStatus(previousStatusValue);

  if (
    previousStatus &&
    !isServiceRequestTransitionAllowed(previousStatus, normalizedStatus)
  ) {
    return createServiceRequestActionResult("service-request-invalid-transition", false);
  }

  const updatePayload: Partial<ServiceRequestRow> = {
    status: normalizedStatus,
  };
  const isEmergencyRequest = currentRequest.urgency_type === "emergency";

  const emergencyStatusRequiresProvider = new Set<ServiceRequestStatus>([
    SERVICE_REQUEST_STATUSES.accepted,
    SERVICE_REQUEST_STATUSES.onTheWay,
    SERVICE_REQUEST_STATUSES.completed,
  ]);

  if (
    isEmergencyRequest &&
    emergencyStatusRequiresProvider.has(normalizedStatus) &&
    !currentRequest.assigned_provider_id
  ) {
    return createServiceRequestActionResult("service-request-invalid-transition", false);
  }

  const acceptedAt =
    normalizedStatus === SERVICE_REQUEST_STATUSES.accepted ||
    normalizedStatus === SERVICE_REQUEST_STATUSES.onTheWay
      ? new Date().toISOString()
      : null;

  if (isEmergencyRequest && acceptedAt) {
    const districtRelation = currentRequest.districts;
    const districtName = Array.isArray(districtRelation)
      ? districtRelation[0]?.name
      : districtRelation?.name;

    updatePayload.accepted_at = acceptedAt;
    updatePayload.accepted_provider_id = currentRequest.assigned_provider_id;
    updatePayload.emergency_status = normalizedStatus as ServiceRequestRow["emergency_status"];
    updatePayload.estimated_arrival_text = calculateEstimatedArrivalText({
      acceptedAt,
      district: typeof districtName === "string" ? districtName : null,
      urgencyType: "emergency",
    });
  }

  if (
    isEmergencyRequest &&
    (normalizedStatus === SERVICE_REQUEST_STATUSES.completed ||
      normalizedStatus === SERVICE_REQUEST_STATUSES.cancelled)
  ) {
    updatePayload.emergency_status = normalizedStatus as ServiceRequestRow["emergency_status"];
  }

  const updateQuery = supabase
    .from("service_requests")
    .update(updatePayload)
    .eq("id", normalizedRequestId);

  if (previousStatus) {
    updateQuery.eq("status", previousStatus);
  }

  const { data, error } = await updateQuery.select("id").maybeSingle();

  if (error) {
    warnAdminWriteError("service request status update", error);
    return createServiceRequestActionResult("service-request-action-failed", false);
  }

  if (!data) {
    return createServiceRequestActionResult("service-request-not-found", false);
  }

  await insertAuditLog({
    action: "service_request.status_changed",
    actorUserId: adminAccess.access.userId,
    entityId: normalizedRequestId,
    entityType: "service_request",
    metadata: {
      previousStatus: previousStatus ?? previousStatusValue,
      status: normalizedStatus,
    },
    supabase,
  });

  return createServiceRequestActionResult("service-request-updated", true);
}

export async function getAdminAssignableProvidersForRequest(
  requestId: string,
): Promise<AdminReadResult<AdminAssignableProvider>> {
  const normalizedRequestId = sanitizeText(requestId, 80);

  if (!normalizedRequestId) {
    return createEmptyReadResult("Talep kimliÄŸi alÄ±namadÄ±.");
  }

  const adminAccess = await getSupabaseForAdminRead();
  const { supabase } = adminAccess;

  if (!supabase) {
    return createEmptyReadResult(
      adminAccess.access.message,
      adminAccess.access.isConfigured,
    );
  }

  const { data: request, error: requestError } = await supabase
    .from("service_requests")
    .select("id, category_id, district_id")
    .eq("id", normalizedRequestId)
    .maybeSingle();

  if (requestError) {
    return createEmptyReadResult(
      getAdminReadError(requestError, "Talep iÃ§in atanabilir ustalar okunamadÄ±."),
    );
  }

  if (!request) {
    return createEmptyReadResult("Talep bulunamadÄ±.");
  }

  const { data: providers, error: providersError } = await supabase
    .from("providers")
    .select("id, name, phone, experience_years, district_id")
    .eq("category_id", request.category_id)
    .eq("is_active", true)
    .eq("is_approved", true)
    .order("rating", { ascending: false });

  if (providersError) {
    return createEmptyReadResult(
      getAdminReadError(providersError, "Atanabilir ustalar ÅŸu anda okunamadÄ±."),
    );
  }

  const sortedProviders = (providers ?? []).sort((firstProvider, secondProvider) => {
    const firstExact = firstProvider.district_id === request.district_id;
    const secondExact = secondProvider.district_id === request.district_id;

    if (firstExact && !secondExact) {
      return -1;
    }

    if (!firstExact && secondExact) {
      return 1;
    }

    return firstProvider.name.localeCompare(secondProvider.name, "tr");
  });

  return createAdminReadResult(
    sortedProviders.map((provider) => ({
      districtId: provider.district_id,
      experienceYears: Number(provider.experience_years ?? 0),
      id: provider.id,
      name: sanitizeText(provider.name, 120),
      phone: sanitizePhone(provider.phone) || "Belirtilmedi",
    })),
  );
}

export async function assignAdminServiceRequest(
  requestId: string,
  providerId: string,
): Promise<AdminServiceRequestActionResult> {
  const normalizedRequestId = sanitizeText(requestId, 80);
  const normalizedProviderId = sanitizeText(providerId, 80);

  if (!normalizedRequestId) {
    return createServiceRequestActionResult("service-request-missing-id", false);
  }

  if (!normalizedProviderId) {
    return createServiceRequestActionResult("service-request-missing-provider", false);
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

  const { data: existingRequest, error: lookupError } = await supabase
    .from("service_requests")
    .select("id, status, urgency, urgency_type")
    .eq("id", normalizedRequestId)
    .maybeSingle();

  if (lookupError || !existingRequest) {
    return createServiceRequestActionResult("service-request-not-found", false);
  }

  if (existingRequest.urgency_type === "emergency" || existingRequest.urgency === "urgent") {
    try {
      await assignProviderToEmergencyRequest(normalizedRequestId, normalizedProviderId, supabase);
    } catch (error) {
      warnAdminWriteError("emergency service request provider assignment", error);
      return createServiceRequestActionResult("service-request-action-failed", false);
    }

    await insertAuditLog({
      action: "service_request.emergency_assigned",
      actorUserId: adminAccess.access.userId,
      entityId: normalizedRequestId,
      entityType: "service_request",
      metadata: {
        providerId: normalizedProviderId,
        status: SERVICE_REQUEST_STATUSES.ustayaYonlendirildi,
        urgencyType: "emergency",
      },
      supabase,
    });

    return createServiceRequestActionResult("service-request-updated", true);
  }

  try {
    await assignProviderToRequest(normalizedRequestId, normalizedProviderId, supabase);
  } catch (error) {
    warnAdminWriteError("service request provider assignment", error);
    return createServiceRequestActionResult("service-request-action-failed", false);
  }

  await insertAuditLog({
    action: "service_request.assigned",
    actorUserId: adminAccess.access.userId,
    entityId: normalizedRequestId,
    entityType: "service_request",
    metadata: {
      providerId: normalizedProviderId,
      status: SERVICE_REQUEST_STATUSES.ustayaYonlendirildi,
    },
    supabase,
  });

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
      ? { is_active: true, last_active_at: new Date().toISOString() }
      : normalizedAction === "deactivate"
        ? { is_active: false }
        : normalizedAction === "approve"
          ? { is_active: true, is_approved: true }
          : normalizedAction === "verify"
            ? { is_verified: true }
            : normalizedAction === "unverify"
              ? { is_verified: false }
              : { is_approved: false };

  const { data, error } = await supabase
    .from("providers")
    .update(updatePayload)
    .eq("id", normalizedProviderId)
    .select("id, user_id")
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
    unverify: "provider-unverified",
    verify: "provider-verified",
  };

  const result = createProviderStatusActionResult(
    successCodeByAction[normalizedAction],
    true,
  );

  if (normalizedAction === "approve" && data.user_id) {
    await grantProviderRoleToApplicant(supabase, data.user_id);
  }

  await insertAuditLog({
    action:
      normalizedAction === "approve"
        ? "provider.approved"
        : `provider.${normalizedAction}`,
    actorUserId: adminAccess.access.userId,
    entityId: normalizedProviderId,
    entityType: "provider",
    metadata: {
      action: normalizedAction,
      updatePayload,
    },
    supabase,
  });

  return result;
}

function parseAdminResponseTime(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isInteger(parsedValue) && parsedValue > 0 && parsedValue <= 1440
    ? parsedValue
    : undefined;
}

export async function updateAdminProviderTrust(
  providerId: string,
  input: {
    availability: string;
    responseTimeMinutes: string;
    workingHours: string;
  },
): Promise<AdminProviderStatusActionResult> {
  const normalizedProviderId = sanitizeText(providerId, 80);
  const availability = sanitizeText(input.availability, 40);
  const workingHours = sanitizeText(input.workingHours, 40);
  const responseTimeMinutes = parseAdminResponseTime(input.responseTimeMinutes);

  if (!normalizedProviderId) {
    return createProviderStatusActionResult("provider-missing-id", false);
  }

  if (!isProviderAvailabilityStatus(availability)) {
    return createProviderStatusActionResult("provider-invalid-availability", false);
  }

  if (!providerWorkingHourOptions.includes(workingHours as (typeof providerWorkingHourOptions)[number])) {
    return createProviderStatusActionResult("provider-invalid-action", false);
  }

  if (responseTimeMinutes === undefined) {
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

  const updatePayload: AdminProviderTrustUpdate = {
    availability,
    response_time_minutes: responseTimeMinutes,
    working_hours: workingHours,
  };

  const { data, error } = await supabase
    .from("providers")
    .update(updatePayload)
    .eq("id", normalizedProviderId)
    .select("id")
    .maybeSingle();

  if (error) {
    warnAdminWriteError("provider trust update", error);
    return createProviderStatusActionResult("provider-action-failed", false);
  }

  if (!data) {
    return createProviderStatusActionResult("provider-not-found", false);
  }

  await insertAuditLog({
    action: "provider.trust_updated",
    actorUserId: adminAccess.access.userId,
    entityId: normalizedProviderId,
    entityType: "provider",
    metadata: updatePayload,
    supabase,
  });

  return createProviderStatusActionResult("provider-trust-updated", true);
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

  const providerSelectQuery = `
        id,
        name,
        phone,
        whatsapp,
        description,
        average_price_min,
        average_price_max,
        rating,
        availability,
        working_hours,
        is_verified,
        phone_verified,
        identity_verified,
        last_active_at,
        response_time_minutes,
        profile_completion_score,
        profile_image_url,
        is_active,
        is_approved,
        service_categories(name),
        districts(name)
      `;
  const providerSelectQueryWithoutAvailability = `
        id,
        name,
        phone,
        whatsapp,
        description,
        average_price_min,
        average_price_max,
        rating,
        is_active,
        is_approved,
        service_categories(name),
        districts(name)
      `;

  let { data, error } = await supabase
    .from("providers")
    .select(providerSelectQuery)
    .order("created_at", { ascending: false });

  if (error && isMissingOptionalProviderColumn(error)) {
    const fallbackResult = await supabase
      .from("providers")
      .select(providerSelectQueryWithoutAvailability)
      .order("created_at", { ascending: false });

    data = fallbackResult.data as typeof data;
    error = fallbackResult.error;
  }

  if (error) {
    return createEmptyReadResult(getAdminReadError(error));
  }

  return createAdminReadResult(
    ((data ?? []) as unknown as AdminProviderRecord[]).map((provider) => {
      const category = sanitizeText(getRelationName(provider.service_categories), 120);
      const district = sanitizeText(getRelationName(provider.districts), 120);
      const availability = normalizeProviderAvailabilityStatus(provider.availability);
      const workingHours = formatProviderWorkingHours(provider.working_hours);
      const phone = sanitizePhone(provider.phone) || "Belirtilmedi";
      const profileImageUrl = sanitizeText(provider.profile_image_url ?? "", 500) || null;
      const responseTimeMinutes =
        typeof provider.response_time_minutes === "number" &&
        Number.isFinite(provider.response_time_minutes) &&
        provider.response_time_minutes > 0
          ? Math.round(provider.response_time_minutes)
          : null;
      const profileCompletion = calculateProviderProfileCompletion({
        availability,
        category,
        description: provider.description,
        district,
        phone,
        profileImageUrl,
        servicesOffered: category ? [category] : [],
        workingHours,
      });
      const availabilityStatus = getProviderOperationalStatus({
        availability,
        workingHours,
      });

      return {
        averagePriceRange: formatAveragePriceRange(
          provider.average_price_min,
          provider.average_price_max,
        ),
        availability,
        availabilityStatusLabel: availabilityStatus.label,
        availabilityStatusTone: availabilityStatus.tone,
        category,
        district,
        id: provider.id,
        identityVerified: Boolean(provider.identity_verified),
        isActive: provider.is_active,
        isApproved: provider.is_approved,
        isVerified: Boolean(provider.is_verified),
        lastActiveAt: provider.last_active_at ?? null,
        name: sanitizeText(provider.name, 120),
        phone,
        phoneVerified: Boolean(provider.phone_verified),
        profileCompletionMissingFields: profileCompletion.missingFields,
        profileCompletionScore: profileCompletion.score,
        rating: Number(provider.rating ?? 0),
        responseTime: formatProviderResponseTime(responseTimeMinutes),
        responseTimeMinutes,
        whatsapp: sanitizePhone(provider.whatsapp ?? "") || "Belirtilmedi",
        workingHours,
      };
    }),
  );
}

export async function getAdminProviderApplications(
  status?: ProviderApplicationStatus,
): Promise<
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

  let query = supabase
    .from("provider_applications")
    .select(
      `
        id,
        full_name,
        phone,
        experience_years,
        introduction,
        status,
        created_at,
        service_categories(name),
        districts(name)
      `,
    )
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return createEmptyReadResult(getAdminReadError(error));
  }

  return createAdminReadResult(
    ((data ?? []) as unknown as AdminProviderApplicationRecord[]).map(
      (application) => ({
        category: sanitizeText(getRelationName(application.service_categories), 120),
        createdAt: application.created_at,
        description: sanitizeText(application.introduction ?? "", 1200),
        district: sanitizeText(getRelationName(application.districts), 120),
        experience: `${application.experience_years} yıl`,
        fullName: sanitizeText(application.full_name, 120),
        id: application.id,
        phone: sanitizePhone(application.phone) || "Belirtilmedi",
        status: application.status,
      }),
    ),
  );
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
        urgency_type,
        budget_tag,
        offered_price,
        payment_preference,
        confirmation_code,
        estimated_arrival_text,
        approximate_location,
        emergency_status,
        status,
        preferred_date,
        preferred_time,
        description,
        accepted_provider_id,
        accepted_at,
        created_at,
        assigned_provider_id,
        service_categories(name),
        districts(name),
        profiles(full_name, phone),
        assigned_provider:providers!service_requests_assigned_provider_id_fkey(id, name)
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return createEmptyReadResult(getAdminReadError(error));
  }

  return createAdminReadResult(
    ((data ?? []) as unknown as AdminServiceRequestRecord[]).map((request) => ({
      category: sanitizeText(getRelationName(request.service_categories), 120),
      createdAt: request.created_at,
      customerName: sanitizeText(
        getRequestCustomerName(request.profiles, request.user_id, request.description),
        120,
      ),
      district: sanitizeText(getRelationName(request.districts), 120),
      id: request.id,
      phone: sanitizePhone(getRequestPhone(request.profiles, request.description)) || "Belirtilmedi",
      preferredDate: request.preferred_date,
      preferredTime: request.preferred_time,
      status: sanitizeText(request.status, 40),
      urgency: sanitizeText(request.urgency, 40),
      urgencyType: sanitizeText(request.urgency_type ?? "standard", 40),
      budgetTag: request.budget_tag ? sanitizeText(request.budget_tag, 40) : null,
      offeredPrice:
        typeof request.offered_price === "number"
          ? request.offered_price
          : request.offered_price
            ? Number(request.offered_price)
            : null,
      paymentPreference: request.payment_preference
        ? sanitizeText(request.payment_preference, 40)
        : null,
      confirmationCode: request.confirmation_code
        ? sanitizeText(request.confirmation_code, 40)
        : null,
      estimatedArrivalText: request.estimated_arrival_text
        ? sanitizeText(request.estimated_arrival_text, 120)
        : null,
      approximateLocation: request.approximate_location
        ? sanitizeText(request.approximate_location, 220)
        : null,
      emergencyStatus: request.emergency_status
        ? sanitizeText(request.emergency_status, 40)
        : null,
      acceptedProviderId: request.accepted_provider_id ?? null,
      acceptedAt: request.accepted_at ?? null,
      assignedProviderId: request.assigned_provider_id ?? null,
      assignedProviderName: Array.isArray(request.assigned_provider)
        ? request.assigned_provider[0]?.name
        : request.assigned_provider?.name ?? null,
    })),
  );
}
