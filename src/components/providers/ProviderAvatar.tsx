import Image from "next/image";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { getProviderInitials } from "@/lib/constants/providers";
import { getServiceIconNameForCategory } from "@/lib/constants/services";
import { cn } from "@/lib/utils";
import type { Provider } from "@/types/provider";

type ProviderAvatarProps = {
  className?: string;
  previewUrl?: string;
  provider: Provider;
  variant?: "card" | "hero" | "profile";
};

export function ProviderAvatar({
  className,
  previewUrl,
  provider,
  variant = "card",
}: ProviderAvatarProps) {
  const isHeroVariant = variant === "hero";
  const isProfileVariant = variant === "profile";
  const sizeClassName = isHeroVariant
    ? "h-[180px] w-full"
    : isProfileVariant
      ? "h-24 w-24 sm:h-28 sm:w-28"
      : "size-16";
  const shapeClassName = isHeroVariant ? "rounded-t-2xl rounded-b-none" : "rounded-xl";
  const iconClassName = isHeroVariant ? "size-16" : isProfileVariant ? "size-9" : "size-6";
  const imageSizes = isHeroVariant
    ? "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
    : isProfileVariant
      ? "(min-width: 640px) 112px, 96px"
      : "64px";
  const imageUrl = provider.profileImageUrl ?? (isHeroVariant ? previewUrl : undefined);

  return (
    <div
      className={cn(
        "relative isolate inline-flex shrink-0 items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#fffaf3_0%,var(--brand-orange-soft)_55%,#ffe4bd_100%)] text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.24)]",
        sizeClassName,
        shapeClassName,
        className,
      )}
    >
      {imageUrl ? (
        <Image
          alt={`${provider.name} profil görseli`}
          className="object-cover"
          fill
          sizes={imageSizes}
          src={imageUrl}
        />
      ) : isHeroVariant ? (
        <>
          <ServiceIcon
            className={`${iconClassName} absolute left-5 top-5 opacity-40`}
            name={getServiceIconNameForCategory(provider.category)}
          />
          <span className="relative z-10 text-4xl font-bold tracking-normal text-[var(--brand-navy)]">
            {getProviderInitials(provider)}
          </span>
        </>
      ) : isProfileVariant ? (
        <span className="relative z-10 text-3xl font-semibold tracking-normal text-[var(--brand-navy)] sm:text-4xl">
          {getProviderInitials(provider)}
        </span>
      ) : (
        <ServiceIcon
          className={`${iconClassName} relative z-10`}
          name={getServiceIconNameForCategory(provider.category)}
        />
      )}
    </div>
  );
}
