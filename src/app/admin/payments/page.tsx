import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { EmptyAdminState } from "@/components/admin/EmptyAdminState";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { MetricCard } from "@/components/admin/MetricCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getAdminAccess } from "@/services/admin";
import { getAdminPayments, paymentMethodLabel } from "@/services/admin/sections";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ödemeler | Admin",
  description: "Fuwu ödeme ve finans görünümü.",
};

const currency = new Intl.NumberFormat("tr-TR", {
  currency: "TRY",
  style: "currency",
});

export default async function AdminPaymentsPage() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.ok && adminAccess.reason === "missing-session") {
    redirect(buildLoginRedirectUrl("/admin/payments"));
  }
  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const { rows, totals, error } = await getAdminPayments();

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
        active="payments"
        breadcrumbLabel="Ödemeler"
        description="Platform ödemelerini, onaylı ciroyu ve bekleyen tahsilatları izle."
        error={error}
        title="Ödemeler & Finans"
      >
        <section className="mb-6 flex flex-wrap gap-4">
          <MetricCard label="Onaylı Ciro" value={currency.format(totals.confirmedAmount)} />
          <MetricCard label="Onaylı Ödeme" value={totals.confirmedCount} />
          <MetricCard label="Bekleyen Ödeme" value={totals.pendingCount} />
          <MetricCard label="Toplam Kayıt" value={totals.totalCount} />
        </section>

        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--muted)]">
            {rows.length} kayıt
          </span>
          <ExportCsvButton
            columns={[
              { header: "Tutar", key: "amount" },
              { header: "Yöntem", key: "method" },
              { header: "Durum", key: "status" },
              { header: "Kategori", key: "category" },
              { header: "İlçe", key: "district" },
              { header: "Tarih", key: "createdAt" },
            ]}
            filename="odemeler.csv"
            rows={rows.map((payment) => ({
              amount: payment.amount ?? "",
              category: payment.category,
              createdAt: new Date(payment.createdAt).toLocaleDateString("tr-TR"),
              district: payment.district,
              method: paymentMethodLabel(payment.method),
              status: payment.status === "confirmed" ? "Onaylandı" : "Bekliyor",
            }))}
          />
        </div>

        {rows.length === 0 ? (
          <EmptyAdminState message="Henüz ödeme kaydı bulunmuyor." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-[var(--border)]">
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">Tutar</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">Yöntem</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">Durum</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">Kategori / İlçe</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((payment) => (
                  <tr
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)]"
                    key={payment.id}
                  >
                    <td className="px-4 py-3 text-sm font-bold text-[var(--brand-navy)]">
                      {payment.amount === null ? "—" : currency.format(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--brand-navy)]">
                      {paymentMethodLabel(payment.method)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={payment.status === "confirmed" ? "Onaylandı" : "Bekliyor"}
                        tone={payment.status === "confirmed" ? "success" : "info"}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--brand-navy)]">
                      {payment.category}
                      <br />
                      <span className="text-xs text-[var(--muted)]">{payment.district}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted)]">
                      {new Date(payment.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPageShell>
    </AdminAccessGate>
  );
}
