"use client";
import { Check, CheckCheck, CircleDot } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/account/notifications/actions";
import { cn } from "@/lib/utils";

export type NotificationListItem = { id: string; title: string; body: string; dateLabel: string; href: string | null; isUnread: boolean };

// Her satır bir düğme: dokununca okundu işaretlenir, bağlı bir sayfa varsa oraya gider.
export function NotificationList({ items, emptyState }: { items: NotificationListItem[]; emptyState: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [failed, setFailed] = useState(false);
  const isUnread = (item: NotificationListItem) => item.isUnread && !readIds.has(item.id);
  const unreadCount = items.filter(isUnread).length;

  function open(item: NotificationListItem) {
    setFailed(false);
    if (isUnread(item)) {
      setReadIds(current => new Set(current).add(item.id));
      startTransition(async () => {
        const result = await markNotificationReadAction(item.id).catch(() => ({ ok: false }));
        if (!result.ok) { setFailed(true); setReadIds(current => { const next = new Set(current); next.delete(item.id); return next; }); }
      });
    }
    if (item.href) router.push(item.href);
  }

  function markAll() {
    setFailed(false);
    const previous = readIds;
    setReadIds(new Set(items.map(item => item.id)));
    startTransition(async () => {
      const result = await markAllNotificationsReadAction().catch(() => ({ ok: false }));
      if (!result.ok) { setFailed(true); setReadIds(previous); } else router.refresh();
    });
  }

  if (items.length === 0) return <>{emptyState}</>;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--muted)]" aria-live="polite">{unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : "Tüm bildirimler okundu"}</p>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] px-4 text-sm font-semibold text-[var(--trust-green)] transition-colors hover:bg-white disabled:cursor-default disabled:opacity-50"
          disabled={unreadCount === 0 || pending}
          onClick={markAll}
          type="button"
        >
          <CheckCheck className="size-4" aria-hidden /> Tümünü okundu işaretle
        </button>
      </div>
      {failed && <p className="commerce-error" role="alert">Bildirim güncellenemedi. Bağlantını kontrol edip yeniden dene.</p>}
      <ul className="grid gap-3">
        {items.map(item => {
          const unread = isUnread(item);
          const Icon = unread ? CircleDot : Check;
          return (
            <li key={item.id}>
              <button
                className={cn(
                  "flex w-full gap-3 rounded-lg border p-4 text-left shadow-[var(--shadow-subtle)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2",
                  unread ? "border-[rgba(255,138,0,0.34)] bg-[var(--brand-orange-soft)]" : "border-[var(--border)] bg-white hover:bg-[var(--surface-soft)]",
                  item.href || unread ? "cursor-pointer" : "cursor-default",
                )}
                onClick={() => open(item)}
                type="button"
              >
                <span className={cn("mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-md", unread ? "bg-[var(--brand-orange)] text-white" : "bg-[var(--surface-soft)] text-[var(--trust-green)]")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-sm font-bold leading-5 text-[var(--brand-navy)]">{item.title}</span>
                    {unread ? <span className="sr-only">Okunmamış</span> : null}
                  </span>
                  <span className="mt-1 block text-sm font-semibold leading-6 text-[var(--muted)]">{item.body}</span>
                  <span className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase text-[var(--brand-orange-dark)]">{item.dateLabel}</span>
                    {item.href ? <span className="text-xs font-semibold text-[var(--brand-navy)] underline underline-offset-4">Aç</span> : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
