import type { Metadata } from "next";
import {
  ProviderDashboardAccessPlaceholder,
  ProviderDashboardShell,
  ProviderStatusBadge,
  ProviderRequestsEmptyState,
} from "@/components/dashboard/ProviderDashboardUI";
import { getProviderAvailabilityLabel } from "@/lib/constants/providers";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";
import { getProviderAssignedRequests } from "@/services/requests";
import { providerUpdateRequestStatusAction } from "./actions";
import { SERVICE_REQUEST_STATUSES } from "@/lib/constants/statuses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Talepler | Usta Paneli",
  description: "Fuwu onaylı ustaları için gelen talep görünümü.",
};

export default async function ProviderDashboardRequestsPage() {
  const providerAccess = await getProviderDashboardAccess();
  
  const assignedRequests = providerAccess.ok 
    ? await getProviderAssignedRequests(providerAccess.profile.id)
    : [];

  return (
    <ProviderDashboardShell
      active="requests"
      description="Usta hesabına bağlanacak gelen talepler için hazırlanan sade takip alanı."
      providerName={providerAccess.ok ? providerAccess.profile.name : undefined}
      title="Gelen Talepler"
    >
      {providerAccess.ok ? (
        <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[0_14px_40px_rgba(13,20,36,0.05)] sm:p-6">
          <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="cursor-default select-none">
              <p className="text-sm font-black uppercase text-[var(--brand-orange-dark)]">
                Talep listesi
              </p>
              <h2 className="mt-2 text-2xl font-black text-[var(--brand-navy)]">
                Yeni müşteri talepleri
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <ProviderStatusBadge tone={providerAccess.profile.isApproved ? "green" : "orange"}>
                {providerAccess.profile.isApproved ? "Profil onaylı" : "Profil incelemede"}
              </ProviderStatusBadge>
              <ProviderStatusBadge tone={providerAccess.profile.availability === "müsait" ? "green" : "orange"}>
                {getProviderAvailabilityLabel(providerAccess.profile.availability)}
              </ProviderStatusBadge>
              <ProviderStatusBadge tone="orange">
                {assignedRequests.length} talep
              </ProviderStatusBadge>
            </div>
          </div>

          <p className="mt-5 rounded-md border border-[rgba(255,138,0,0.24)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
            Gerçek talep yönlendirme ilişkisi aktif edildiğinde bu ekran yalnızca ilgili ustaya yönlendirilen talepleri gösterecek. Şimdilik güvenli hazırlık görünümü korunuyor.
          </p>

          <div className="mt-5 hidden overflow-hidden rounded-lg border border-[var(--border)] md:block">
            <div className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr] bg-[var(--surface-soft)] px-4 py-3 text-xs font-black uppercase text-[var(--muted)]">
              <span>Hizmet</span>
              <span>İlçe</span>
              <span>Zaman</span>
              <span>Durum</span>
            </div>
            {assignedRequests.map((request) => (
              <article
                className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-4 md:grid md:grid-cols-[1.1fr_1fr_1fr_0.8fr]"
                key={request.id}
              >
                <div className="flex flex-col">
                  <span className="font-black text-[var(--brand-navy)]">{request.category}</span>
                  <span className="mt-1 text-sm text-[var(--muted)]">{request.customerName} - {request.phone}</span>
                </div>
                <div className="flex items-center text-sm font-bold text-[var(--brand-navy)]">
                  <span>{request.district}</span>
                </div>
                <div className="flex flex-col justify-center text-sm">
                  <span className="font-bold text-[var(--brand-navy)]">{request.preferredDate || "Tarih esnek"}</span>
                  <span className="text-[var(--muted)]">{request.preferredTime || "Saat esnek"}</span>
                </div>
                <div className="flex flex-col gap-2 justify-center">
                  <span className="text-sm font-bold text-[var(--brand-navy)]">{request.status}</span>
                  {request.status === SERVICE_REQUEST_STATUSES.ustayaYonlendirildi && (
                    <div className="flex gap-2 mt-2">
                      <form action={providerUpdateRequestStatusAction}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="status" value="tamamlandi" />
                        <button type="submit" className="text-xs font-black px-3 py-1.5 rounded-md border bg-[var(--trust-green-soft)] text-[var(--trust-green)] border-[rgba(23,116,95,0.24)] hover:bg-[rgba(23,116,95,0.15)] transition-colors active:scale-[0.98]">
                          Tamamla
                        </button>
                      </form>
                      <form action={providerUpdateRequestStatusAction}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="status" value="iptal" />
                        <button type="submit" className="text-xs font-black px-3 py-1.5 rounded-md border bg-red-50 text-red-700 border-red-200 hover:bg-red-100 transition-colors active:scale-[0.98]">
                          İptal
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5">
            {assignedRequests.length > 0 ? null : <ProviderRequestsEmptyState />}
          </div>
        </section>
      ) : (
        <ProviderDashboardAccessPlaceholder message={providerAccess.message} />
      )}
    </ProviderDashboardShell>
  );
}
