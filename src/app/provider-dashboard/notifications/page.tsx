import type { Metadata } from "next";
import { Info } from "lucide-react";
import { NotificationList } from "@/components/notifications/NotificationList";
import { notificationHref } from "@/lib/notifications/links";
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
  body: string | null;
  title: string | null;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  request_id: string | null;
  metadata: unknown;
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

function getNotifLabel(event: string) {
  const map: Record<string, string> = {
    commerce_order_updated: "Sipariş güncellemesi",
    new_service_request_match: "Yeni talep eşleşmesi",
    provider_approved: "Hesap onaylandı",
    service_request_accepted: "Talep kabul edildi",
    service_request_completed: "İş tamamlandı",
    service_request_rejected: "Talep reddedildi",
  };

  return map[event] ?? event;
}

// Ustaya giden tüm bildirimler (sipariş, talep, başvuru kararı) alıcıya göre okunur; RLS yalnızca kendi satırlarını verir.
async function getLiveNotifications(userId: string, supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,event,type,title,body,message,is_read,created_at,entity_type,entity_id,request_id,metadata")
    .eq("recipient_user_id", userId)
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
    providerAccess.ok && authContext.supabase && authContext.user
      ? await getLiveNotifications(authContext.user.id, authContext.supabase)
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

            <div className="mt-5">
              <NotificationList
                emptyState={<NotificationsEmptyState />}
                items={notifications.map((notification) => ({
                  id: notification.id,
                  title: notification.title || getNotifLabel(notification.event),
                  body: notification.body || notification.message || "",
                  dateLabel: formatNotifDate(notification.created_at),
                  href: notificationHref(notification),
                  isUnread: !notification.is_read,
                }))}
              />
            </div>
          </section>
        </div>
      ) : (
        <ProviderDashboardRestrictedAreaEmptyState />
      )}
    </ProviderDashboardShell>
  );
}
