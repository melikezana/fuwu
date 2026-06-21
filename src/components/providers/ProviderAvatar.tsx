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
  const sizeClassName = isProfileVariant ? "h-24 w-24 sm:h-28 sm:w-28" : "size-14";
  const iconClassName = isProfileVariant ? "size-9" : "size-6";

  return (
    <div
      className={cn(
        "relative isolate inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(145deg,#fffaf3_0%,var(--brand-orange-soft)_55%,#ffe4bd_100%)] text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.24)]",
        sizeClassName,
        className,
      )}
    >
      {!provider.profileImageUrl ? (
        <>
          <span className="absolute -right-4 -top-5 size-16 rounded-full border border-white/70 bg-white/35" />
          <span className="absolute -bottom-7 -left-5 size-20 rounded-full border border-[rgba(255,138,0,0.16)] bg-white/25" />
          <span className="absolute inset-x-3 bottom-3 h-px bg-[linear-gradient(90deg,transparent,rgba(255,138,0,0.32),transparent)]" />
        </>
      ) : null}
      {provider.profileImageUrl ? (
        <Image
          alt={`${provider.name} profil görseli`}
          className="object-cover"
          fill
          sizes={isProfileVariant ? "(min-width: 640px) 112px, 96px" : "56px"}
          src={provider.profileImageUrl}
        />
      ) : isProfileVariant ? (
        <span className="relative z-10 text-3xl font-semibold tracking-[-0.04em] text-[var(--brand-navy)] sm:text-4xl">
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
