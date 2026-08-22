import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { EmptyAdminState } from "@/components/admin/EmptyAdminState";
import { getAdminAccess } from "@/services/admin";
import { getAdminAuditLogs } from "@/services/admin/sections";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "İşlem Geçmişi | Admin",
  description: "Fuwu sistem işlem geçmişi (audit log).",
};

type SearchParams = Record<string, string | string[] | undefined>;

const entityTypeOptions = [
  { label: "Tüm türler", value: "" },
  { label: "Usta", value: "provider" },
  { label: "Usta Başvurusu", value: "provider_application" },
  { label: "Hizmet Talebi", value: "service_request" },
  { label: "Ödeme", value: "payment" },
  { label: "Profil", value: "profile" },
  { label: "Güvenlik Olayı", value: "security_event" },
];

function buildQuery(next: Record<string, string | number>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value !== "" && value !== undefined) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `/admin/audit?${query}` : "/admin/audit";
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.ok && adminAccess.reason === "missing-session") {
    redirect(buildLoginRedirectUrl("/admin/audit"));
  }
  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const resolved = (await searchParams) ?? {};
  const action = typeof resolved.action === "string" ? resolved.action : "";
  const entityType = typeof resolved.entityType === "string" ? resolved.entityType : "";
  const page = typeof resolved.page === "string" ? Number(resolved.page) || 1 : 1;

  const { rows, total, pageSize, page: currentPage, error } = await getAdminAuditLogs({
    action,
    entityType,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
        active="audit"
        breadcrumbLabel="İşlem Geçmişi"
        description="Sistemdeki tüm admin ve güvenlik işlemlerinin kaydı."
        error={error}
        title="İşlem Geçmişi (Audit Log)"
      >
        <form
          action="/admin/audit"
          className="mb-6 flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-end"
          method="get"
        >
          <label className="flex-1 text-sm font-semibold text-[var(--brand-navy)]">
            Aksiyon ara
            <input
              className="mt-1.5 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal text-[var(--brand-navy)] outline-none"
              defaultValue={action}
              name="action"
              placeholder="Örn. provider.status_updated"
              type="text"
            />
          </label>
          <label className="text-sm font-semibold text-[var(--brand-navy)]">
            Varlık türü
            <select
              className="mt-1.5 block rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--brand-navy)]"
              defaultValue={entityType}
              name="entityType"
            >
              {entityTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--brand-navy)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 md:min-h-0"
            type="submit"
          >
            Filtrele
          </button>
        </form>

        {rows.length === 0 ? (
          <EmptyAdminState message="Kayıt bulunamadı." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-[var(--border)]">
                    <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">Tarih</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">Aksiyon</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">Varlık Türü</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">Varlık ID</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((log) => (
                    <tr
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)]"
                      key={log.id}
                    >
                      <td className="px-4 py-3 text-sm text-[var(--muted)]">
                        {new Date(log.createdAt).toLocaleString("tr-TR")}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-[var(--brand-navy)]">{log.action}</td>
                      <td className="px-4 py-3 text-sm text-[var(--brand-orange-dark)]">{log.entityType}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">
                        {log.entityId ? log.entityId.slice(0, 8) + "…" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm font-semibold text-[var(--brand-navy)]">
              <span>
                Toplam {total} kayıt · Sayfa {currentPage}/{totalPages}
              </span>
              <div className="flex gap-2">
                {currentPage > 1 ? (
                  <Link
                    className="inline-flex min-h-11 items-center rounded-md border border-[var(--border)] bg-white px-3 py-1.5 hover:bg-[var(--surface-soft)] md:min-h-0"
                    href={buildQuery({ action, entityType, page: currentPage - 1 })}
                  >
                    ← Önceki
                  </Link>
                ) : null}
                {currentPage < totalPages ? (
                  <Link
                    className="inline-flex min-h-11 items-center rounded-md border border-[var(--border)] bg-white px-3 py-1.5 hover:bg-[var(--surface-soft)] md:min-h-0"
                    href={buildQuery({ action, entityType, page: currentPage + 1 })}
                  >
                    Sonraki →
                  </Link>
                ) : null}
              </div>
            </div>
          </>
        )}
      </AdminPageShell>
    </AdminAccessGate>
  );
}
