import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const read = (path) => readFileSync(join(root, path), "utf8");

const checks = [
  {
    file: "src/lib/constants/statuses.ts",
    name: "central status constants and transition helpers",
    patterns: [
      "PROVIDER_APPLICATION_STATUSES",
      "SERVICE_REQUEST_STATUSES",
      "EMERGENCY_REQUEST_STATUSES",
      "canTransitionServiceRequest",
      "canTransitionProviderApplication",
      "assigned",
      "in_progress",
    ],
  },
  {
    file: "src/services/audit/index.ts",
    name: "audit writer and required audit actions",
    patterns: [
      "writeAuditLog",
      "provider_application.submitted",
      "provider_application.approved",
      "provider_application.rejected",
      "provider.created",
      "service_request.created",
      "service_request.assigned",
      "service_request.accepted",
      "service_request.rejected",
      "service_request.completed",
      "service_request.cancelled",
      "provider.price_updated",
      "provider.status_updated",
      "admin.action_failed",
    ],
  },
  {
    file: "src/lib/errors/backend.ts",
    name: "safe backend error logging",
    patterns: [
      "SAFE_BACKEND_ERROR_MESSAGES",
      "logBackendError",
      "payloadKeys",
      "error.code",
      "error.details",
      "error.hint",
    ],
  },
  {
    file: "src/services/requests/index.ts",
    name: "request duplicate checks, transitions, and audit logs",
    patterns: [
      "canTransitionServiceRequest",
      "duplicate",
      "service_request.created",
      "service_request.accepted",
      "service_request.rejected",
      "service_request.cancelled",
      "cancelAuthenticatedServiceRequest",
    ],
  },
  {
    file: "src/services/admin/index.ts",
    name: "admin transitions, assignment validation, and audit logs",
    patterns: [
      "canTransitionProviderApplication",
      "canTransitionServiceRequest",
      "service_request.assigned",
      "provider_application.approved",
      "provider_application.rejected",
      "provider.created",
      "provider.price_updated",
      "provider.status_updated",
    ],
  },
  {
    file: "supabase/migrations/20260605002200_backend_hardening_status_audit_rls.sql",
    name: "RLS, audit logs, status constraints, and duplicate indexes",
    patterns: [
      "enable row level security",
      "create table if not exists public.audit_logs",
      "audit_logs_select_admin_only",
      "service_requests_status_check",
      "'assigned'",
      "'in_progress'",
      "provider_applications_pending_user_unique_idx",
      "providers_phone_category_district_unique_idx",
      "service_requests_recent_duplicate_lookup_idx",
    ],
  },
];

const failures = [];

for (const check of checks) {
  const contents = read(check.file);
  for (const pattern of check.patterns) {
    if (!contents.includes(pattern)) {
      failures.push(`${check.name}: missing "${pattern}" in ${check.file}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Backend hardening checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Backend hardening checks passed.");
