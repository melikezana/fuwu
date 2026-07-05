"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { GalleryImage } from "@/services/providers/gallery";

type GalleryLightboxProps = {
  images: GalleryImage[];
  initialIndex: number;
  onClose: () => void;
};

export function GalleryLightbox({
  images,
  initialIndex,
  onClose,
}: GalleryLightboxProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const imageCount = images.length;
  const activeImage = images[activeIndex] ?? images[0];

  const showPrevious = useCallback(() => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? imageCount - 1 : currentIndex - 1,
    );
  }, [imageCount]);

  const showNext = useCallback(() => {
    setActiveIndex((currentIndex) =>
      currentIndex === imageCount - 1 ? 0 : currentIndex + 1,
    );
  }, [imageCount]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft") {
        showPrevious();
      }

      if (event.key === "ArrowRight") {
        showNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, showNext, showPrevious]);

  if (!activeImage) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(24,32,51,0.92)] px-4 py-6"
      onClick={onClose}
      role="dialog"
    >
      <button
        aria-label="Galeriyi kapat"
        className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/40 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--brand-navy)]"
        onClick={onClose}
        type="button"
      >
        <X className="size-5" aria-hidden />
      </button>

      {imageCount > 1 ? (
        <button
          aria-label="Önceki görsel"
          className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/40 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--brand-navy)] sm:left-6"
          onClick={(event) => {
            event.stopPropagation();
            showPrevious();
          }}
          type="button"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </button>
      ) : null}

      <div
        className="flex max-h-[88vh] w-full max-w-4xl flex-col items-center gap-3 rounded-2xl bg-white/5 p-3 backdrop-blur"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-[68vh] max-h-[44rem] w-full">
          <Image
            alt={activeImage.caption ?? "Galeri görseli"}
            className="object-contain"
            fill
            sizes="(min-width: 1024px) 896px, 94vw"
            src={activeImage.publicUrl}
          />
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-2 px-1 text-sm font-semibold text-white">
          <p className="min-w-0 flex-1 truncate">
            {activeImage.caption ?? ""}
          </p>
          <p className="shrink-0">
            {activeIndex + 1}/{imageCount}
          </p>
        </div>
      </div>

      {imageCount > 1 ? (
        <button
          aria-label="Sonraki görsel"
          className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/40 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--brand-navy)] sm:right-6"
          onClick={(event) => {
            event.stopPropagation();
            showNext();
          }}
          type="button"
        >
          <ChevronRight className="size-6" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
