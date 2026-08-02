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

export function ProviderCharacterVisual({ className }: { className?: string }) {
  return (
    <HomeCharacterModelCanvas
      className={cn("premium-character-canvas", className)}
      label="Fuwu usta modeli"
      modelPath={homeAssets.models.provider}
      tone="provider"
    />
  );
}
