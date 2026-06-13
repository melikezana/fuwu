import { getAdminAssignableProvidersForRequest } from "@/services/admin";
import { AssignProviderForm } from "./AssignProviderForm";
import {
  SERVICE_REQUEST_STATUSES,
  canTransitionServiceRequest,
} from "@/lib/constants/statuses";

export async function AssignProviderSection({ 
  requestId, 
  status,
  assignedProviderId,
  assignedProviderName,
}: { 
  requestId: string;
  status: string;
  assignedProviderId: string | null;
  assignedProviderName: string | null;
}) {
  if (!canTransitionServiceRequest(status, SERVICE_REQUEST_STATUSES.assigned)) {
    if (assignedProviderId) {
      return (
        <div className="text-sm font-semibold text-[var(--brand-navy)] bg-[var(--surface-soft)] px-3 py-2 rounded-md border inline-block">
          Atanan Usta: {assignedProviderName || "Bilinmiyor"}
        </div>
      );
    }
    return null;
  }

  const result = await getAdminAssignableProvidersForRequest(requestId);

  return (
    <div className="mt-2 w-full">
      {result.error ? (
        <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-700">
          {result.error}
        </div>
      ) : null}
      <AssignProviderForm 
        requestId={requestId} 
        providers={result.rows} 
        assignedProviderId={assignedProviderId} 
      />
    </div>
  );
}
