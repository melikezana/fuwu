import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextLink } from "@/components/ui/TextLink";
import {
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUSES,
  normalizeServiceRequestStatus,
} from "@/lib/constants/statuses";
import { appRoutes, buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { getServerAuthContext, type ServerAuthContext } from "@/services/auth/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hesabım | Fuwu",
  description: "Fuwu profilini, hızlı işlemlerini ve son taleplerini takip et.",
};

type UserProfile = {
  avatar_url?: string;
  created_at?: string;
  email?: string;
  full_name?: string;
  id: string;
};

type ServiceRequest = {
  created_at: string | null;
  description: string | null;
  districts: { name: string } | null;
  id: string;
  service_categories: { name: string } | null;
  status: string;
  urgency_type: string | null;
};

const STATUS_CLASS_NAMES: Record<string, string> = {
  [SERVICE_REQUEST_STATUSES.pending]: "bg-amber-50 text-amber-700 border-amber-200",
  [SERVICE_REQUEST_STATUSES.assigned]: "bg-blue-50 text-blue-700 border-blue-200",
  [SERVICE_REQUEST_STATUSES.accepted]: "bg-blue-50 text-blue-700 border-blue-200",
  [SERVICE_REQUEST_STATUSES.rejected]: "bg-red-50 text-red-600 border-red-200",
  [SERVICE_REQUEST_STATUSES.inProgress]: "bg-blue-50 text-blue-700 border-blue-200",
  [SERVICE_REQUEST_STATUSES.completed]: "bg-emerald-50 text-emerald-700 border-emerald-200",
  [SERVICE_REQUEST_STATUSES.cancelled]: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

function getAccountStatusView(status: string) {
  const normalizedStatus = normalizeServiceRequestStatus(status);

  if (normalizedStatus === SERVICE_REQUEST_STATUSES.assigned) {
    return {
      label: "Usta atandı. Yanıt bekleniyor.",
      cls: STATUS_CLASS_NAMES[SERVICE_REQUEST_STATUSES.assigned],
    };
  }

  if (normalizedStatus === SERVICE_REQUEST_STATUSES.accepted) {
    return {
      label: "Usta talebini kabul etti.",
      cls: STATUS_CLASS_NAMES[SERVICE_REQUEST_STATUSES.accepted],
    };
  }

  if (normalizedStatus === SERVICE_REQUEST_STATUSES.rejected) {
    return {
      label: "Usta talebi reddetti. Yeni eşleşme bekleniyor.",
      cls: STATUS_CLASS_NAMES[SERVICE_REQUEST_STATUSES.rejected],
    };
  }

  return normalizedStatus
    ? {
        label: SERVICE_REQUEST_STATUS_LABELS[normalizedStatus],
        cls: STATUS_CLASS_NAMES[normalizedStatus],
      }
    : {
        label: status || SERVICE_REQUEST_STATUS_LABELS[SERVICE_REQUEST_STATUSES.pending],
        cls: STATUS_CLASS_NAMES[SERVICE_REQUEST_STATUSES.pending],
      };
}

function getMetadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getAuthMetadataName(metadata: Record<string, unknown> | undefined) {
  return getMetadataString(metadata, "full_name") ?? getMetadataString(metadata, "name");
}

async function getUserRequests(
  supabase: NonNullable<ServerAuthContext["supabase"]>,
  userId: string,
): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from("service_requests")
    .select("id, status, created_at, description, urgency_type, service_categories(name), districts(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) {
    return [];
  }

  return data as unknown as ServiceRequest[];
}

function initials(name?: string, email?: string) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return email?.[0]?.toUpperCase() ?? "?";
}

