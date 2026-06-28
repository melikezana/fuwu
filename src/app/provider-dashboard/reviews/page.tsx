import type { Metadata } from "next";
import { MessageSquare, Star } from "lucide-react";
import {
  getProviderDashboardStatusBadgeView,
  ProviderDashboardRestrictedAreaEmptyState,
  ProviderDashboardShell,
  ProviderStatusBadge,
} from "@/components/dashboard/ProviderDashboardUI";
import { getServerAuthContext } from "@/services/auth/server";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";
import { getProviderReviews, type ProviderReviewSummary } from "@/services/reviews";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Değerlendirmeler | Usta Paneli",
};

const emptyReviewSummary: ProviderReviewSummary = {
  averageRating: 0,
  reviewCount: 0,
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          aria-hidden
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-[var(--brand-orange)] text-[var(--brand-orange)]"
              : "fill-none text-[var(--border-strong)]"
          }`}
          key={star}
        />
      ))}
    </div>
  );
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}

function RatingBar({
  count,
  star,
  total,
}: {
  count: number;
  star: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-4 text-right text-sm font-semibold text-[var(--brand-navy)]">{star}</span>
      <Star className="h-3.5 w-3.5 fill-[var(--brand-orange)] text-[var(--brand-orange)]" aria-hidden />
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <div className="h-full rounded-full bg-[var(--brand-orange)] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-xs font-semibold text-[var(--muted)]">
        {count} (%{pct})
      </span>
    </div>
  );
}

export default async function ProviderReviewsPage() {
  const [providerAccess] = await Promise.all([
    getProviderDashboardAccess(),
    getServerAuthContext(),
  ]);
  const statusBadge = getProviderDashboardStatusBadgeView(
    providerAccess.ok
      ? providerAccess.application?.status
      : providerAccess.applicationStatus,
    providerAccess.ok,
  );
  const liveResult = providerAccess.ok
    ? await getProviderReviews(providerAccess.profile.id)
    : null;
  const reviews = liveResult?.source === "supabase" ? liveResult.reviews : [];
  const summary = liveResult?.source === "supabase" ? liveResult.summary : emptyReviewSummary;
  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    count: reviews.filter((review) => Math.round(review.rating) === star).length,
    star,
  }));

  return (
    <ProviderDashboardShell
      active="reviews"
      description="Müşteri değerlendirmelerini incele ve puan geçmişini takip et."
      providerName={providerAccess.ok ? providerAccess.profile.name : undefined}
      statusLabel={statusBadge.label}
      statusTone={statusBadge.tone}
      title="Değerlendirmeler"
    >
      {providerAccess.ok ? (
        <div className="grid gap-6">
          <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
            <section className="rounded-lg border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">Puan özeti</p>
              <div className="mt-4 flex items-end gap-4">
                <span className="text-5xl font-bold text-[var(--brand-navy)]">
                  {summary.averageRating.toFixed(1)}
                </span>
                <div className="pb-1">
                  <StarRating rating={Math.round(summary.averageRating)} />
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                    {summary.reviewCount} değerlendirme
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-2">
                {starCounts.map(({ count, star }) => (
                  <RatingBar count={count} key={star} star={star} total={reviews.length} />
                ))}
              </div>
              {summary.reviewCount > 0 && summary.averageRating >= 4.5 ? (
                <div className="mt-6 rounded-lg border border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] p-4 text-center">
                  <p className="text-xs font-medium uppercase text-[var(--trust-green)]">Başarı rozeti</p>
                  <p className="mt-2 text-2xl font-bold text-[var(--brand-navy)]">Üst Usta</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">4.5+ puan ortalaması</p>
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div className="cursor-default select-none">
                  <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">Müşteri yorumları</p>
                  <h2 className="mt-2 text-xl font-bold text-[var(--brand-navy)]">Son değerlendirmeler</h2>
                </div>
                <ProviderStatusBadge tone="green">{reviews.length} yorum</ProviderStatusBadge>
              </div>
              {reviews.length > 0 ? (
                <div className="mt-4 grid max-h-[500px] gap-3 overflow-y-auto pr-1">
                  {reviews.map((review) => (
                    <article
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                      key={review.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <StarRating rating={review.rating} />
                        <span className="text-xs font-semibold text-[var(--muted)]">
                          {formatReviewDate(review.createdAt)}
                        </span>
                      </div>
                      {review.comment ? (
                        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--brand-navy)]">
                          &quot;{review.comment}&quot;
                        </p>
                      ) : null}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-orange-soft)] text-xs font-bold text-[var(--brand-orange-dark)]">
                          M
                        </div>
                        <span className="text-xs font-semibold text-[var(--muted)]">Doğrulanmış Müşteri</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div
                  className="mt-5 rounded-lg border border-dashed border-[rgba(255,138,0,0.38)] bg-[var(--brand-orange-soft)] p-6 text-center"
                  role="status"
                >
                  <MessageSquare className="mx-auto h-8 w-8 text-[var(--brand-orange-dark)]" aria-hidden />
                  <p className="mt-3 text-sm font-semibold text-[var(--brand-navy)]">Henüz değerlendirme yok.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      ) : (
        <ProviderDashboardRestrictedAreaEmptyState />
      )}
    </ProviderDashboardShell>
  );
}
