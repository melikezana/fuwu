import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wrench,
  Plus,
  LogOut,
  MapPin,
  Calendar,
  ChevronRight,
  FileText,
  Loader2,
} from "lucide-react";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { Container } from "@/components/ui/Container";
import { appRoutes } from "@/lib/constants/navigation";
import {
  LEGACY_SERVICE_REQUEST_STATUSES,
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUSES,
  normalizeServiceRequestStatus,
} from "@/lib/constants/statuses";
import { getServerAuthContext } from "@/services/auth/server";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hesabım | Fuwu",
  description: "Taleplerinizi takip edin, geçmiş işlerinizi görüntüleyin.",
};

type ServiceRequest = {
  id: string;
  status: string;
  urgency_type: string | null;
  budget_tag: string | null;
  confirmation_code: string | null;
  description: string | null;
  created_at: string | null;
  service_categories: { name: string } | null;
  districts: { name: string } | null;
};

async function getUserRequests(userId: string): Promise<ServiceRequest[]> {
  if (!isSupabaseServerConfigured) return [];
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("service_requests")
    .select(
      "id, status, urgency_type, budget_tag, confirmation_code, description, created_at, service_categories(name), districts(name)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !data) return [];
  return data as unknown as ServiceRequest[];
}

const PENDING_STATUSES = [
  SERVICE_REQUEST_STATUSES.pending,
  LEGACY_SERVICE_REQUEST_STATUSES.yeni,
];
const ASSIGNED_STATUSES = [
  SERVICE_REQUEST_STATUSES.assigned,
  LEGACY_SERVICE_REQUEST_STATUSES.ustayaYonlendirildi,
];
const ACCEPTED_STATUSES = [
  SERVICE_REQUEST_STATUSES.accepted,
  SERVICE_REQUEST_STATUSES.inProgress,
  LEGACY_SERVICE_REQUEST_STATUSES.inceleniyor,
  LEGACY_SERVICE_REQUEST_STATUSES.onTheWay,
];
const REJECTED_STATUSES = [SERVICE_REQUEST_STATUSES.rejected];
const COMPLETED_STATUSES = [
  SERVICE_REQUEST_STATUSES.completed,
  LEGACY_SERVICE_REQUEST_STATUSES.tamamlandi,
];
const CANCELLED_STATUSES = [
  SERVICE_REQUEST_STATUSES.cancelled,
  LEGACY_SERVICE_REQUEST_STATUSES.iptal,
];

type StatusConfig = {
  label: string;
  color: string;
  bg: string;
  ring: string;
  Icon: React.ElementType;
  dot: string;
};

function getStatusConfig(status: string): StatusConfig {
  const normalizedStatus = normalizeServiceRequestStatus(status);
  let label =
    normalizedStatus ? SERVICE_REQUEST_STATUS_LABELS[normalizedStatus] : status;

  if (normalizedStatus === SERVICE_REQUEST_STATUSES.accepted) {
    label = "Usta talebini kabul etti.";
  }

  if (normalizedStatus === SERVICE_REQUEST_STATUSES.rejected) {
    label = "Usta talebi reddetti. Yeni eşleşme bekleniyor.";
  }

  if ((COMPLETED_STATUSES as string[]).includes(status)) {
    return {
      label,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      ring: "ring-emerald-200",
      dot: "bg-emerald-500",
      Icon: CheckCircle2,
    };
  }
  if ((CANCELLED_STATUSES as string[]).includes(status)) {
    return {
      label,
      color: "text-red-600",
      bg: "bg-red-50",
      ring: "ring-red-200",
      dot: "bg-red-400",
      Icon: XCircle,
    };
  }
  if ((REJECTED_STATUSES as string[]).includes(status)) {
    return {
      label,
      color: "text-red-600",
      bg: "bg-red-50",
      ring: "ring-red-200",
      dot: "bg-red-400",
      Icon: XCircle,
    };
  }
  if (
    normalizedStatus === SERVICE_REQUEST_STATUSES.accepted ||
    normalizedStatus === SERVICE_REQUEST_STATUSES.inProgress
  ) {
    return {
      label,
      color: "text-blue-700",
      bg: "bg-blue-50",
      ring: "ring-blue-200",
      dot: "bg-blue-500",
      Icon: Loader2,
    };
  }
  if ((ASSIGNED_STATUSES as string[]).includes(status)) {
    return {
      label,
      color: "text-blue-700",
      bg: "bg-blue-50",
      ring: "ring-blue-200",
      dot: "bg-blue-500",
      Icon: Loader2,
    };
  }
  return {
    label,
    color: "text-amber-700",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
    dot: "bg-amber-400",
    Icon: Clock,
  };
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return null;
  }
}

