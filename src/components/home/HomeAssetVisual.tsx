"use client";

import { HomeAssetImage } from "@/components/home/HomeAssetImage";
import type { HomeAssetPath } from "@/lib/home-assets";
import type { ServiceIconName } from "@/lib/constants/services";

type HomeAssetVisualVariant =
  | "category"
  | "customer-character"
  | "hero-house"
  | "payment-lock-card"
  | "provider-character"
  | "security-lock";

type HomeAssetVisualProps = {
  accent?: string;
  alt?: string;
  className?: string;
  iconName?: ServiceIconName;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
  src: HomeAssetPath | null;
  variant: HomeAssetVisualVariant;
};

export function HomeAssetVisual({
  alt = "",
  className,
  imageClassName,
  priority = false,
  sizes = "100vw",
  src,
}: HomeAssetVisualProps) {
  return (
    <HomeAssetImage
      alt={alt}
      className={className}
      imageClassName={imageClassName}
      priority={priority}
      sizes={sizes}
      src={src}
    />
  );
}
