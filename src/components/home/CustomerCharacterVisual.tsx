import Image from "next/image";
import { homeAssets } from "@/lib/home-assets";
import { cn } from "@/lib/utils";

export function CustomerCharacterVisual({ className }: { className?: string }) {
  return (
    <div
      className={cn("home-character-visual home-character-visual-ready premium-character-image", className)}
    >
      <Image
        alt="Fuwu hizmet arayan karakteri"
        className="h-full w-full select-none object-contain object-bottom md:object-right-bottom"
        draggable={false}
        fill
        priority
        quality={100}
        sizes="(min-width: 1200px) 330px, (min-width: 768px) 30vw, 78vw"
        src={homeAssets.characters.customer}
      />
    </div>
  );
}
