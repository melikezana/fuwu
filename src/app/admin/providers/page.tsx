import type { Metadata } from "next";
import {
  AdminActionButton,
  AdminCardGrid,
  AdminEmptyState,
  AdminMobileCard,
  AdminPageShell,
  AdminStatusBadge,
  AdminTableWrap,
  adminActionIcons,
} from "@/app/admin/_components/AdminUI";
import { getAdminProviders, type AdminProvider } from "@/services/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ustalar | Fuwu Admin",
  description: "Fuwu usta kayıtları için admin görünümü.",
};

function formatRating(rating: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(rating);
}

function BooleanStatus({
  falseLabel,
  trueLabel,
  value,
}: {
  falseLabel: string;
  trueLabel: string;
  value: boolean;
}) {
  return (
    <AdminStatusBadge tone={value ? "green" : "neutral"}>
      {value ? trueLabel : falseLabel}
    </AdminStatusBadge>
  );
}

function ProviderActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <AdminActionButton icon={adminActionIcons.activate}>
        Aktifleştir
      </AdminActionButton>
      <AdminActionButton icon={adminActionIcons.passive}>
        Pasifleştir
      </AdminActionButton>
      <AdminActionButton icon={adminActionIcons.detail}>Detay Gör</AdminActionButton>
    </div>
  );
}

function ProviderMobileCard({ provider }: { provider: AdminProvider }) {
  return (
    <AdminMobileCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-[var(--brand-navy)]">
            {provider.name}
          </h2>
          <p className="mt-1 text-sm font-bold text-[var(--muted)]">
            {provider.category} · {provider.district}
          </p>
        </div>
        <AdminStatusBadge tone="orange">{formatRating(provider.rating)}</AdminStatusBadge>
      </div>

      <div className="mt-4 grid gap-3 text-sm font-semibold text-[var(--muted)]">
        <p>
          <span className="font-black text-[var(--brand-navy)]">Telefon: </span>
          {provider.phone}
        </p>
        <div className="flex flex-wrap gap-2">
          <BooleanStatus
            falseLabel="Pasif"
            trueLabel="Aktif"
            value={provider.isActive}
          />
          <BooleanStatus
            falseLabel="Onay Bekliyor"
            trueLabel="Onaylı"
            value={provider.isApproved}
          />
        </div>
      </div>

      <div className="mt-4">
        <ProviderActions />
      </div>
    </AdminMobileCard>
  );
}

export default async function AdminProvidersPage() {
  const result = await getAdminProviders();

  return (
    <AdminPageShell
      active="providers"
      description="Supabase üzerindeki usta kayıtlarını ve yayın durumlarını takip et."
      error={result.error}
      isConfigured={result.isConfigured}
      title="Ustalar"
    >
      {result.rows.length === 0 ? (
        <AdminEmptyState title="Usta kaydı bulunamadı">
          Supabase bağlantısı, RLS yetkisi veya canlı kayıtlar hazır olduğunda
          usta listesi burada görünecek.
        </AdminEmptyState>
      ) : (
        <>
          <AdminCardGrid>
            {result.rows.map((provider) => (
              <ProviderMobileCard key={provider.id} provider={provider} />
            ))}
          </AdminCardGrid>

          <AdminTableWrap>
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs font-black uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Usta</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">İlçe</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Puan</th>
                  <th className="px-4 py-3">Aktiflik</th>
                  <th className="px-4 py-3">Onay</th>
                  <th className="px-4 py-3">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {result.rows.map((provider) => (
                  <tr key={provider.id} className="bg-white">
                    <td className="px-4 py-4 font-black text-[var(--brand-navy)]">
                      {provider.name}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {provider.category}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {provider.district}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {provider.phone}
                    </td>
                    <td className="px-4 py-4 font-black text-[var(--brand-navy)]">
                      {formatRating(provider.rating)}
                    </td>
                    <td className="px-4 py-4">
                      <BooleanStatus
                        falseLabel="Pasif"
                        trueLabel="Aktif"
                        value={provider.isActive}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <BooleanStatus
                        falseLabel="Onay Bekliyor"
                        trueLabel="Onaylı"
                        value={provider.isApproved}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <ProviderActions />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableWrap>
        </>
      )}
    </AdminPageShell>
  );
}
