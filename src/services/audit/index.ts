import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { logBackendError } from "@/lib/errors/backend";
import type { Database, Json } from "@/lib/supabase/types";

type AuditLogInsert = Database["public"]["Tables"]["audit_logs"]["Insert"];
type AuditSupabaseClient = SupabaseClient<Database>;

export type AuditAction =
  | "admin.action_failed"
  | "payment.confirmed"
  | "payment.confirmed_by_customer"
  | "provider.created"
  | "provider.price_updated"
  | "provider.status_updated"
  | "provider_application.approved"
  | "provider_application.rejected"
  | "provider_application.submitted"
  | "security.invalid_id"
  | "security.unauthorized_action"
  | "service_request.accepted"
  | "service_request.assigned"
  | "service_request.cancelled"
  | "service_request.completed"
  | "service_request.created"
  | "service_request.in_progress"
  | "service_request.rejected";

export type AuditLogEvent = {
  action: AuditAction;
  actorUserId: string | null;
  entityId: string | null;
  entityType:
    | "admin_action"
    | "payment"
    | "provider"
    | "provider_application"
    | "security_event"
    | "service_request";
  metadata?: Json;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createAuditServiceRoleClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getAuditClient(fallbackClient?: AuditSupabaseClient | null) {
  return createAuditServiceRoleClient() ?? fallbackClient ?? null;
}

export async function writeAuditLog(
  event: AuditLogEvent,
  fallbackClient?: AuditSupabaseClient | null,
) {
  const auditClient = getAuditClient(fallbackClient);

  if (!auditClient) {
    logBackendError({
      action: event.action,
      actorUserId: event.actorUserId,
      context: "Audit log skipped because Supabase is not configured.",
      error: new Error("Missing Supabase audit client."),
      payloadKeys: ["action", "actor_user_id", "entity_type", "entity_id", "metadata"],
      table: "audit_logs",
    });
    return false;
  }

  const insertPayload: AuditLogInsert = {
    action: event.action,
    actor_user_id: event.actorUserId,
    entity_id: event.entityId,
    entity_type: event.entityType,
    metadata: event.metadata ?? {},
  };
  const { error } = await auditClient.from("audit_logs").insert(insertPayload);

  if (error) {
    logBackendError({
      action: event.action,
      actorUserId: event.actorUserId,
      context: "Audit log insert failed.",
      error,
      payload: insertPayload,
      table: "audit_logs",
    });
    return false;
  }

  return true;
}
