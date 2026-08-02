"use client";

import Image from "next/image";
import { useState } from "react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import type { ServiceIconName } from "@/lib/constants/services";
import type { HomeAssetPath } from "@/lib/home-assets";
import { cn } from "@/lib/utils";

type HomeAssetImageProps = {
  alt: string;
  className?: string;
  imageClassName?: string;
  fallbackIconName?: ServiceIconName;
  priority?: boolean;
  sizes?: string;
  src: HomeAssetPath | null;
  width?: number;
  height?: number;
};

const warnedMissingAssets = new Set<string>();

function warnMissingAsset(src: string) {
  if (warnedMissingAssets.has(src)) {
    return;
  }

  warnedMissingAssets.add(src);
  console.warn(`[Fuwu homepage] Missing public asset "${src}". Showing neutral placeholder.`);
}

function HomeNeutralAssetPlaceholder({ iconName }: { iconName?: ServiceIconName }) {
  if (iconName === "furniture-tool") {
    return (
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-[linear-gradient(145deg,#fff8ed_0%,#fffdf8_58%,#eef3f8_100%)] ring-1 ring-[rgba(10,37,64,0.06)]">
        <span className="absolute inset-x-[18%] bottom-[20%] h-px bg-[rgba(10,37,64,0.12)]" />
        <span className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[18px] bg-white/84 text-[var(--brand-navy)] shadow-[0_18px_42px_rgba(10,37,64,0.12)] ring-1 ring-[rgba(10,37,64,0.08)]">
          <ServiceIcon className="size-10" name="furniture-tool" />
        </span>
        <span className="absolute right-[24%] top-[27%] size-2 rounded-full bg-[var(--brand-orange)] shadow-[0_0_0_5px_rgba(255,101,0,0.12)]" />
        <span className="absolute right-[19%] top-[38%] h-6 w-1.5 rotate-45 rounded-full bg-[var(--brand-orange)]" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_58%,#eef3f8_100%)] ring-1 ring-[rgba(10,37,64,0.06)]">
      <span className="absolute inset-x-[18%] top-[30%] h-px bg-[rgba(10,37,64,0.12)]" />
      <span className="absolute inset-x-[24%] top-[48%] h-px bg-[rgba(255,101,0,0.22)]" />
      <span className="absolute inset-x-[18%] top-[66%] h-px bg-[rgba(10,37,64,0.08)]" />
      <span className="absolute inset-[17%] rounded-md border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]" />
    </div>
  );
}

export function HomeAssetImage({
  alt,
  className,
  fallbackIconName,
  height = 1024,
  imageClassName,
  priority = false,
  sizes = "100vw",
  src,
  width = 1024,
}: HomeAssetImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const shouldShowImage = Boolean(src && failedSrc !== src);

  return (
    <div
      aria-label={!shouldShowImage && alt ? alt : undefined}
      className={cn("relative block overflow-hidden", className)}
      role={!shouldShowImage && alt ? "img" : undefined}
    >
      {src && failedSrc !== src ? (
        <Image
          alt={alt}
          className={cn("h-full w-full object-contain", imageClassName)}
          height={height}
          onError={() => {
            warnMissingAsset(src);
            setFailedSrc(src);
          }}
          priority={priority}
          sizes={sizes}
          src={src}
          width={width}
        />
      ) : (
        <HomeNeutralAssetPlaceholder iconName={fallbackIconName} />
      )}
    </div>
  );
}
