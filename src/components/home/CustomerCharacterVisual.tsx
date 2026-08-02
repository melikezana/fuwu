"use client";

import dynamic from "next/dynamic";
import { homeAssets } from "@/lib/home-assets";
import { cn } from "@/lib/utils";

const HomeCharacterModelCanvas = dynamic(
  () =>
    import("@/components/home/HomeCharacterModelCanvas").then(
      (mod) => mod.HomeCharacterModelCanvas,
    ),
  {
    loading: () => null,
    ssr: false,
  },
);

export function CustomerCharacterVisual({ className }: { className?: string }) {
  return (
    <HomeCharacterModelCanvas
      className={cn("rounded-md", className)}
      label="Fuwu hizmet arayan modeli"
      modelPath={homeAssets.models.customer}
      tone="customer"
    />
  );
}
