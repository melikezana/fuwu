import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SERVICE_REQUEST_STATUSES } from "@/lib/constants/statuses";
import { EMERGENCY_RESPONSE_SLA_MINUTES } from "@/lib/constants/sla";
import { logWarn } from "@/lib/logger";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import type { Database, Json } from "@/lib/supabase/types";
import {
  notifyEmergencyRequestDispatched,
  notifyEmergencyRequestReassignedAway,
  notifyEmergencySlaBreachDetected,
} from "@/services/notifications";
import {
  assignProviderToEmergencyRequest,
  getMatchedProviders,
} from "@/services/requests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_REQUESTS_PER_SWEEP = 50;
const MAX_REASSIGNMENTS_PER_REQUEST = 3;

type ServiceRequestRow = Database["public"]["Tables"]["service_requests"]["Row"];
type ProviderRow = Database["public"]["Tables"]["providers"]["Row"];
type EmergencySlaRequest = Pick<
  ServiceRequestRow,
  | "accepted_at"
  | "accepted_provider_id"
  | "assigned_at"
  | "assigned_provider_id"
  | "id"
  | "status"
>;
type ProviderNotificationRecipient = Pick<ProviderRow, "id" | "user_id">;
type RequestNotificationRecipient = Pick<ServiceRequestRow, "id" | "user_id">;
type RequestReassignmentLogInsert =
  Database["public"]["Tables"]["request_reassignment_log"]["Insert"];
type RequestReassignmentLogRead = Pick<
  Database["public"]["Tables"]["request_reassignment_log"]["Row"],
  "is_dry_run" | "new_provider_id" | "previous_provider_id" | "reason"
>;
type RequestReassignmentReason = RequestReassignmentLogInsert["reason"];
type CronSupabaseClient = SupabaseClient<Database>;

type ReassignmentContext = {
  liveReassignmentCount: number;
  logs: RequestReassignmentLogRead[];
  triedProviderIds: Set<string>;
};

function getRequestCode(requestId: string) {
  return `FW-${requestId.slice(0, 8).toLocaleUpperCase("tr")}`;
}

function getEmergencySlaCutoffIso() {
  return new Date(
    Date.now() - EMERGENCY_RESPONSE_SLA_MINUTES * 60 * 1000,
  ).toISOString();
}

function getCronAuthorizationError(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return {
      message: "CRON_SECRET is not configured.",
      status: 500,
    };
  }

  const authorization = request.headers.get("authorization")?.trim();

  if (authorization !== `Bearer ${cronSecret}`) {
    return {
      message: "Unauthorized.",
      status: 401,
    };
  }

  return null;
}

function collectTriedProviderIds(
  logs: RequestReassignmentLogRead[],
  currentProviderId: string | null,
) {
  const providerIds = new Set<string>();

  if (currentProviderId) {
    providerIds.add(currentProviderId);
  }

  logs.forEach((log) => {
    if (log.previous_provider_id) {
      providerIds.add(log.previous_provider_id);
    }

    if (log.new_provider_id) {
      providerIds.add(log.new_provider_id);
    }
  });

  return providerIds;
}

function hasLoggedRealDecision(
  logs: RequestReassignmentLogRead[],
  reason: RequestReassignmentReason,
  previousProviderId: string | null,
) {
  return logs.some(
    (log) =>
      !log.is_dry_run &&
      log.reason === reason &&
      log.previous_provider_id === previousProviderId,
  );
}

