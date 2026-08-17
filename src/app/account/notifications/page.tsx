import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Check, CircleDot, Info } from "lucide-react";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { appRoutes, buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import {
  getNotificationsForUser,
  type NotificationRecord,
} from "@/services/notifications";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bildirimlerim | Fuwu",
  description: "Fuwu talep ve hesap bildirimlerini takip et.",
};

function formatNotificationDate(value: string | null) {
  if (!value) {
    return "Tarih bekleniyor";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getNotificationBody(notification: NotificationRecord) {
  return notification.body || notification.message || "Bildirim detayı hazırlanıyor.";
}

function getNotificationHref(notification: NotificationRecord) {
  if (notification.request_id) {
    return `${appRoutes.orderTracking}/${notification.request_id}`;
  }

  if (notification.entity_type === "provider_application") {
    return appRoutes.accountApplications;
  }

  return appRoutes.account;
}

function NotificationsEmptyState() {
  return (
    <section
      className="rounded-lg border border-dashed border-[rgba(255,138,0,0.38)] bg-white px-6 py-12 text-center shadow-[var(--shadow-subtle)]"
      role="status"
    >
      <Info className="mx-auto size-8 text-[var(--muted)]" aria-hidden="true" />
      <h2 className="mt-4 text-xl font-bold text-[var(--brand-navy)]">
        Henüz bildirim yok.
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[var(--muted)]">
        Talep durumu, doğrulama kodu ve hesap güncellemeleri burada görünecek.
      </p>
      <Button className="mt-5" href={appRoutes.request}>
        Talep Oluştur
      </Button>
    </section>
  );
}

export default async function AccountNotificationsPage() {
  const authContext = await getServerAuthContext();

  if (!authContext.user || !authContext.supabase) {
    redirect(buildLoginRedirectUrl(appRoutes.accountNotifications));
  }

  const notifications = await getNotificationsForUser(
    authContext.user.id,
    authContext.supabase,
    { limit: 50 },
  );
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <main className="min-h-screen bg-[var(--surface-soft)]">
      <header className="border-b border-[var(--border)] bg-white">
        <Container className="flex min-h-16 items-center justify-between gap-4">
          <Link href={appRoutes.home} aria-label="Fuwu ana sayfasına git">
            <FuwuLogo size="sm" />
          </Link>
          <Button href={appRoutes.accountRequests} variant="secondary">
            Taleplerim
          </Button>
        </Container>
      </header>

      <Container className="max-w-5xl py-8 sm:py-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">
              Hesabım
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-[var(--brand-navy)]">
              Bildirimler
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)]">
              Talep akışındaki önemli gelişmeleri buradan takip edebilirsin.
            </p>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-[var(--muted)] ring-1 ring-[rgba(13,20,36,0.08)]">
            <Bell className="size-4 text-[var(--brand-orange-dark)]" aria-hidden="true" />
            {unreadCount} okunmamış
          </div>
        </div>

        {notifications.length > 0 ? (
          <section className="grid gap-3">
            {notifications.map((notification) => {
              const isUnread = !notification.is_read;
              const Icon = isUnread ? CircleDot : Check;

              return (
                <Link
                  className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-subtle)] transition-colors hover:border-[rgba(255,138,0,0.42)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                  href={getNotificationHref(notification)}
                  key={notification.id}
                >
                  <article className="flex gap-3">
                    <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-sm font-bold leading-5 text-[var(--brand-navy)]">
                          {notification.title || "Fuwu bildirimi"}
                        </h2>
                        {isUnread ? (
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--brand-orange)]" />
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-semibold leading-6 text-[var(--muted)]">
                        {getNotificationBody(notification)}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase text-[var(--brand-orange-dark)]">
                        {formatNotificationDate(notification.created_at)}
                      </p>
                    </div>
                  </article>
                </Link>
              );
            })}
          </section>
        ) : (
          <NotificationsEmptyState />
        )}
      </Container>
    </main>
  );
}
