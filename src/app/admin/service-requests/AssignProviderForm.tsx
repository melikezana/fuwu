"use client";

import { useTransition } from "react";
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
    <form onSubmit={handleSubmit} className="flex gap-2 items-center w-full max-w-md">
      <input type="hidden" name="requestId" value={requestId} />
      <select 
        name="providerId" 
        className="flex-1 text-sm border border-[var(--border)] rounded-md px-3 py-2 text-[var(--brand-navy)] font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)]"
        defaultValue={assignedProviderId || ""}
        required
      >
        <option value="" disabled>Usta Seçin...</option>
        {providers.map(p => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.experienceYears} yıl)
          </option>
        ))}
      </select>
      <AdminActionButton
        icon={adminActionIcons.approve}
        tone="approve"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Atanıyor..." : "Ata"}
      </AdminActionButton>
    </form>
  );
}
