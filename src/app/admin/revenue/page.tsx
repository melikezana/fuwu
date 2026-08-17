import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Target } from "lucide-react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { AdminSection } from "@/components/admin/AdminSection";
import { EmptyAdminState } from "@/components/admin/EmptyAdminState";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { MetricCard } from "@/components/admin/MetricCard";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { getAdminAccess } from "@/services/admin";
import { getAdminRevenueDashboard } from "@/services/admin/revenue";
import { RevenueCharts } from "./RevenueCharts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gelir ve Büyüme | Admin",
  description: "Fuwu komisyon geliri, GMV ve arz-talep fırsat görünümü.",
};

const currency = new Intl.NumberFormat("tr-TR", {
  currency: "TRY",
  style: "currency",
});

const percent = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 2,
  style: "percent",
});

function formatCurrency(value: number) {
  return currency.format(value);
}

function formatPercent(value: number) {
  return percent.format(value / 100);
}

function RevenueSignalBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "orange";
}) {
  const className =
    tone === "orange"
      ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"
      : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--brand-navy)]";

  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

export default async function AdminRevenuePage() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.ok && adminAccess.reason === "missing-session") {
    redirect(buildLoginRedirectUrl("/admin/revenue"));
  }

  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const revenue = await getAdminRevenueDashboard();
  const totalCommission = revenue.monthlyCommission.reduce(
    (sum, row) => sum + row.commissionRevenue,
    0,
  );
  const totalGmv = revenue.gmvVsCommission.reduce((sum, row) => sum + row.gmv, 0);
  const totalPayments = revenue.monthlyCommission.reduce(
    (sum, row) => sum + row.paymentCount,
    0,
  );
  const averageCommissionRate = totalGmv > 0 ? (totalCommission / totalGmv) * 100 : 0;
  const opportunityDistricts = revenue.supplyDemandGap.filter(
    (row) => row.opportunity,
  );

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
        active="revenue"
        breadcrumbLabel="Gelir ve Büyüme"
        description="Komisyon gelirini, GMV karşılığını ve büyüme açığı olan ilçeleri takip et."
        error={revenue.error}
        isConfigured={revenue.isConfigured}
        title="Gelir ve Büyüme"
      >
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="12 Ay Komisyon"
            subtext={`${totalPayments} escrow çıkışı`}
            value={formatCurrency(totalCommission)}
          />
          <MetricCard label="12 Ay GMV" value={formatCurrency(totalGmv)} />
          <MetricCard
            label="Gerçek Komisyon Oranı"
            subtext="Komisyon / GMV"
            value={formatPercent(averageCommissionRate)}
          />
          <MetricCard
            label="Büyüme Fırsatı"
            subtext="Talep var, aktif usta yok"
            value={opportunityDistricts.length}
          />
        </section>

        {opportunityDistricts.length > 0 ? (
          <section className="mb-6 rounded-lg border border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] p-4 text-[var(--brand-navy)] shadow-[var(--shadow-subtle)]">
            <div className="flex gap-3">
              <Target
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-[var(--brand-orange-dark)]"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  İlk fırsat ilçesi: {opportunityDistricts[0].district}
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--muted)]">
                  {opportunityDistricts[0].openDemandCount} açık talep var, aktif ve
                  onaylı usta bulunmuyor.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <RevenueCharts
          gmvVsCommission={revenue.gmvVsCommission}
          monthlyCommission={revenue.monthlyCommission}
          revenueByCategory={revenue.revenueByCategory}
          revenueByDistrict={revenue.revenueByDistrict}
          supplyDemandGap={revenue.supplyDemandGap}
        />

        <AdminSection
          description="Mali müşavir paylaşımı için escrow serbest bırakılan ödemelerin aylık komisyon toplamı."
          title="Aylık Komisyon Tablosu"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[var(--muted)]">
              {revenue.monthlyCommission.length} ay
            </span>
            <ExportCsvButton
              columns={[
                { header: "Ay", key: "month" },
                { header: "Komisyon (TRY)", key: "commissionRevenue" },
                { header: "Ödeme Sayısı", key: "paymentCount" },
              ]}
              filename="gelir-buyume-aylik-komisyon.csv"
              rows={revenue.monthlyCommission.map((row) => ({
                commissionRevenue: row.commissionRevenue.toFixed(2),
                month: row.month,
                paymentCount: row.paymentCount,
              }))}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-[var(--border)]">
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                    Ay
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                    Komisyon
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                    Ödeme
                  </th>
                </tr>
              </thead>
              <tbody>
                {revenue.monthlyCommission.map((row) => (
                  <tr
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)]"
                    key={row.monthKey}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--brand-navy)]">
                      {row.month}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-[var(--brand-navy)]">
                      {formatCurrency(row.commissionRevenue)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--muted)]">
                      {row.paymentCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSection>

        <AdminSection
          description="Talebi olan ama aktif ve onaylı usta kapasitesi düşük ilçeler."
          title="İlçe Arz / Talep Tablosu"
        >
          {revenue.supplyDemandGap.length === 0 ? (
            <EmptyAdminState message="Arz-talep açığı için okunabilir ilçe verisi bulunmuyor." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-[var(--border)]">
                    <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                      İlçe
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                      Açık Talep
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                      Aktif Usta
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                      Açık
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                      Sinyal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.supplyDemandGap.map((row) => (
                    <tr
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)]"
                      key={row.districtId}
                    >
                      <td className="px-4 py-3 text-sm font-bold text-[var(--brand-navy)]">
                        {row.district}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-[var(--brand-navy)]">
                        {row.openDemandCount}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-[var(--brand-navy)]">
                        {row.activeApprovedProviderCount}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-[var(--brand-orange-dark)]">
                        {row.gap}
                      </td>
                      <td className="px-4 py-3">
                        {row.opportunity ? (
                          <RevenueSignalBadge tone="orange">
                            Talep var, usta yok
                          </RevenueSignalBadge>
                        ) : row.gap > 0 ? (
                          <RevenueSignalBadge tone="orange">
                            Kapasite açığı
                          </RevenueSignalBadge>
                        ) : (
                          <RevenueSignalBadge>Dengeli</RevenueSignalBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      </AdminPageShell>
    </AdminAccessGate>
  );
}
