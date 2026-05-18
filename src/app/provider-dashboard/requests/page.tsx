import type { Metadata } from "next";
import {
  ProviderDashboardAccessPlaceholder,
  ProviderDashboardShell,
  ProviderStatusBadge,
  ProviderRequestsEmptyState,
} from "@/components/dashboard/ProviderDashboardUI";
import { getProviderAvailabilityLabel } from "@/lib/constants/providers";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Talepler | Usta Paneli",
  description: "Fuwu onaylı ustaları için gelen talep görünümü.",
};

const requestPlaceholders: Array<{
  id: string;
  district: string;
  service: string;
  status: string;
  time: string;
}> = [];

export default async function ProviderDashboardRequestsPage() {
  const providerAccess = await getProviderDashboardAccess();

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
                {requestPlaceholders.length} talep
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
            {requestPlaceholders.map((request) => (
              <article
                className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr] border-t border-[var(--border)] px-4 py-4 text-sm font-bold text-[var(--brand-navy)]"
                key={request.id}
              >
                <span>{request.service}</span>
                <span>{request.district}</span>
                <span>{request.time}</span>
                <span>{request.status}</span>
              </article>
            ))}
          </div>

          <div className="mt-5">
            {requestPlaceholders.length > 0 ? null : <ProviderRequestsEmptyState />}
          </div>
        </section>
      ) : (
        <ProviderDashboardAccessPlaceholder message={providerAccess.message} />
      )}
    </ProviderDashboardShell>
  );
}
