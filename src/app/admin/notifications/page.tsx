import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { EmptyAdminState } from "@/components/admin/EmptyAdminState";
import { getAdminAccess } from "@/services/admin";
import { getAdminUsers } from "@/services/admin/users";
import { getAdminNotifications } from "@/services/admin/notifications";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { NotificationComposer } from "./NotificationComposer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bildirimler | Admin",
  description: "Fuwu kullanıcılarına bildirim gönder.",
};

export default async function AdminNotificationsPage() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.ok && adminAccess.reason === "missing-session") {
    redirect(buildLoginRedirectUrl("/admin/notifications"));
  }
  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const [{ rows: users }, notifications] = await Promise.all([
    getAdminUsers(),
    getAdminNotifications(),
  ]);

  const userOptions = users.map((user) => ({
    id: user.id,
    name: user.fullName?.trim() || user.phone?.trim() || user.id.slice(0, 8),
  }));

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
        active="notifications"
        breadcrumbLabel="Bildirimler"
        description="Tek bir kullanıcıya veya toplu olarak duyuru/bildirim gönder."
        error={notifications.error}
        title="Bildirimler"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <NotificationComposer users={userOptions} />

          <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="mb-4 text-lg font-bold text-[var(--brand-navy)]">Son Gönderilenler</h2>
            {notifications.rows.length === 0 ? (
              <EmptyAdminState message="Henüz bildirim yok." />
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--border)]">
                {notifications.rows.map((notification) => (
                  <li className="py-3" key={notification.id}>
                    <p className="text-sm font-bold text-[var(--brand-navy)]">
                      {notification.title}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--muted)]">{notification.body}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {new Date(notification.createdAt).toLocaleString("tr-TR")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </AdminPageShell>
    </AdminAccessGate>
  );
}
