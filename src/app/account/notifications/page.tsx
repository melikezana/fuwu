import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { NotificationList } from "@/components/notifications/NotificationList";
import { notificationHref } from "@/lib/notifications/links";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { appRoutes, buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import { NotificationHapticTrigger } from "@/components/notifications/NotificationHapticTrigger";
import {
  getNotificationsForUser,
  type NotificationRecord,
} from "@/services/notifications";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bildirimlerim",
  description: "FUWU talep ve hesap bildirimlerini takip et.",
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
        Başvuru, sipariş ve hesap güncellemeleri burada görünecek. Yeni bir şey olduğunda üstteki zil de haber verir.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Button href={appRoutes.account}>Hesabıma dön</Button>
        <Button href="/services" variant="secondary">Hizmetleri Keşfet</Button>
      </div>
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
          <Link href={appRoutes.home} aria-label="FUWU ana sayfasına git">
            <FuwuLogo size="sm" />
          </Link>
          <Button href={appRoutes.account} variant="secondary">
            Hesabım
          </Button>
        </Container>
      </header>

      <Container className="max-w-5xl py-8 sm:py-10">
        <NotificationHapticTrigger unreadCount={unreadCount} />
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">
              Hesabım
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-[var(--brand-navy)]">
              Bildirimler
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)]">
              Başvuru, sipariş ve hesap gelişmelerini buradan takip et. Bir bildirime dokununca okundu sayılır ve ilgili sayfa açılır.
            </p>
          </div>
        </div>

        <NotificationList
          emptyState={<NotificationsEmptyState />}
          items={notifications.map((notification) => ({
            id: notification.id,
            title: notification.title || "FUWU bildirimi",
            body: getNotificationBody(notification),
            dateLabel: formatNotificationDate(notification.created_at),
            href: notificationHref(notification),
            isUnread: !notification.is_read,
          }))}
        />
      </Container>
    </main>
  );
}
