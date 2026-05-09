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
import {
  getAdminProviderApplications,
  type AdminProviderApplication,
} from "@/services/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Başvurular | Fuwu Admin",
  description: "Fuwu usta başvuruları için admin görünümü.",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getApplicationStatus(status: string) {
  const statuses: Record<
    string,
    { label: string; tone: "green" | "neutral" | "orange" | "red" }
  > = {
    approved: { label: "Onaylandı", tone: "green" },
    pending: { label: "Beklemede", tone: "orange" },
    rejected: { label: "Reddedildi", tone: "red" },
    reviewing: { label: "İncelemede", tone: "neutral" },
  };

  return statuses[status] ?? { label: status, tone: "neutral" };
}

function ApplicationStatusBadge({ status }: { status: string }) {
  const statusView = getApplicationStatus(status);

  return (
    <AdminStatusBadge tone={statusView.tone}>{statusView.label}</AdminStatusBadge>
  );
}

function ApplicationActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <AdminActionButton icon={adminActionIcons.approve}>Onayla</AdminActionButton>
      <AdminActionButton icon={adminActionIcons.reject}>Reddet</AdminActionButton>
      <AdminActionButton icon={adminActionIcons.detail}>Detay Gör</AdminActionButton>
    </div>
  );
}

function ApplicationMobileCard({
  application,
}: {
  application: AdminProviderApplication;
}) {
  return (
    <AdminMobileCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-[var(--brand-navy)]">
            {application.fullName}
          </h2>
          <p className="mt-1 text-sm font-bold text-[var(--muted)]">
            {application.category} · {application.district}
          </p>
        </div>
        <ApplicationStatusBadge status={application.status} />
      </div>

      <div className="mt-4 grid gap-2 text-sm font-semibold text-[var(--muted)]">
        <p>
          <span className="font-black text-[var(--brand-navy)]">Deneyim: </span>
          {application.experience}
        </p>
        <p>
          <span className="font-black text-[var(--brand-navy)]">Telefon: </span>
          {application.phone}
        </p>
        <p>
          <span className="font-black text-[var(--brand-navy)]">Tarih: </span>
          {formatDate(application.createdAt)}
        </p>
      </div>

      <div className="mt-4">
        <ApplicationActions />
      </div>
    </AdminMobileCard>
  );
}

export default async function AdminProviderApplicationsPage() {
  const result = await getAdminProviderApplications();

  return (
    <AdminPageShell
      active="applications"
      description="Usta adaylarının başvuru bilgilerini ve değerlendirme durumlarını takip et."
      error={result.error}
      isConfigured={result.isConfigured}
      title="Başvurular"
    >
      {result.rows.length === 0 ? (
        <AdminEmptyState title="Başvuru bulunamadı">
          Supabase bağlantısı, admin okuma yetkisi veya yeni başvurular hazır
          olduğunda başvuru listesi burada görünecek.
        </AdminEmptyState>
      ) : (
        <>
          <AdminCardGrid>
            {result.rows.map((application) => (
              <ApplicationMobileCard
                application={application}
                key={application.id}
              />
            ))}
          </AdminCardGrid>

          <AdminTableWrap>
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs font-black uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Ad Soyad</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">İlçe</th>
                  <th className="px-4 py-3">Deneyim</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {result.rows.map((application) => (
                  <tr key={application.id} className="bg-white">
                    <td className="px-4 py-4 font-black text-[var(--brand-navy)]">
                      {application.fullName}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {application.category}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {application.district}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {application.experience}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {application.phone}
                    </td>
                    <td className="px-4 py-4">
                      <ApplicationStatusBadge status={application.status} />
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {formatDate(application.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <ApplicationActions />
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
