import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { EmptyAdminState } from "@/components/admin/EmptyAdminState";
import { getAdminAccess } from "@/services/admin";
import { getAdminReviews } from "@/services/admin/sections";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { ReviewActions } from "./ReviewActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yorumlar | Admin",
  description: "Fuwu müşteri yorumları görünümü.",
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} yıldız`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          className={
            n <= rating
              ? "h-4 w-4 fill-[var(--brand-orange)] text-[var(--brand-orange)]"
              : "h-4 w-4 text-[var(--border)]"
          }
          key={n}
          aria-hidden
        />
      ))}
    </span>
  );
}

export default async function AdminReviewsPage() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.ok && adminAccess.reason === "missing-session") {
    redirect(buildLoginRedirectUrl("/admin/reviews"));
  }
  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const { rows, error } = await getAdminReviews();

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
        active="reviews"
        breadcrumbLabel="Yorumlar"
        description="Müşterilerin ustalara bıraktığı değerlendirmeleri incele."
        error={error}
        title="Yorumlar"
      >
        {rows.length === 0 ? (
          <EmptyAdminState message="Henüz yorum bulunmuyor." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-[var(--border)]">
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">Puan</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">Yorum</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">Usta</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">Müşteri</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">Tarih</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[var(--muted)]">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((review) => (
                  <tr
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)]"
                    key={review.id}
                  >
                    <td className="px-4 py-3">
                      <Stars rating={review.rating} />
                    </td>
                    <td className="max-w-md px-4 py-3 text-sm text-[var(--brand-navy)]">
                      {review.comment?.trim() || <span className="text-[var(--muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--brand-navy)]">
                      {review.providerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--brand-navy)]">
                      {review.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted)]">
                      {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3">
                      <ReviewActions reviewId={review.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPageShell>
    </AdminAccessGate>
  );
}
