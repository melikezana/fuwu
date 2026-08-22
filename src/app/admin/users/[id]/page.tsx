import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { EmptyAdminState } from "@/components/admin/EmptyAdminState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getAdminAccess } from "@/services/admin";
import { getAdminUserDetail } from "@/services/admin/users";
import {
  SERVICE_REQUEST_STATUS_LABELS,
  normalizeServiceRequestStatus,
} from "@/lib/constants/statuses";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kullanıcı Detayı | Admin",
  description: "Kullanıcı profili, talepleri ve yorumları.",
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  customer: "Müşteri",
  provider: "Usta",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const adminAccess = await getAdminAccess();

  const { id } = await params;

  if (!adminAccess.ok && adminAccess.reason === "missing-session") {
    redirect(buildLoginRedirectUrl(`/admin/users/${id}`));
  }
  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const { profile, requests, reviews, error } = await getAdminUserDetail(id);

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
        active="users"
        breadcrumbLabel="Kullanıcı Detayı"
        description="Kullanıcının profili, hizmet talepleri ve yorumları."
        error={error}
        title={profile?.fullName?.trim() || "Kullanıcı Detayı"}
      >
        <Link
          className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--brand-orange-dark)] hover:underline md:min-h-0"
          href="/admin/users"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kullanıcılara dön
        </Link>

        {!profile ? (
          <EmptyAdminState message="Kullanıcı bulunamadı." />
        ) : (
          <div className="flex flex-col gap-6">
            <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--muted)]">İsim</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--brand-navy)]">
                    {profile.fullName?.trim() || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--muted)]">Telefon</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--brand-navy)]">
                    {profile.phone?.trim() || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--muted)]">Rol</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--brand-navy)]">
                    {roleLabels[profile.role] ?? profile.role}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--muted)]">Kayıt Tarihi</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--brand-navy)]">
                    {new Date(profile.createdAt).toLocaleDateString("tr-TR")}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="mb-4 text-lg font-bold text-[var(--brand-navy)]">
                Hizmet Talepleri ({requests.length})
              </h2>
              {requests.length === 0 ? (
                <EmptyAdminState message="Bu kullanıcının talebi yok." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-left">
                    <thead>
                      <tr className="border-b-2 border-[var(--border)]">
                        <th className="px-3 py-2 text-xs font-bold uppercase text-[var(--muted)]">Kategori</th>
                        <th className="px-3 py-2 text-xs font-bold uppercase text-[var(--muted)]">İlçe</th>
                        <th className="px-3 py-2 text-xs font-bold uppercase text-[var(--muted)]">Durum</th>
                        <th className="px-3 py-2 text-xs font-bold uppercase text-[var(--muted)]">Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => {
                        const normalized = normalizeServiceRequestStatus(request.status);
                        return (
                          <tr className="border-b border-[var(--border)] last:border-0" key={request.id}>
                            <td className="px-3 py-2 text-sm font-semibold text-[var(--brand-navy)]">
                              {request.category}
                            </td>
                            <td className="px-3 py-2 text-sm text-[var(--brand-navy)]">{request.district}</td>
                            <td className="px-3 py-2">
                              <StatusBadge
                                status={
                                  (normalized && SERVICE_REQUEST_STATUS_LABELS[normalized]) ||
                                  request.status
                                }
                                tone="info"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm text-[var(--muted)]">
                              {new Date(request.createdAt).toLocaleDateString("tr-TR")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="mb-4 text-lg font-bold text-[var(--brand-navy)]">
                Yorumları ({reviews.length})
              </h2>
              {reviews.length === 0 ? (
                <EmptyAdminState message="Bu kullanıcının yorumu yok." />
              ) : (
                <ul className="flex flex-col divide-y divide-[var(--border)]">
                  {reviews.map((review) => (
                    <li className="py-3" key={review.id}>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              className={
                                n <= review.rating
                                  ? "h-3.5 w-3.5 fill-[var(--brand-orange)] text-[var(--brand-orange)]"
                                  : "h-3.5 w-3.5 text-[var(--border)]"
                              }
                              key={n}
                              aria-hidden
                            />
                          ))}
                        </span>
                        <span className="text-sm font-semibold text-[var(--brand-navy)]">
                          {review.providerName}
                        </span>
                      </div>
                      {review.comment?.trim() ? (
                        <p className="mt-1 text-sm text-[var(--muted)]">{review.comment}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </AdminPageShell>
    </AdminAccessGate>
  );
}
