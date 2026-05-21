import Image from "next/image";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import {
  getProviderInitials,
} from "@/lib/constants/providers";
import { getServiceIconNameForCategory } from "@/lib/constants/services";
import { cn } from "@/lib/utils";
import type { Provider } from "@/types/provider";

type ProviderAvatarProps = {
  className?: string;
  provider: Provider;
  variant?: "card" | "profile";
};

export function ProviderAvatar({
  className,
  provider,
  variant = "card",
}: ProviderAvatarProps) {
  const isProfileVariant = variant === "profile";
  const sizeClassName = isProfileVariant ? "h-20 w-20" : "size-14";
  const iconClassName = isProfileVariant ? "size-8" : "size-7";

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.24)]",
        sizeClassName,
        className,
      )}
    >
      {provider.profileImageUrl ? (
        <Image
          alt={`${provider.name} profil görseli`}
          className="object-cover"
          fill
          sizes={isProfileVariant ? "80px" : "56px"}
          src={provider.profileImageUrl}
        />
      ) : isProfileVariant ? (
        <span className="text-2xl font-bold text-[var(--brand-navy)]">
          {getProviderInitials(provider)}
        </span>
      ) : (
        <ServiceIcon
          className={iconClassName}
          name={getServiceIconNameForCategory(provider.category)}
        />
      )}
    </div>
  );
}
