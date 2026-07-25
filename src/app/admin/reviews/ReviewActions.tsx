"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteReviewAction } from "./actions";

export function ReviewActions({ reviewId }: { reviewId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setFeedback(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("reviewId", reviewId);
      const result = await deleteReviewAction(formData);
      if (!result.ok) {
        setFeedback(result.message);
        setConfirming(false);
      }
    });
  }

  if (feedback) {
    return <span className="text-xs font-semibold text-red-600">{feedback}</span>;
  }

  if (!confirming) {
    return (
      <button
        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
        onClick={() => setConfirming(true)}
        type="button"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Sil
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-xs font-semibold text-[var(--brand-navy)]">Emin misin?</span>
      <button
        className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        disabled={pending}
        onClick={handleDelete}
        type="button"
      >
        {pending ? "Siliniyor…" : "Evet, sil"}
      </button>
      <button
        className="rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--brand-navy)]"
        disabled={pending}
        onClick={() => setConfirming(false)}
        type="button"
      >
        Vazgeç
      </button>
    </span>
  );
}
