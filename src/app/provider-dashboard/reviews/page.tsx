import type { Metadata } from "next";
import { Star, MessageSquare } from "lucide-react";
import { ProviderDashboardShell, ProviderStatusBadge } from "@/components/dashboard/ProviderDashboardUI";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";
import { getServerAuthContext } from "@/services/auth/server";
import { getProviderReviews } from "@/services/reviews";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Değerlendirmeler | Usta Paneli" };

const MOCK_REVIEWS = [
  { id: "1", rating: 5, comment: "Çok hızlı geldi, işi temiz ve titiz yaptı. Kesinlikle tavsiye ederim.", createdAt: "2026-06-20T10:30:00Z" },
  { id: "2", rating: 5, comment: "Randevu saatine tam zamanında geldi. Profesyonel bir usta.", createdAt: "2026-06-15T14:20:00Z" },
  { id: "3", rating: 4, comment: "İyi iş çıkardı, fiyat biraz yüksekti ama kaliteli hizmet.", createdAt: "2026-06-10T09:15:00Z" },
  { id: "4", rating: 5, comment: "Tesisat sorununu kısa sürede çözdü. Çalışma alanını da temiz bıraktı.", createdAt: "2026-06-05T16:45:00Z" },
  { id: "5", rating: 4, comment: "Genel olarak memnunum. Bir dahaki seferde tekrar tercih ederim.", createdAt: "2026-05-28T11:00:00Z" },
  { id: "6", rating: 5, comment: "Acil çağrıya hemen yanıt verdi. Çok yardımsever.", createdAt: "2026-05-20T08:30:00Z" },
  { id: "7", rating: 3, comment: "İş tamam ama biraz geç geldi.", createdAt: "2026-05-10T15:00:00Z" },
  { id: "8", rating: 5, comment: "Harika usta! Her şeyi mükemmel anlattı ve düzeltti.", createdAt: "2026-04-25T13:20:00Z" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((star) => (
        <Star key={star} className={`h-4 w-4 ${star <= rating ? "fill-[var(--brand-orange)] text-[var(--brand-orange)]" : "fill-none text-[var(--border-strong)]"}`} aria-hidden />
      ))}
    </div>
  );
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-4 text-right text-sm font-semibold text-[var(--brand-navy)]">{star}</span>
      <Star className="h-3.5 w-3.5 fill-[var(--brand-orange)] text-[var(--brand-orange)]" aria-hidden />
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <div className="h-full rounded-full bg-[var(--brand-orange)] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-xs font-semibold text-[var(--muted)]">{count} ({pct}%)</span>
    </div>
  );
}

export default async function ProviderReviewsPage() {
  const [providerAccess, authContext] = await Promise.all([
    getProviderDashboardAccess(),
    getServerAuthContext(),
  ]);

  const liveResult = providerAccess.ok && authContext.supabase
    ? await getProviderReviews(providerAccess.profile.id)
    : null;

  const reviews = liveResult?.reviews ?? MOCK_REVIEWS;
  const summary = liveResult?.summary ?? { averageRating: 4.7, reviewCount: 23 };
  const providerName = providerAccess.ok ? providerAccess.profile.name : "Demo Usta";
  const starCounts = [5,4,3,2,1].map((star) => ({ star, count: reviews.filter((r) => Math.round(r.rating) === star).length }));

  return (
    <ProviderDashboardShell
      active="reviews"
      description="Müşteri değerlendirmelerini incele ve puan geçmişini takip et."
      providerName={providerName}
      statusLabel={providerAccess.ok ? "Usta hesabınız aktif" : "Demo modu"}
      statusTone={providerAccess.ok ? "green" : "orange"}
      title="Değerlendirmeler"
    >
      <div className="grid gap-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          📊 {liveResult ? "Gerçek veriler gösteriliyor." : "Demo veriler gösteriliyor. Usta hesabı ile giriş yapıldığında gerçek veriler görünür."}
        </div>
        <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
          <section className="rounded-lg border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-card)]">
            <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">Puan özeti</p>
            <div className="mt-4 flex items-end gap-4">
              <span className="text-5xl font-bold text-[var(--brand-navy)]">{summary.averageRating.toFixed(1)}</span>
              <div className="pb-1">
                <StarRating rating={Math.round(summary.averageRating)} />
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{summary.reviewCount} değerlendirme</p>
              </div>
            </div>
            <div className="mt-6 grid gap-2">
              {starCounts.map(({ star, count }) => <RatingBar key={star} count={count} star={star} total={reviews.length} />)}
            </div>
            <div className="mt-6 rounded-lg border border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] p-4 text-center">
              <p className="text-xs font-medium uppercase text-[var(--trust-green)]">Başarı rozeti</p>
              <p className="mt-2 text-2xl font-bold text-[var(--brand-navy)]">⭐ Üst Usta</p>
              <p className="mt-1 text-sm font-semibold text-[var(--muted)]">4.5+ puan ortalaması</p>
            </div>
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
              <div className="mt-4 grid gap-3 max-h-[500px] overflow-y-auto pr-1">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <StarRating rating={review.rating} />
                      <span className="text-xs font-semibold text-[var(--muted)]">{formatReviewDate(review.createdAt)}</span>
                    </div>
                    {review.comment && <p className="mt-3 text-sm font-semibold leading-6 text-[var(--brand-navy)]">&quot;{review.comment}&quot;</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-[var(--brand-orange-soft)] flex items-center justify-center text-xs font-bold text-[var(--brand-orange-dark)]">M</div>
                      <span className="text-xs font-semibold text-[var(--muted)]">Doğrulanmış Müşteri</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-[rgba(255,138,0,0.38)] bg-[var(--brand-orange-soft)] p-6 text-center" role="status">
                <MessageSquare className="mx-auto h-8 w-8 text-[var(--brand-orange-dark)]" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-[var(--brand-navy)]">Henüz değerlendirme yok.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </ProviderDashboardShell>
  );
}
