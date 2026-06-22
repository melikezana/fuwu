"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { submitProviderReviewAction } from "@/app/providers/[id]/actions";
import { Button } from "@/components/ui/Button";

type ReviewFormProps = {
  providerId: string;
};

export function ReviewForm({ providerId }: ReviewFormProps) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (rating === 0) {
      setMessage("Lütfen 1 ile 5 arasında bir puan seç.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitProviderReviewAction({
        comment,
        providerId,
        rating,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setComment("");
      setRating(0);
      setSubmitted(true);
      setMessage("Yorumun yayınlandı. Teşekkürler!");
      router.refresh();
    } catch {
      setMessage("Yorumun gönderilemedi. Lütfen tekrar dene.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4 sm:p-5"
      onSubmit={handleSubmit}
    >
      <div>
        <p className="text-sm font-bold text-[var(--brand-navy)]">
          Hizmeti değerlendir
        </p>
        <div
          aria-label="Puan seç"
          className="mt-3 flex items-center gap-1"
          role="group"
        >
          {Array.from({ length: 5 }, (_, index) => {
            const value = index + 1;
            const selected = value <= rating;

            return (
              <button
                aria-label={`${value} yıldız`}
                aria-pressed={rating === value}
                className="rounded-md p-1.5 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)]"
                disabled={isSubmitting || submitted}
                key={value}
                onClick={() => setRating(value)}
                type="button"
              >
                <Star
                  aria-hidden="true"
                  className={
                    selected
                      ? "size-7 fill-[var(--brand-orange)] text-[var(--brand-orange)]"
                      : "size-7 text-[var(--muted)]"
                  }
                />
              </button>
            );
          })}
        </div>
      </div>

      <label className="mt-4 block text-sm font-bold text-[var(--brand-navy)]">
        Yorumun
        <textarea
          className="mt-2 min-h-28 w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-sm font-medium leading-6 text-[var(--brand-navy)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[rgba(255,138,0,0.18)]"
          disabled={isSubmitting || submitted}
          maxLength={1000}
          minLength={10}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Ustanın iletişimini, zamanlamasını ve iş kalitesini anlat."
          required
          value={comment}
        />
      </label>

      {message ? (
        <p
          className={
            submitted
              ? "mt-3 rounded-md bg-[var(--trust-green-soft)] px-3 py-2 text-sm font-bold text-[var(--trust-green)]"
              : "mt-3 rounded-md bg-[var(--brand-orange-soft)] px-3 py-2 text-sm font-bold text-[var(--brand-navy)]"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}

      <Button
        className="mt-4 w-full bg-[var(--trust-green)] hover:bg-[var(--trust-green)] sm:w-fit"
        disabled={isSubmitting || submitted}
        type="submit"
      >
        {isSubmitting
          ? "Gönderiliyor"
          : submitted
            ? "Yorum gönderildi"
            : "Yorumu Gönder"}
      </Button>
    </form>
  );
}
