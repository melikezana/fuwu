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
    loading: () => (
      <div className="relative h-full min-h-[13.5rem] w-full overflow-hidden rounded-md bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_58%,#eef3f8_100%)] ring-1 ring-[rgba(10,37,64,0.06)]" />
    ),
    ssr: false,
  },
);

export function ProviderCharacterVisual({ className }: { className?: string }) {
  return (
    <HomeCharacterModelCanvas
      className={cn("rounded-md", className)}
      label="Fuwu usta modeli"
      modelPath={homeAssets.models.provider}
      tone="provider"
    />
  );
}
