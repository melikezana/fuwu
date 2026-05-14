import type { Metadata } from "next";
import {
  getProviderDashboardProfile,
  ProviderDashboardAccessPlaceholder,
  ProviderDashboardShell,
  ProviderRequestsEmptyState,
} from "@/components/dashboard/ProviderDashboardUI";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Talepler | Fuwu Usta Paneli",
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
  const provider = await getProviderDashboardProfile();

  return (
    <ProviderDashboardShell
      active="requests"
      description="Usta hesabına bağlanacak gelen talepler için hazırlanan sade takip alanı."
      providerName={provider?.name}
      title="Gelen Talepler"
    >
      {provider ? (
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
            <p className="cursor-default select-none text-sm font-bold text-[var(--muted)]">
              {requestPlaceholders.length} talep
            </p>
          </div>

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
        <ProviderDashboardAccessPlaceholder />
      )}
    </ProviderDashboardShell>
  );
}
