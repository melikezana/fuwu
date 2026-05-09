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
  getAdminServiceRequests,
  type AdminServiceRequest,
} from "@/services/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Talepler | Fuwu Admin",
  description: "Fuwu hizmet talepleri için admin görünümü.",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getUrgencyView(urgency: string) {
  const urgencies: Record<
    string,
    { label: string; tone: "green" | "neutral" | "orange" | "red" }
  > = {
    high: { label: "Bu hafta", tone: "orange" },
    low: { label: "Esnek", tone: "neutral" },
    normal: { label: "Normal", tone: "green" },
    urgent: { label: "Acil", tone: "red" },
  };

  return urgencies[urgency] ?? { label: urgency, tone: "neutral" };
}

function getRequestStatusView(status: string) {
  const statuses: Record<
    string,
    { label: string; tone: "green" | "neutral" | "orange" | "red" }
  > = {
    cancelled: { label: "İptal", tone: "red" },
    completed: { label: "Tamamlandı", tone: "green" },
    in_progress: { label: "İşlemde", tone: "orange" },
    matched: { label: "Eşleşti", tone: "neutral" },
    open: { label: "Açık", tone: "orange" },
  };

  return statuses[status] ?? { label: status, tone: "neutral" };
}

function RequestStatusBadge({ status }: { status: string }) {
  const statusView = getRequestStatusView(status);

  return (
    <AdminStatusBadge tone={statusView.tone}>{statusView.label}</AdminStatusBadge>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const urgencyView = getUrgencyView(urgency);

  return (
    <AdminStatusBadge tone={urgencyView.tone}>{urgencyView.label}</AdminStatusBadge>
  );
}

function RequestActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <AdminActionButton icon={adminActionIcons.status}>
        Durumu Güncelle
      </AdminActionButton>
      <AdminActionButton icon={adminActionIcons.detail}>Detay Gör</AdminActionButton>
    </div>
  );
}

function RequestMobileCard({ request }: { request: AdminServiceRequest }) {
  return (
    <AdminMobileCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-[var(--brand-navy)]">
            {request.customerName}
          </h2>
          <p className="mt-1 text-sm font-bold text-[var(--muted)]">
            {request.category} · {request.district}
          </p>
        </div>
        <RequestStatusBadge status={request.status} />
      </div>

      <div className="mt-4 grid gap-3 text-sm font-semibold text-[var(--muted)]">
        <div className="flex flex-wrap gap-2">
          <UrgencyBadge urgency={request.urgency} />
        </div>
        <p>
          <span className="font-black text-[var(--brand-navy)]">Tarih: </span>
          {formatDate(request.createdAt)}
        </p>
      </div>

      <div className="mt-4">
        <RequestActions />
      </div>
    </AdminMobileCard>
  );
}

export default async function AdminServiceRequestsPage() {
  const result = await getAdminServiceRequests();

  return (
    <AdminPageShell
      active="requests"
      description="Müşteri hizmet taleplerini, aciliyetlerini ve operasyon durumlarını takip et."
      error={result.error}
      isConfigured={result.isConfigured}
      title="Hizmet Talepleri"
    >
      {result.rows.length === 0 ? (
        <AdminEmptyState title="Hizmet talebi bulunamadı">
          Supabase bağlantısı, admin okuma yetkisi veya yeni talepler hazır
          olduğunda hizmet talebi listesi burada görünecek.
        </AdminEmptyState>
      ) : (
        <>
          <AdminCardGrid>
            {result.rows.map((request) => (
              <RequestMobileCard key={request.id} request={request} />
            ))}
          </AdminCardGrid>

          <AdminTableWrap>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs font-black uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Müşteri</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">İlçe</th>
                  <th className="px-4 py-3">Aciliyet</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {result.rows.map((request) => (
                  <tr key={request.id} className="bg-white">
                    <td className="px-4 py-4 font-black text-[var(--brand-navy)]">
                      {request.customerName}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {request.category}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {request.district}
                    </td>
                    <td className="px-4 py-4">
                      <UrgencyBadge urgency={request.urgency} />
                    </td>
                    <td className="px-4 py-4">
                      <RequestStatusBadge status={request.status} />
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {formatDate(request.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <RequestActions />
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