async function getReassignmentContext(
  supabase: CronSupabaseClient,
  request: EmergencySlaRequest,
): Promise<ReassignmentContext> {
  const { data, error } = await supabase
    .from("request_reassignment_log")
    .select("previous_provider_id, new_provider_id, reason, is_dry_run")
    .eq("request_id", request.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const logs = (data ?? []) as RequestReassignmentLogRead[];
  const liveReassignmentLogs = logs.filter(
    (log) => !log.is_dry_run && log.reason === "sla_breach_reassigned",
  );

  return {
    liveReassignmentCount: liveReassignmentLogs.length,
    logs,
    triedProviderIds: collectTriedProviderIds(
      liveReassignmentLogs,
      request.assigned_provider_id,
    ),
  };
}

async function getNotificationRecipients({
  candidateProviderId,
  previousProviderId,
  requestId,
  supabase,
}: {
  candidateProviderId: string;
  previousProviderId: string | null;
  requestId: string;
  supabase: CronSupabaseClient;
}) {
  const [previousProviderResult, candidateProviderResult, requestResult] =
    await Promise.all([
      previousProviderId
        ? supabase
            .from("providers")
            .select("id, user_id")
            .eq("id", previousProviderId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("providers")
        .select("id, user_id")
        .eq("id", candidateProviderId)
        .maybeSingle(),
      supabase
        .from("service_requests")
        .select("id, user_id")
        .eq("id", requestId)
        .maybeSingle(),
    ]);

  if (previousProviderResult.error) {
    throw previousProviderResult.error;
  }

  if (candidateProviderResult.error) {
    throw candidateProviderResult.error;
  }

  if (requestResult.error) {
    throw requestResult.error;
  }

  return {
    candidateProvider:
      (candidateProviderResult.data as ProviderNotificationRecipient | null) ?? null,
    previousProvider:
      (previousProviderResult.data as ProviderNotificationRecipient | null) ?? null,
    request: (requestResult.data as RequestNotificationRecipient | null) ?? null,
  };
}

async function getCurrentEmergencyAssignment(
  supabase: CronSupabaseClient,
  requestId: string,
) {
  const { data, error } = await supabase
    .from("service_requests")
    .select("id, accepted_at, accepted_provider_id, assigned_at, assigned_provider_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as EmergencySlaRequest | null;
}

async function isRequestStillSafeToReassign({
  request,
  supabase,
}: {
  request: EmergencySlaRequest;
  supabase: CronSupabaseClient;
}) {
  const currentRequest = await getCurrentEmergencyAssignment(supabase, request.id);

  if (!currentRequest) {
    return {
      currentProviderId: null,
      currentStatus: null,
      ok: false,
      reason: "request_not_found",
    };
  }

  const wasAccepted =
    currentRequest.status === SERVICE_REQUEST_STATUSES.accepted ||
    Boolean(currentRequest.accepted_at || currentRequest.accepted_provider_id);
  const ok =
    currentRequest.status === SERVICE_REQUEST_STATUSES.assigned &&
    currentRequest.accepted_at === null &&
    currentRequest.accepted_provider_id === null &&
    currentRequest.assigned_provider_id === request.assigned_provider_id &&
    currentRequest.assigned_at === request.assigned_at;

  return {
    currentProviderId: currentRequest.assigned_provider_id,
    currentStatus: currentRequest.status,
    ok,
    reason: ok
      ? "request_still_assigned"
      : wasAccepted
        ? "request_accepted_before_reassignment"
        : "request_changed_before_reassignment",
  };
}

async function logReassignmentDecision({
  candidateProviderId,
  matchedProviderCount,
  reassignmentCountBefore,
  reason,
  request,
  skippedProviderCount,
  supabase,
}: {
  candidateProviderId: string | null;
  matchedProviderCount: number;
  reassignmentCountBefore: number;
  reason: RequestReassignmentReason;
  request: EmergencySlaRequest;
  skippedProviderCount: number;
  supabase: CronSupabaseClient;
}) {
  const detectedAt = new Date().toISOString();
  const payload: RequestReassignmentLogInsert = {
    is_dry_run: false,
    metadata: {
      assignedAt: request.assigned_at,
      detectedAt,
      matchedProviderCount,
      reassignmentCountBefore,
      skippedProviderCount,
      slaMinutes: EMERGENCY_RESPONSE_SLA_MINUTES,
    } satisfies Json,
    new_provider_id: candidateProviderId,
    previous_provider_id: request.assigned_provider_id,
    reason,
    request_id: request.id,
  };
  const { error } = await supabase.from("request_reassignment_log").insert(payload);

  if (error) {
    throw error;
  }
}

async function notifyAdminsForManualIntervention({
  candidateProviderId = null,
  previousProviderId,
  reason,
  request,
  supabase,
}: {
  candidateProviderId?: string | null;
  previousProviderId: string | null;
  reason: RequestReassignmentReason;
  request: EmergencySlaRequest;
  supabase: CronSupabaseClient;
}) {
  return notifyEmergencySlaBreachDetected({
    candidateProviderId,
    previousProviderId,
    reason,
    requestCode: getRequestCode(request.id),
    requestId: request.id,
    supabaseClient: supabase,
  });
}

async function notifyProvidersForReassignment({
  candidateProvider,
  previousProvider,
  request,
  supabase,
}: {
  candidateProvider: ProviderNotificationRecipient | null;
  previousProvider: ProviderNotificationRecipient | null;
  request: EmergencySlaRequest & { user_id?: string | null };
  supabase: CronSupabaseClient;
}) {
  const requestCode = getRequestCode(request.id);

  await Promise.all([
    notifyEmergencyRequestReassignedAway({
      actorUserId: null,
      customerUserId: request.user_id ?? null,
      providerId: previousProvider?.id ?? null,
      providerUserId: previousProvider?.user_id ?? null,
      requestCode,
      requestId: request.id,
      supabaseClient: supabase,
    }),
    notifyEmergencyRequestDispatched({
      actorUserId: null,
      customerUserId: request.user_id ?? null,
      providerId: candidateProvider?.id ?? null,
      providerUserId: candidateProvider?.user_id ?? null,
      requestCode,
      requestId: request.id,
      supabaseClient: supabase,
    }),
  ]);
}

async function escalateWithoutAssignment({
  candidateProviderId = null,
  context,
  matchedProviderCount,
  reason,
  request,
  supabase,
}: {
  candidateProviderId?: string | null;
  context: ReassignmentContext;
  matchedProviderCount: number;
  reason: RequestReassignmentReason;
  request: EmergencySlaRequest;
  supabase: CronSupabaseClient;
}) {
  if (!hasLoggedRealDecision(context.logs, reason, request.assigned_provider_id)) {
    await logReassignmentDecision({
      candidateProviderId,
      matchedProviderCount,
      reassignmentCountBefore: context.liveReassignmentCount,
      reason,
      request,
      skippedProviderCount: context.triedProviderIds.size,
      supabase,
    });
  }

  const notifiedAdminCount = await notifyAdminsForManualIntervention({
    candidateProviderId,
    previousProviderId: request.assigned_provider_id,
    reason,
    request,
    supabase,
  });

  return {
    action: "escalated",
    candidateProviderId,
    notifiedAdminCount,
    previousProviderId: request.assigned_provider_id,
    reason,
    reassignmentCountBefore: context.liveReassignmentCount,
    requestId: request.id,
  };
}

async function processEmergencySlaRequest(
  supabase: CronSupabaseClient,
  request: EmergencySlaRequest,
) {
  const context = await getReassignmentContext(supabase, request);

  if (context.liveReassignmentCount >= MAX_REASSIGNMENTS_PER_REQUEST) {
    return escalateWithoutAssignment({
      context,
      matchedProviderCount: 0,
      reason: "max_reassignment_limit_reached",
      request,
      supabase,
    });
  }

  const matchedProviders = await getMatchedProviders(request.id, supabase);
  const candidateProvider = matchedProviders.find(
    (provider) => !context.triedProviderIds.has(provider.id),
  );
  const candidateProviderId = candidateProvider?.id ?? null;

  if (!candidateProviderId) {
    return escalateWithoutAssignment({
      context,
      matchedProviderCount: matchedProviders.length,
      reason: "no_eligible_provider",
      request,
      supabase,
    });
  }

  const recipients = await getNotificationRecipients({
    candidateProviderId,
    previousProviderId: request.assigned_provider_id,
    requestId: request.id,
    supabase,
  });

  const raceCheck = await isRequestStillSafeToReassign({ request, supabase });

  if (!raceCheck.ok) {
    return {
      action: "skipped",
      candidateProviderId,
      currentProviderId: raceCheck.currentProviderId,
      currentStatus: raceCheck.currentStatus,
      previousProviderId: request.assigned_provider_id,
      reason: raceCheck.reason,
      requestId: request.id,
    };
  }

  await assignProviderToEmergencyRequest(
    request.id,
    candidateProviderId,
    supabase,
    {
      expectedAssignedProviderId: request.assigned_provider_id,
    },
  );

  await logReassignmentDecision({
    candidateProviderId,
    matchedProviderCount: matchedProviders.length,
    reassignmentCountBefore: context.liveReassignmentCount,
    reason: "sla_breach_reassigned",
    request,
    skippedProviderCount: context.triedProviderIds.size,
    supabase,
  });

  await notifyProvidersForReassignment({
    candidateProvider: recipients.candidateProvider,
    previousProvider: recipients.previousProvider,
    request: {
      ...request,
      user_id: recipients.request?.user_id ?? null,
    },
    supabase,
  });

  return {
    action: "reassigned",
    candidateProviderId,
    notifiedAdminCount: 0,
    previousProviderId: request.assigned_provider_id,
    reason: "sla_breach_reassigned",
    reassignmentCountBefore: context.liveReassignmentCount,
    requestId: request.id,
  };
}

export async function GET(request: Request) {
  const authorizationError = getCronAuthorizationError(request);

  if (authorizationError) {
    return NextResponse.json(
      { error: authorizationError.message, ok: false },
      { status: authorizationError.status },
    );
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service role is not configured.", ok: false },
      { status: 500 },
    );
  }

  const slaCutoffIso = getEmergencySlaCutoffIso();
  const { data, error } = await supabase
    .from("service_requests")
    .select("id, accepted_at, accepted_provider_id, assigned_at, assigned_provider_id, status")
    .eq("urgency_type", "emergency")
    .eq("status", SERVICE_REQUEST_STATUSES.assigned)
    .not("assigned_at", "is", null)
    .not("assigned_provider_id", "is", null)
    .lt("assigned_at", slaCutoffIso)
    .order("assigned_at", { ascending: true })
    .limit(MAX_REQUESTS_PER_SWEEP);

  if (error) {
    logWarn("Emergency SLA sweep request lookup failed.", {
      slaCutoffIso,
      supabaseError: error,
    });

    return NextResponse.json(
      { error: "Emergency SLA sweep lookup failed.", ok: false },
      { status: 500 },
    );
  }

  const requests = (data ?? []) as EmergencySlaRequest[];
  const processed = [];
  const failures = [];

  for (const emergencyRequest of requests) {
    try {
      processed.push(await processEmergencySlaRequest(supabase, emergencyRequest));
    } catch (requestError) {
      logWarn("Emergency SLA sweep processing failed.", {
        error: requestError,
        requestId: emergencyRequest.id,
      });
      failures.push({
        requestId: emergencyRequest.id,
      });
    }
  }

  return NextResponse.json({
    failedCount: failures.length,
    failures,
    ok: failures.length === 0,
    processed,
    processedCount: processed.length,
    scannedCount: requests.length,
    slaCutoffIso,
  });
}
