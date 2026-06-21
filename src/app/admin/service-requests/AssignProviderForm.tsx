"use client";

import { useState, useTransition } from "react";
import { assignServiceRequestAction } from "./actions";
import { AdminActionButton, adminActionIcons } from "@/components/admin/AdminUI";
import type { AdminAssignableProvider } from "@/services/admin";

export function AssignProviderForm({ 
  requestId, 
  providers,
  assignedProviderId,
}: { 
  requestId: string;
  providers: AdminAssignableProvider[];
  assignedProviderId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedProviderId, setSelectedProviderId] = useState(
    assignedProviderId || "",
  );
  const selectedProvider = providers.find(
    (provider) => provider.id === selectedProviderId,
  );
  const workloadWarningThreshold = 3;

  if (providers.length === 0) {
    return (
      <div className="text-xs text-[var(--muted)] font-semibold p-2 border rounded-md bg-[var(--surface-soft)]">
        Bu kriterlere uygun usta bulunamadı.
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      assignServiceRequestAction(formData);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-wrap items-center gap-2"
    >
      <input type="hidden" name="requestId" value={requestId} />
      <select 
        name="providerId" 
        className="flex-1 text-sm border border-[var(--border)] rounded-md px-3 py-2 text-[var(--brand-navy)] font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)]"
        defaultValue={assignedProviderId || ""}
        onChange={(event) => setSelectedProviderId(event.target.value)}
        required
      >
        <option value="" disabled>Usta seçin...</option>
        {providers.map(p => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.districtName || "Bölge yok"} · {p.experienceYears} yıl ·{" "}
            {p.activeAssignedRequestCount} aktif iş · {p.phone}
          </option>
        ))}
      </select>
      <AdminActionButton
        icon={adminActionIcons.approve}
        tone="approve"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Atanıyor..." : "Ustaya Ata"}
      </AdminActionButton>
      {selectedProvider &&
      selectedProvider.activeAssignedRequestCount >= workloadWarningThreshold ? (
        <p className="basis-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
          Yumuşak uyarı: Bu ustanın şu anda{" "}
          {selectedProvider.activeAssignedRequestCount} aktif atanmış talebi var.
          Atama yine de yapılabilir.
        </p>
      ) : null}
    </form>
  );
}
