import { getMatchedProviders } from "@/services/requests";
import { AssignProviderForm } from "./AssignProviderForm";
import { SERVICE_REQUEST_STATUSES } from "@/lib/constants/statuses";

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
  if (status !== SERVICE_REQUEST_STATUSES.yeni && status !== SERVICE_REQUEST_STATUSES.inceleniyor) {
    if (assignedProviderId) {
      return (
        <div className="text-sm font-semibold text-[var(--brand-navy)] bg-[var(--surface-soft)] px-3 py-2 rounded-md border inline-block">
          Atanan Usta: {assignedProviderName || "Bilinmiyor"}
        </div>
      );
    }
    return null;
  }

  const providers = await getMatchedProviders(requestId);

  return (
    <div className="mt-2 w-full">
      <AssignProviderForm 
        requestId={requestId} 
        providers={providers} 
        assignedProviderId={assignedProviderId} 
      />
    </div>
  );
}
