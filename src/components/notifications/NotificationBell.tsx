"use client";

import { Bell, Check, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  getNotificationsForUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationRecord,
} from "@/services/notifications";

type NotificationBellProps = {
  className?: string;
  panelAlign?: "left" | "right";
  userId: string;
};

const POLLING_INTERVAL_MS = 30_000;

function formatNotificationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function getNotificationBody(notification: NotificationRecord) {
  return notification.body || notification.message;
}

export function NotificationBell({
  className,
  panelAlign = "right",
  userId,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const unreadBadge = unreadCount > 99 ? "99+" : String(unreadCount);

  const loadNotifications = useCallback(async () => {
    if (!supabase || !userId) {
      await Promise.resolve();
      setNotifications([]);
      setHasLoaded(true);
      return;
    }

    const rows = await getNotificationsForUser(userId, supabase, { limit: 10 });
    setNotifications(rows);
    setHasLoaded(true);
  }, [supabase, userId]);

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    // Realtime can replace this later; polling keeps the notification center
    // simple and reliable while Supabase Realtime channels are not configured.
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, POLLING_INTERVAL_MS);

    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  async function handleNotificationRead(notification: NotificationRecord) {
    if (!supabase || notification.is_read) {
      return;
    }

    setNotifications((currentNotifications) =>
      currentNotifications.map((currentNotification) =>
        currentNotification.id === notification.id
          ? { ...currentNotification, is_read: true }
          : currentNotification,
      ),
    );

    const ok = await markNotificationAsRead(notification.id, userId, supabase);

    if (!ok) {
      void loadNotifications();
    }
  }

  async function handleMarkAllAsRead() {
    if (!supabase || unreadCount === 0) {
      return;
    }

    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({ ...notification, is_read: true })),
    );

    const ok = await markAllNotificationsAsRead(userId, supabase);

    if (!ok) {
      void loadNotifications();
    }
  }

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={
          unreadCount > 0
            ? `${unreadCount} okunmamış bildirim`
            : "Bildirimleri aç"
        }
        className="relative inline-flex size-10 cursor-pointer items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--brand-navy)] shadow-[0_10px_26px_rgba(13,20,36,0.06)] transition-colors hover:border-[rgba(255,138,0,0.46)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        title="Bildirimler"
        type="button"
      >
        <Bell className="size-5" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--brand-orange)] px-1.5 text-[0.68rem] font-black leading-5 text-white ring-2 ring-white">
            {unreadBadge}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          aria-label="Bildirimler"
          className={cn(
            "absolute top-[calc(100%+0.6rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-[rgba(13,20,36,0.1)] bg-white shadow-[0_24px_70px_rgba(13,20,36,0.18)]",
            panelAlign === "right" ? "right-0" : "left-0",
          )}
          role="dialog"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-[var(--brand-navy)]">Bildirimler</p>
              <p className="text-xs font-semibold text-[var(--muted)]">
                {unreadCount > 0 ? `${unreadCount} okunmamış` : "Hepsi okundu"}
              </p>
            </div>
            <button
              aria-label="Tüm bildirimleri okundu işaretle"
              className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[rgba(23,116,95,0.2)] bg-[var(--trust-green-soft)] text-[var(--trust-green)] transition-colors hover:bg-white disabled:cursor-default disabled:opacity-45"
              disabled={unreadCount === 0}
              onClick={handleMarkAllAsRead}
              title="Tümünü okundu işaretle"
              type="button"
            >
              <CheckCheck className="size-4" aria-hidden />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!hasLoaded ? (
              <p className="px-4 py-6 text-sm font-semibold text-[var(--muted)]">
                Bildirimler yükleniyor...
              </p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm font-semibold text-[var(--muted)]">
                Henüz bildirim yok.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {notifications.map((notification) => {
                  const isUnread = !notification.is_read;

                  return (
                    <button
                      className={cn(
                        "flex w-full cursor-pointer gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-soft)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--brand-orange)]",
                        isUnread ? "bg-[var(--brand-orange-soft)]/60" : "bg-white",
                      )}
                      key={notification.id}
                      onClick={() => handleNotificationRead(notification)}
                      type="button"
                    >
                      <span
                        className={cn(
                          "mt-1 inline-flex size-2.5 shrink-0 rounded-full",
                          isUnread ? "bg-[var(--brand-orange)]" : "bg-[var(--trust-green)]",
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span className="break-words text-sm font-black leading-5 text-[var(--brand-navy)]">
                            {notification.title}
                          </span>
                          {isUnread ? null : (
                            <Check className="mt-0.5 size-4 shrink-0 text-[var(--trust-green)]" aria-hidden />
                          )}
                        </span>
                        <span className="mt-1 block break-words text-xs font-semibold leading-5 text-[var(--muted)]">
                          {getNotificationBody(notification)}
                        </span>
                        <span className="mt-2 block text-[0.7rem] font-bold uppercase leading-4 text-[var(--brand-orange-dark)]">
                          {formatNotificationDate(notification.created_at)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
