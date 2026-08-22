import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Banknote, CreditCard, Landmark, RotateCcw, ShieldCheck } from "lucide-react";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { EmptyAdminState } from "@/components/admin/EmptyAdminState";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { MetricCard } from "@/components/admin/MetricCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getAdminAccess } from "@/services/admin";
import { getAdminPayments, paymentMethodLabel } from "@/services/admin/sections";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { refundIyzicoPaymentAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ödemeler | Admin",
  description: "Fuwu ödeme ve finans görünümü.",
};

const currency = new Intl.NumberFormat("tr-TR", {
  currency: "TRY",
  style: "currency",
});

type AdminPaymentsSearchParams = {
  paymentAction?: string | string[];
};

type AdminPaymentsPageProps = {
  searchParams?: Promise<AdminPaymentsSearchParams>;
};

function getSearchParamValue(
  searchParams: AdminPaymentsSearchParams | undefined,
  key: keyof AdminPaymentsSearchParams,
) {
  const value = searchParams?.[key];

  return Array.isArray(value) ? value[0] : value;
}

function getPaymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    confirmed: "Onaylandı",
    escrow_failed: "Müdahale gerekli",
    escrow_held: "Emanette",
    escrow_refunded: "İade edildi",
    escrow_released: "Ustaya aktarıldı",
    pending_confirmation: "Bekliyor",
  };

  return labels[status] ?? status;
}

function getPaymentStatusTone(status: string) {
  if (status === "confirmed" || status === "escrow_released") {
    return "success" as const;
  }

  if (status === "escrow_failed") {
    return "error" as const;
  }

  if (status === "escrow_held") {
    return "warning" as const;
  }

  if (status === "escrow_refunded") {
    return "neutral" as const;
  }

  return "info" as const;
}

function PaymentActionNotice({ code }: { code?: string }) {
  if (!code) {
    return null;
  }

  const isSuccess = code === "refund-success";
  const className = isSuccess
    ? "border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]"
    : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={`mb-4 rounded-lg border p-4 ${className}`} role={isSuccess ? "status" : "alert"}>
      <p className="text-sm font-bold">
        {isSuccess ? "İade başlatıldı" : "İade başlatılamadı"}
      </p>
      <p className="mt-1 text-sm font-semibold leading-6">
        {isSuccess
          ? "iyzico iadesi tamamlandı ve ödeme kaydı güncellendi."
          : "Ödeme iadesi tamamlanamadı. Kayıt durumunu ve iyzico işlem bilgisini kontrol et."}
      </p>
    </div>
  );
}

function PaymentTrustPanel() {
  const methods = [
    { icon: Banknote, label: "Nakit", text: "Talep ödeme tercihi olarak takip edilir." },
    { icon: Landmark, label: "IBAN / Havale", text: "IBAN bilgisi usta kabulünden sonra paylaşılır." },
    { icon: CreditCard, label: "iyzico escrow", text: "Komisyon ve payout statüleri kayıt altındadır." },
  ];

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-[var(--border)] bg-[linear-gradient(110deg,#ffffff_0%,#f7f9fc_58%,#fff2e8_100%)] p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-[var(--brand-orange-soft)] px-3 text-xs font-bold uppercase text-[var(--brand-orange-dark)]">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Güvenli ödeme takibi
          </span>
          <h2 className="mt-3 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
            Ödeme kayıtları doğrulanabilir işlem takibi için tutulur.
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--muted)]">
            iyzico ödemelerinde tutar talep fiyatından okunur, emanet durumları ve iade
            aksiyonları kayıt altına alınır.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[34rem]">
          {methods.map((method) => {
            const Icon = method.icon;

            return (
              <div
                className="rounded-md border border-[rgba(10,37,64,0.08)] bg-white p-3 shadow-[var(--shadow-subtle)]"
                key={method.label}
              >
                <Icon aria-hidden="true" className="size-5 text-[var(--brand-orange)]" />
                <p className="mt-2 text-sm font-bold text-[var(--brand-navy)]">{method.label}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">
                  {method.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default async function AdminPaymentsPage({
  searchParams,
}: AdminPaymentsPageProps) {
  const adminAccess = await getAdminAccess();
  const resolvedSearchParams = await searchParams;
  const paymentActionCode = getSearchParamValue(
    resolvedSearchParams,
    "paymentAction",
  );

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
        <PaymentTrustPanel />
        <PaymentActionNotice code={paymentActionCode} />

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
              status: getPaymentStatusLabel(payment.status),
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
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">İşlem</th>
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
                        status={getPaymentStatusLabel(payment.status)}
                        tone={getPaymentStatusTone(payment.status)}
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
                    <td className="px-4 py-3">
                      {payment.canRefund ? (
                        <form action={refundIyzicoPaymentAction}>
                          <input name="paymentId" type="hidden" value={payment.id} />
                          <button
                            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 md:min-h-10"
                            type="submit"
                          >
                            <RotateCcw className="size-3.5" aria-hidden />
                            İade et
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs font-semibold text-[var(--muted)]">—</span>
                      )}
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
