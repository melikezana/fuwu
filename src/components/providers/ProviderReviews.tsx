"use client";

import { MessageSquareText, PenLine, Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { getSession } from "@/services/auth";
import type {
  ProviderReview,
  ProviderReviewSource,
  ProviderReviewSummary,
} from "@/services/reviews";

type ProviderReviewsProps = {
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
    <span className="inline-flex items-center gap-1" aria-label={`${formatRating(rating)} puan`}>
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

export function ProviderReviews({ reviews, source, summary }: ProviderReviewsProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(false);

  async function handleWriteReviewClick() {
    setIsCheckingSession(true);
    setNotice(null);

    try {
      const session = await getSession();

      if (!session) {
        setNotice("Yorum yazmak için giriş yapmalısın.");
        return;
      }

      setNotice("Yorum yazma alanı yakında açılacak.");
    } catch {
      setNotice("Yorum yazmak için giriş yapmalısın.");
    } finally {
      setIsCheckingSession(false);
    }
  }

  return (
    <section className="cursor-default select-none rounded-lg bg-white p-5 shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-[var(--brand-orange-dark)]">
            Yorumlar
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--brand-navy)]">
            Müşteri değerlendirmeleri
          </h2>
        </div>
        <Button
          className="w-full sm:w-fit"
          disabled={isCheckingSession}
          onClick={handleWriteReviewClick}
          type="button"
        >
          <PenLine aria-hidden="true" className="mr-2 size-4 shrink-0" />
          {isCheckingSession ? "Kontrol ediliyor" : "Yorum yaz"}
        </Button>
      </div>

      {notice ? (
        <p
          className="mt-4 rounded-md bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]"
          role="status"
        >
          {notice}
        </p>
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
                      <MessageSquareText aria-hidden="true" className="size-4" />
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
