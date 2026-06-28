import type { Metadata } from "next";
import { AlertCircle, CheckCheck, CheckCircle2, Info } from "lucide-react";
import {
  getProviderDashboardStatusBadgeView,
  ProviderDashboardRestrictedAreaEmptyState,
  ProviderDashboardShell,
  ProviderStatusBadge,
} from "@/components/dashboard/ProviderDashboardUI";
import { getServerAuthContext } from "@/services/auth/server";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bildirimler | Usta Paneli",
};

type NotifRow = {
  created_at: string;
  event: string;
  id: string;
  is_read: boolean;
  message: string | null;
};

type ServerSupabaseClient = NonNullable<
  Awaited<ReturnType<typeof getServerAuthContext>>["supabase"]
>;

function formatNotifDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getNotifIcon(event: string) {
  if (event.includes("match")) return AlertCircle;
  if (event.includes("accept") || event.includes("complete")) return CheckCheck;
  if (event.includes("approved")) return CheckCircle2;
  return Info;
}

function getNotifLabel(event: string) {
  const map: Record<string, string> = {
    new_service_request_match: "Yeni talep eşleşmesi",
    provider_approved: "Hesap onaylandı",
    service_request_accepted: "Talep kabul edildi",
    service_request_completed: "İş tamamlandı",
    service_request_rejected: "Talep reddedildi",
  };

  return map[event] ?? event;
}

async function getLiveNotifications(providerId: string, supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,event,message,is_read,created_at")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return [];
  }

  return (data ?? []) as NotifRow[];
}

function NotificationsEmptyState() {
  return (
    <div
      className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-6 text-center"
      role="status"
    >
      <Info className="mx-auto h-8 w-8 text-[var(--muted)]" aria-hidden />
      <p className="mt-3 text-sm font-semibold text-[var(--brand-navy)]">Henüz bildirim yok.</p>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--muted)]">
        Talep eşleşmeleri ve hesap güncellemeleri oluştuğunda burada listelenecek.
      </p>
    </div>
  );
}

export default async function ProviderNotificationsPage() {
  const [providerAccess, authContext] = await Promise.all([
    getProviderDashboardAccess(),
    getServerAuthContext(),
  ]);
  const statusBadge = getProviderDashboardStatusBadgeView(
    providerAccess.ok
      ? providerAccess.application?.status
      : providerAccess.applicationStatus,
    providerAccess.ok,
  );
  const notifications =
    providerAccess.ok && authContext.supabase
      ? await getLiveNotifications(providerAccess.profile.id, authContext.supabase)
      : [];
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <ProviderDashboardShell
      active="notifications"
      description="Sistem bildirimleri, talep eşleşmeleri ve güncellemeler."
      providerName={providerAccess.ok ? providerAccess.profile.name : undefined}
      statusLabel={statusBadge.label}
      statusTone={statusBadge.tone}
      title="Bildirimler"
    >
      {providerAccess.ok ? (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Toplam", value: notifications.length },
              { label: "Okunmamış", value: unreadCount },
              { label: "Okunmuş", value: notifications.length - unreadCount },
            ].map((item) => (
              <div
                className="relative overflow-hidden rounded-lg border border-[rgba(255,138,0,0.24)] bg-white p-5 shadow-[var(--shadow-card)]"
                key={item.label}
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-[var(--brand-orange)]" aria-hidden />
                <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">{item.label}</p>
                <p className="mt-3 text-3xl font-bold text-[var(--brand-navy)]">{item.value}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">bildirim</p>
              </div>
            ))}
          </div>

          <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-5">
              <div className="cursor-default select-none">
                <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">Bildirim merkezi</p>
                <h2 className="mt-2 text-xl font-bold text-[var(--brand-navy)]">Tüm bildirimler</h2>
              </div>
              <div className="flex gap-2">
                {unreadCount > 0 ? <ProviderStatusBadge tone="orange">{unreadCount} okunmamış</ProviderStatusBadge> : null}
                <ProviderStatusBadge tone="green">{notifications.length} toplam</ProviderStatusBadge>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {notifications.length > 0 ? (
                notifications.map((notification) => {
                  const Icon = getNotifIcon(notification.event);

                  return (
                    <article
                      className={`flex items-start gap-4 rounded-lg border p-4 ${
                        !notification.is_read
                          ? "border-[rgba(255,138,0,0.3)] bg-[var(--brand-orange-soft)]"
                          : "border-[var(--border)] bg-[var(--surface-soft)]"
                      }`}
                      key={notification.id}
                    >
                      <span
                        className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                          !notification.is_read
                            ? "bg-[var(--brand-orange)] text-white"
                            : "bg-white text-[var(--muted)]"
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold ${!notification.is_read ? "text-[var(--brand-navy)]" : "text-[var(--muted)]"}`}>
                            {getNotifLabel(notification.event)}
                          </p>
                          {!notification.is_read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--brand-orange)]" /> : null}
                        </div>
                        {notification.message ? (
                          <p className="mt-1 text-sm font-semibold leading-5 text-[var(--muted)]">{notification.message}</p>
                        ) : null}
                        <p className="mt-2 text-xs font-semibold text-[var(--muted)]">{formatNotifDate(notification.created_at)}</p>
                      </div>
                    </article>
                  );
                })
              ) : (
                <NotificationsEmptyState />
              )}
            </div>
          </section>
        </div>
      ) : (
        <ProviderDashboardRestrictedAreaEmptyState />
      )}
    </ProviderDashboardShell>
  );
}