export default async function CustomerDashboardPage() {
  const authContext = await getServerAuthContext();
  if (!authContext.user) redirect(`${appRoutes.login}?next=/dashboard`);

  const user = authContext.user;
  const profile = authContext.profile;
  const displayName =
    profile?.full_name ??
    user.user_metadata?.full_name ??
    user.email?.split("@")[0] ??
    "Kullanıcı";
  const firstName = displayName.split(" ")[0];
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const requests = await getUserRequests(user.id);
  const pending = requests.filter((r) => (PENDING_STATUSES as string[]).includes(r.status));
  const assigned = requests.filter((r) => (ASSIGNED_STATUSES as string[]).includes(r.status));
  const accepted = requests.filter((r) => (ACCEPTED_STATUSES as string[]).includes(r.status));
  const rejected = requests.filter((r) => (REJECTED_STATUSES as string[]).includes(r.status));
  const completed = requests.filter((r) => (COMPLETED_STATUSES as string[]).includes(r.status));
  const cancelled = requests.filter((r) => (CANCELLED_STATUSES as string[]).includes(r.status));

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      {/* Top Bar */}
      <header className="border-b border-[var(--border)] bg-white">
        <Container className="flex h-14 items-center justify-between gap-4">
          <Link href={appRoutes.home}>
            <FuwuLogo size="sm" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-bold text-[var(--muted)] sm:block">
              {user.email}
            </span>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--muted)] transition hover:bg-[var(--surface-soft)]"
              >
                <LogOut className="size-3.5" />
                Çıkış
              </button>
            </form>
          </div>
        </Container>
      </header>

      <Container className="py-8 sm:py-10">
        {/* Hero Card */}
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-[var(--brand-navy)] px-6 py-7 shadow-[0_20px_60px_rgba(13,20,36,0.18)] sm:px-8">
          {/* decorative circles */}
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-10 right-24 size-40 rounded-full bg-[var(--brand-orange)]/10" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--brand-orange)] text-2xl font-black text-white shadow-[0_8px_24px_rgba(255,138,0,0.4)]">
                {avatarLetter}
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/50">
                  Hesabım
                </p>
                <h1 className="mt-1 text-2xl font-black text-white">
                  Merhaba, {firstName} 👋
                </h1>
                <p className="mt-0.5 text-sm font-semibold text-white/60">{user.email}</p>
              </div>
            </div>
            <Link
              href={appRoutes.request}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand-orange)] px-5 py-3 text-sm font-black text-white shadow-[0_8px_24px_rgba(255,138,0,0.35)] transition hover:-translate-y-0.5 hover:bg-orange-500"
            >
              <Plus className="size-4" />
              Yeni Talep Oluştur
            </Link>
          </div>

          {/* Stats row */}
          <div className="relative mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
            {[
              { label: "Bekleyen", value: pending.length, color: "text-amber-300" },
              { label: "Atanan", value: assigned.length, color: "text-blue-300" },
              { label: "Toplam Talep", value: requests.length, color: "text-white" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-white/40">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Demo / empty state */}
        {!isSupabaseServerConfigured ? (
          <EmptyState
            icon={<AlertCircle className="size-7 text-[var(--brand-orange)]" />}
            title="Sistem bağlantısı henüz kurulmadı"
            description="Supabase bağlantısı aktif olduğunda talep geçmişin burada görünecek. Şimdilik talep oluşturabilir veya ustaları inceleyebilirsin."
            actions={
              <>
                <Link href={appRoutes.request} className={primaryBtn}>
                  Talep Oluştur
                </Link>
                <Link href={appRoutes.providers} className={secondaryBtn}>
                  Ustaları İncele
                </Link>
              </>
            }
          />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-7 text-[var(--brand-orange)]" />}
            title="Henüz hiç talep yok"
            description="İlk talebini oluştur, uygun ustayla eşleş. Tüm talepleriniz burada takip edilir."
            actions={
              <>
                <Link href={appRoutes.request} className={primaryBtn}>
                  İlk Talebimi Oluştur
                </Link>
                <Link href={appRoutes.providers} className={secondaryBtn}>
                  Ustaları Gözat
                </Link>
              </>
            }
          />
        ) : (
          <div className="space-y-6">
            <RequestsOverview
              acceptedCount={accepted.length}
              assignedCount={assigned.length}
              cancelledCount={cancelled.length}
              completedCount={completed.length}
              pendingCount={pending.length}
              rejectedCount={rejected.length}
            />
            {pending.length > 0 && (
              <RequestSection title="Bekleyen Talepler" count={pending.length} countColor="bg-amber-100 text-amber-700" requests={pending} />
            )}
            {assigned.length > 0 && (
              <RequestSection title="Atanan Talepler" count={assigned.length} countColor="bg-blue-100 text-blue-700" requests={assigned} />
            )}
            {accepted.length > 0 && (
              <RequestSection title="Kabul Edilenler" count={accepted.length} countColor="bg-sky-100 text-sky-700" requests={accepted} />
            )}
            {rejected.length > 0 && (
              <RequestSection title="Reddedilenler" count={rejected.length} countColor="bg-red-100 text-red-600" requests={rejected} />
            )}
            {completed.length > 0 && (
              <RequestSection title="Tamamlananlar" count={completed.length} countColor="bg-emerald-100 text-emerald-700" requests={completed} />
            )}
            {cancelled.length > 0 && (
              <RequestSection title="İptal Edilenler" count={cancelled.length} countColor="bg-red-100 text-red-600" requests={cancelled} />
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <QuickLink
            href={appRoutes.providers}
            label="Ustaları İncele"
            desc="Kategoriye ve ilçeye göre filtrele"
            Icon={Wrench}
          />
          <QuickLink
            href={appRoutes.request}
            label="Yeni Talep Oluştur"
            desc="Hizmet talebi oluştur ve uygun ustayı bul"
            Icon={Plus}
          />
        </div>
      </Container>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const primaryBtn =
  "inline-flex items-center justify-center rounded-xl bg-[var(--brand-orange)] px-5 py-3 text-sm font-black text-white shadow-[0_8px_24px_rgba(255,138,0,0.28)] transition hover:-translate-y-0.5 hover:bg-orange-500";
const secondaryBtn =
  "inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-black text-[var(--brand-navy)] transition hover:bg-[var(--surface-soft)]";

function EmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white px-6 py-12 text-center shadow-[0_8px_32px_rgba(13,20,36,0.05)]">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[var(--brand-orange-soft)]">
        {icon}
      </div>
      <h2 className="text-lg font-black text-[var(--brand-navy)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-[var(--muted)]">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>
    </div>
  );
}

function RequestsOverview({
  acceptedCount,
  assignedCount,
  cancelledCount,
  completedCount,
  pendingCount,
  rejectedCount,
}: {
  acceptedCount: number;
  assignedCount: number;
  cancelledCount: number;
  completedCount: number;
  pendingCount: number;
  rejectedCount: number;
}) {
  const items = [
    { label: "Pending", value: pendingCount, className: "bg-amber-50 text-amber-700 ring-amber-200" },
    { label: "Assigned", value: assignedCount, className: "bg-blue-50 text-blue-700 ring-blue-200" },
    { label: "Accepted", value: acceptedCount, className: "bg-sky-50 text-sky-700 ring-sky-200" },
    { label: "Rejected", value: rejectedCount, className: "bg-red-50 text-red-600 ring-red-200" },
    { label: "Completed", value: completedCount, className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    { label: "Cancelled", value: cancelledCount, className: "bg-red-50 text-red-600 ring-red-200" },
  ];

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[0_8px_32px_rgba(13,20,36,0.05)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[var(--brand-orange-dark)]">
            Requests
          </p>
          <h2 className="mt-1 text-lg font-black text-[var(--brand-navy)]">
            Talep Durumları
          </h2>
        </div>
        <Link href={appRoutes.dashboardRequests} className="text-xs font-black text-[var(--brand-orange-dark)]">
          Tümünü gör
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <div
            className={`rounded-xl px-3 py-4 text-center ring-1 ${item.className}`}
            key={item.label}
          >
            <p className="text-2xl font-black">{item.value}</p>
            <p className="mt-1 text-[11px] font-black uppercase tracking-wide">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RequestSection({
  title,
  count,
  countColor,
  requests,
}: {
  title: string;
  count: number;
  countColor: string;
  requests: ServiceRequest[];
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-black uppercase tracking-wide text-[var(--brand-navy)]">
          {title}
        </h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-black ${countColor}`}>
          {count}
        </span>
      </div>
      <div className="grid gap-3">
        {requests.map((r) => (
          <RequestCard key={r.id} request={r} />
        ))}
      </div>
    </section>
  );
}

function RequestCard({ request }: { request: ServiceRequest }) {
  const cfg = getStatusConfig(request.status);
  const StatusIcon = cfg.Icon;
  const category =
    (request.service_categories as { name?: string } | null)?.name ?? "Hizmet Talebi";
  const district = (request.districts as { name?: string } | null)?.name ?? null;
  const date = formatDate(request.created_at);
  const isEmergency = request.urgency_type === "emergency";

  return (
    <div className="group flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-white p-5 shadow-[0_4px_16px_rgba(13,20,36,0.04)] transition hover:shadow-[0_8px_28px_rgba(13,20,36,0.08)] sm:flex-row sm:items-start sm:justify-between">
      {/* Left */}
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-orange-soft)]">
          <Wrench className="size-4 text-[var(--brand-orange)]" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-black text-[var(--brand-navy)]">{category}</p>
            {isEmergency && (
              <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-black uppercase text-red-600 ring-1 ring-red-200">
                Acil
              </span>
            )}
          </div>
          {request.description && (
            <p className="mt-1 line-clamp-1 text-sm text-[var(--muted)]">
              {request.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[var(--muted)]">
            {district && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {district}
              </span>
            )}
            {date && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {date}
              </span>
            )}
            {request.confirmation_code && (
              <span className="rounded-md bg-[var(--surface-soft)] px-1.5 py-0.5 font-black text-[var(--brand-navy)]">
                #{request.confirmation_code}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right — status badge */}
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-black ring-1 ${cfg.bg} ${cfg.color} ${cfg.ring}`}
      >
        <StatusIcon className="size-3.5" />
        {cfg.label}
      </span>
    </div>
  );
}

function QuickLink({
  href,
  label,
  desc,
  Icon,
}: {
  href: string;
  label: string;
  desc: string;
  Icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-[var(--border)] bg-white p-4 transition hover:border-[rgba(255,138,0,0.4)] hover:shadow-[0_8px_24px_rgba(13,20,36,0.07)]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-orange-soft)] text-[var(--brand-orange)] transition group-hover:bg-[var(--brand-orange)] group-hover:text-white">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="font-black text-[var(--brand-navy)]">{label}</p>
        <p className="mt-0.5 text-xs font-semibold text-[var(--muted)]">{desc}</p>
      </div>
      <ChevronRight className="ml-auto size-4 shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5" />
    </Link>
  );
}