function formatDate(iso?: string | null) {
  if (!iso) {
    return "";
  }

  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getCategoryName(req: ServiceRequest) {
  return (req.service_categories as { name?: string } | null)?.name ?? "Hizmet Talebi";
}

function getDistrictName(req: ServiceRequest) {
  return (req.districts as { name?: string } | null)?.name ?? "";
}

export default async function AccountPage() {
  const authContext = await getServerAuthContext();

  if (!authContext.user || !authContext.supabase) {
    redirect(buildLoginRedirectUrl(appRoutes.account));
  }

  const fallbackFullName = getAuthMetadataName(authContext.user.user_metadata);
  const profile: UserProfile = {
    id: authContext.user.id,
    email: authContext.user.email ?? undefined,
    full_name: authContext.profile?.full_name ?? fallbackFullName,
    avatar_url: authContext.profile?.avatar_url ?? undefined,
    created_at: authContext.user.created_at,
  };
  const requests = await getUserRequests(authContext.supabase, authContext.user.id);

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-subtle)] sm:flex-row sm:items-center">
          {profile.avatar_url ? (
            <Image
              alt={profile.full_name ? `${profile.full_name} profil fotoğrafı` : "Profil fotoğrafı"}
              className="size-14 flex-shrink-0 rounded-full object-cover ring-2 ring-[var(--border)]"
              height={56}
              src={profile.avatar_url}
              width={56}
            />
          ) : (
            <div className="flex size-14 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-navy)] text-lg font-medium text-white">
              {initials(profile.full_name, profile.email)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {profile.full_name ? (
              <p className="truncate font-semibold text-[var(--brand-navy)]">{profile.full_name}</p>
            ) : null}
            <p className="truncate text-sm font-semibold text-[var(--muted)]">{profile.email}</p>
            {profile.created_at ? (
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Üye: {formatDate(profile.created_at)}
              </p>
            ) : null}
          </div>
          <form action="/api/auth/logout" className="w-full sm:w-auto" method="POST">
            <button
              className="inline-flex min-h-11 w-full flex-shrink-0 items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-bold text-[var(--muted)] transition hover:bg-[var(--surface-soft)] sm:w-auto"
              type="submit"
            >
              Çıkış Yap
            </button>
          </form>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {[
            {
              href: appRoutes.request,
              label: "Yeni Talep",
              sub: "Usta talep et",
              icon: <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />,
            },
            {
              href: appRoutes.providers,
              label: "Usta Bul",
              sub: "Profilleri gör",
              icon: <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />,
            },
            {
              href: appRoutes.accountApplications,
              label: "Başvurularım",
              sub: "Durumları takip et",
              icon: <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.6a1 1 0 01.7.3l4.4 4.4a1 1 0 01.3.7V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />,
            },
          ].map((item) => (
            <Link
              className="group flex items-center gap-3 rounded-xl border border-[var(--border)] p-4 transition hover:border-[rgba(255,138,0,0.5)] hover:bg-[var(--brand-orange-soft)]"
              href={item.href}
              key={item.href}
            >
              <span className="flex size-9 items-center justify-center rounded-xl border border-[var(--border)] bg-white transition group-hover:border-[rgba(255,138,0,0.4)] group-hover:text-[var(--brand-orange)]">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon}
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--brand-navy)]">{item.label}</p>
                <p className="truncate text-xs text-[var(--muted)]">{item.sub}</p>
              </div>
            </Link>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Taleplerim
            </h2>
            <TextLink className="text-xs font-semibold" href={appRoutes.request}>
              + Yeni
            </TextLink>
          </div>

          {requests.length === 0 ? (
            <div className="space-y-3 rounded-xl border border-dashed border-[var(--border)] px-6 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--brand-navy)]">Henüz talep oluşturmadın.</p>
              <p className="text-xs text-[var(--muted)]">Hizmet ihtiyacını tarif et, uygun ustalarla eşleş.</p>
              <Button
                href={appRoutes.request}
              >
                İlk Talebini Oluştur
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => {
                const statusView = getAccountStatusView(req.status);
                const isEmergency = req.urgency_type === "emergency";

                return (
                  <div
                    className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-white px-5 py-4 shadow-[var(--shadow-subtle)]"
                    key={req.id}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-[var(--brand-navy)]">{getCategoryName(req)}</p>
                        {isEmergency ? (
                          <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-red-200">
                            Acil
                          </span>
                        ) : null}
                      </div>
                      {getDistrictName(req) ? (
                        <p className="text-xs text-[var(--muted)]">{getDistrictName(req)}</p>
                      ) : null}
                      <p className="text-xs text-[var(--muted)]">{formatDate(req.created_at)}</p>
                    </div>
                    <span className={`inline-flex flex-shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusView.cls}`}>
                      {statusView.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-1 border-t border-[var(--border)] pt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            Yasal
          </p>
          {[
            { href: appRoutes.kvkk, label: "KVKK Aydınlatma Metni" },
            { href: appRoutes.privacy, label: "Gizlilik Politikası" },
            { href: appRoutes.terms, label: "Kullanım Şartları" },
            { href: appRoutes.cookies, label: "Çerez Politikası" },
          ].map((item) => (
            <Link
              className="group flex items-center justify-between rounded-xl px-4 py-3 transition hover:bg-[var(--surface-soft)]"
              href={item.href}
              key={item.href}
            >
              <span className="text-sm text-[var(--muted)] transition group-hover:text-[var(--brand-navy)]">
                {item.label}
              </span>
              <svg className="size-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
              </svg>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
