"use client";

import Image from "next/image";
import { useState } from "react";
import { GalleryLightbox } from "@/components/providers/GalleryLightbox";
import type { GalleryImage } from "@/services/providers/gallery";

type ProviderGalleryGridProps = {
  images: GalleryImage[];
  providerName: string;
};

export function ProviderGalleryGrid({
  images,
  providerName,
}: ProviderGalleryGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {images.map((image, index) => (
          <button
            aria-label={`${providerName} galeri görselini aç`}
            className="group relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            key={image.id}
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            <Image
              alt={image.caption ?? `${providerName} iş görseli`}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              src={image.publicUrl}
            />
            {image.caption ? (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                <p className="truncate text-left text-xs font-medium text-white">
                  {image.caption}
                </p>
              </div>
            ) : null}
          </button>
        ))}
      </div>

      {activeIndex !== null ? (
        <GalleryLightbox
          images={images}
          initialIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
        />
      ) : null}
    </>
  );
}
