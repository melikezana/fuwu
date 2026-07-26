import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { EmptyAdminState } from "@/components/admin/EmptyAdminState";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { getAdminAccess } from "@/services/admin";
import { getAdminUsers } from "@/services/admin/users";
import type { ProfileRole } from "@/types/auth";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { UserRoleActions } from "./UserRoleActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kullanıcılar | Admin",
  description: "Fuwu kullanıcılarını ve rollerini yöneten admin görünümü.",
};

const adminUsersPath = "/admin/users";

type SearchParams = Record<string, string | string[] | undefined>;

const roleLabels: Record<ProfileRole, string> = {
  admin: "Admin",
  customer: "Müşteri",
  provider: "Usta",
};

const roleBadgeClasses: Record<ProfileRole, string> = {
  admin: "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]",
  customer: "bg-[var(--surface-soft)] text-[var(--brand-navy)]",
  provider: "bg-blue-50 text-blue-700",
};

function RoleBadge({ role }: { role: ProfileRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClasses[role]}`}
    >
      {roleLabels[role]}
    </span>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.ok && adminAccess.reason === "missing-session") {
    redirect(buildLoginRedirectUrl(adminUsersPath));
  }

  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const resolvedParams = (await searchParams) ?? {};
  const search =
    typeof resolvedParams.search === "string" ? resolvedParams.search : "";
  const role = typeof resolvedParams.role === "string" ? resolvedParams.role : "";

  const { rows, error } = await getAdminUsers({ role, search });

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
        active="users"
        breadcrumbLabel="Kullanıcılar"
        description="Tüm kayıtlı kullanıcıları görüntüle, ara ve rollerini yönet."
        error={error}
        title="Kullanıcılar"
      >
        <form
          action={adminUsersPath}
          className="mb-6 flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-end"
          method="get"
        >
          <label className="flex-1 text-sm font-semibold text-[var(--brand-navy)]">
            Ara (isim veya telefon)
            <div className="mt-1.5 flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 py-2">
              <Search className="h-4 w-4 text-[var(--muted)]" aria-hidden />
              <input
                className="w-full bg-transparent text-sm font-normal text-[var(--brand-navy)] outline-none"
                defaultValue={search}
                name="search"
                placeholder="Örn. Ahmet veya 0532…"
                type="text"
              />
            </div>
          </label>

          <label className="text-sm font-semibold text-[var(--brand-navy)]">
            Rol
            <select
              className="mt-1.5 block rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--brand-navy)]"
              defaultValue={role}
              name="role"
            >
              <option value="">Tüm roller</option>
              <option value="customer">Müşteri</option>
              <option value="provider">Usta</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <button
            className="rounded-md bg-[var(--brand-navy)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
            type="submit"
          >
            Filtrele
          </button>
        </form>

        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--muted)]">
            {rows.length} kullanıcı
          </span>
          <ExportCsvButton
            columns={[
              { header: "İsim", key: "name" },
              { header: "Telefon", key: "phone" },
              { header: "Rol", key: "role" },
              { header: "Kayıt Tarihi", key: "createdAt" },
            ]}
            filename="kullanicilar.csv"
            rows={rows.map((user) => ({
              createdAt: new Date(user.createdAt).toLocaleDateString("tr-TR"),
              name: user.fullName ?? "",
              phone: user.phone ?? "",
              role: user.role,
            }))}
          />
        </div>

        {rows.length === 0 ? (
          <EmptyAdminState message="Kayıtlı kullanıcı bulunamadı." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-[var(--border)]">
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                    İsim
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                    Telefon
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                    Mevcut Rol
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                    Kayıt Tarihi
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                    Rol Yönetimi
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)]"
                    key={user.id}
                  >
                    <td className="px-4 py-3 text-sm font-semibold">
                      <Link
                        className="text-[var(--brand-orange-dark)] hover:underline"
                        href={`/admin/users/${user.id}`}
                      >
                        {user.fullName?.trim() || "Detay"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--brand-navy)]">
                      {user.phone?.trim() || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted)]">
                      {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3">
                      <UserRoleActions
                        currentRole={user.role}
                        isSelf={user.id === adminAccess.userId}
                        userId={user.id}
                      />
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
