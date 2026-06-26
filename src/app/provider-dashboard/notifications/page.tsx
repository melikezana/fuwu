import type { Metadata } from "next";
import { Bell, CheckCheck, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { ProviderDashboardShell, ProviderStatusBadge } from "@/components/dashboard/ProviderDashboardUI";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";
import { getServerAuthContext } from "@/services/auth/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bildirimler | Usta Paneli" };

const MOCK_NOTIFICATIONS = [
  { id: "1", event: "new_service_request_match", is_read: false, message: "Kadıköy'de elektrik tesisatı talebi sana eşleştirildi. Teklif: 850 TL.", created_at: "2026-06-27T01:30:00Z" },
  { id: "2", event: "new_service_request_match", is_read: false, message: "Üsküdar'da su tesisatı acil talebi — Yaklaşık varış: 45 dk.", created_at: "2026-06-26T22:15:00Z" },
  { id: "3", event: "service_request_accepted", is_read: false, message: "Beşiktaş tesisatı talebini kabul ettin. Müşteri bilgilendirildi.", created_at: "2026-06-26T18:00:00Z" },
  { id: "4", event: "service_request_completed", is_read: true, message: "Şişli elektrik işi tamamlandı. Ödeme takibine alındı.", created_at: "2026-06-25T16:30:00Z" },
  { id: "5", event: "provider_approved", is_read: true, message: "Usta hesabın onaylandı ve yayına alındı. Artık talepler alabilirsin!", created_at: "2026-06-20T10:00:00Z" },
  { id: "6", event: "new_service_request_match", is_read: true, message: "Maltepe'de kombi bakım talebi. Teklif: 650 TL.", created_at: "2026-06-18T09:45:00Z" },
  { id: "7", event: "service_request_completed", is_read: true, message: "Ataşehir tesisatı işi tamamlandı. 5 yıldız değerlendirme aldın!", created_at: "2026-06-15T14:20:00Z" },
];

type NotifRow = { id: string; event: string; message: string | null; is_read: boolean; created_at: string };

function formatNotifDate(v: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));
}
function getNotifIcon(event: string) {
  if (event.includes("match")) return AlertCircle;
  if (event.includes("accept") || event.includes("complete")) return CheckCheck;
  if (event.includes("approved")) return CheckCircle2;
  return Info;
}
function getNotifLabel(event: string) {
  const map: Record<string,string> = {
    new_service_request_match: "🔔 Yeni talep eşleşmesi",
    service_request_accepted: "✅ Talep kabul edildi",
    service_request_rejected: "❌ Talep reddedildi",
    service_request_completed: "🎉 İş tamamlandı",
    provider_approved: "🏅 Hesap onaylandı",
  };
  return map[event] ?? event;
}

async function getLiveNotifications(providerId: string, supabase: NonNullable<Awaited<ReturnType<typeof getServerAuthContext>>["supabase"]>) {
  const { data, error } = await supabase.from("notifications").select("id,event,message,is_read,created_at").eq("provider_id", providerId).order("created_at", { ascending: false }).limit(50);
  if (error) return null;
  return (data ?? []) as NotifRow[];
}

export default async function ProviderNotificationsPage() {
  const [providerAccess, authContext] = await Promise.all([
    getProviderDashboardAccess(),
    getServerAuthContext(),
  ]);

  const liveNotifs = providerAccess.ok && authContext.supabase
    ? await getLiveNotifications(providerAccess.profile.id, authContext.supabase)
    : null;

  const notifications = liveNotifs ?? MOCK_NOTIFICATIONS;
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const providerName = providerAccess.ok ? providerAccess.profile.name : "Demo Usta";

  return (
    <ProviderDashboardShell
      active="notifications"
      description="Sistem bildirimleri, talep eşleşmeleri ve güncellemeler."
      providerName={providerName}
      statusLabel={providerAccess.ok ? "Usta hesabınız aktif" : "Demo modu"}
      statusTone={providerAccess.ok ? "green" : "orange"}
      title="Bildirimler"
    >
      <div className="grid gap-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          📊 {liveNotifs ? "Gerçek bildirimler gösteriliyor." : "Demo veriler gösteriliyor. Usta hesabı ile giriş yapıldığında gerçek bildirimler görünür."}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[{ label: "Toplam", value: notifications.length }, { label: "Okunmamış", value: unreadCount }, { label: "Okunmuş", value: notifications.length - unreadCount }].map((item) => (
            <div key={item.label} className="relative overflow-hidden rounded-lg border border-[rgba(255,138,0,0.24)] bg-white p-5 shadow-[var(--shadow-card)]">
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
              {unreadCount > 0 && <ProviderStatusBadge tone="orange">{unreadCount} okunmamış</ProviderStatusBadge>}
              <ProviderStatusBadge tone="green">{notifications.length} toplam</ProviderStatusBadge>
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            {notifications.map((notif) => {
              const Icon = getNotifIcon(notif.event);
              return (
                <article key={notif.id} className={`flex items-start gap-4 rounded-lg border p-4 ${!notif.is_read ? "border-[rgba(255,138,0,0.3)] bg-[var(--brand-orange-soft)]" : "border-[var(--border)] bg-[var(--surface-soft)]"}`}>
                  <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${!notif.is_read ? "bg-[var(--brand-orange)] text-white" : "bg-white text-[var(--muted)]"}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${!notif.is_read ? "text-[var(--brand-navy)]" : "text-[var(--muted)]"}`}>{getNotifLabel(notif.event)}</p>
                      {!notif.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--brand-orange)]" />}
                    </div>
                    {notif.message && <p className="mt-1 text-sm font-semibold leading-5 text-[var(--muted)]">{notif.message}</p>}
                    <p className="mt-2 text-xs font-semibold text-[var(--muted)]">{formatNotifDate(notif.created_at)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </ProviderDashboardShell>
  );
}
