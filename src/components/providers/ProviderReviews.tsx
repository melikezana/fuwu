import { MessageSquareText, Star } from "lucide-react";
import { ReviewForm } from "@/components/providers/ReviewForm";
import { Button } from "@/components/ui/Button";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import type {
  ProviderReview,
  ProviderReviewSource,
  ProviderReviewSummary,
} from "@/services/reviews";

type ProviderReviewsProps = {
  isAuthenticated: boolean;
  providerId: string;
  reviews: ProviderReview[];
  source: ProviderReviewSource;
  summary: ProviderReviewSummary;
};

function formatRating(value: number) {
  return value.toLocaleString("tr-TR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
}

function formatReviewDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function RatingStars({ rating }: { rating: number }) {
  const filledStars = Math.round(rating);

  return (
    <span
      aria-label={`${formatRating(rating)} puan`}
      className="inline-flex items-center gap-1"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          aria-hidden="true"
          className={
            index < filledStars
              ? "size-4 shrink-0 fill-[var(--brand-orange)] text-[var(--brand-orange)]"
              : "size-4 shrink-0 text-[#D8DEE8]"
          }
          key={index}
        />
      ))}
    </span>
  );
}

export function ProviderReviews({
  isAuthenticated,
  providerId,
  reviews,
  source,
  summary,
}: ProviderReviewsProps) {
  return (
    <section
      className="scroll-mt-24 rounded-lg bg-white p-5 shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6"
      id="reviews"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-[var(--brand-orange-dark)]">
            Yorumlar
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--brand-navy)]">
            Müşteri değerlendirmeleri
          </h2>
        </div>
        {!isAuthenticated ? (
          <Button
            className="w-full sm:w-fit"
            href={buildLoginRedirectUrl(`/providers/${providerId}#reviews`)}
            variant="secondary"
          >
            Yorum yazmak için giriş yap
          </Button>
        ) : null}
      </div>

      {isAuthenticated ? (
        <div className="mt-5">
          <ReviewForm providerId={providerId} />
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="rounded-md bg-[var(--surface-soft)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-[var(--muted)]">
                Ortalama puan
              </p>
              <p className="mt-2 text-4xl font-bold leading-none text-[var(--brand-navy)]">
                {formatRating(summary.averageRating)}
              </p>
            </div>
            <span className="rounded-md bg-white px-3 py-1.5 text-xs font-bold leading-5 text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.08)]">
              {source === "supabase" ? "Canlı yorumlar" : "Örnek yorumlar"}
            </span>
          </div>
          <div className="mt-4">
            <RatingStars rating={summary.averageRating} />
          </div>
          <p className="mt-3 text-sm font-bold text-[var(--muted)]">
            {summary.reviewCount} yorum
          </p>
        </div>

        <div className="grid gap-3">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <article
                className="rounded-md border border-[var(--border)] bg-white p-4"
                key={review.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--brand-navy)] text-white">
                      <MessageSquareText
                        aria-hidden="true"
                        className="size-4"
                      />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[var(--brand-navy)]">
                        {formatRating(review.rating)}
                      </p>
                      <RatingStars rating={review.rating} />
                    </div>
                  </div>
                  <time
                    className="text-xs font-bold uppercase text-[var(--muted)]"
                    dateTime={review.createdAt}
                  >
                    {formatReviewDate(review.createdAt)}
                  </time>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
                  {review.comment}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-[var(--border)] bg-white p-5 text-sm font-bold text-[var(--muted)]">
              Henüz yorum yok.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
