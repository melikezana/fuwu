"use client";

import Image from "next/image";
import { Check, LockKeyhole, ShieldCheck, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import type { ServiceIconName } from "@/lib/constants/services";
import { cn } from "@/lib/utils";

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
  src: string;
  variant: HomeAssetVisualVariant;
};

const warnedMissingAssets = new Set<string>();

function warnMissingAsset(src: string) {
  if (warnedMissingAssets.has(src)) {
    return;
  }

  warnedMissingAssets.add(src);
  console.warn(`[Fuwu homepage] Missing public asset "${src}". Showing premium placeholder.`);
}

function HeroHousePlaceholder() {
  return (
    <div className="absolute inset-0">
      <span className="absolute inset-x-[5%] bottom-[6%] h-[22%] rounded-[50%] bg-[linear-gradient(180deg,#FFFFFF_0%,#F3F6FA_100%)] shadow-[0_34px_90px_rgba(10,37,64,0.16)] ring-1 ring-[rgba(10,37,64,0.06)]" />
      <span className="absolute left-[18%] top-[18%] h-[58%] w-[64%] rounded-[1.1rem] border border-white/80 bg-[linear-gradient(145deg,#FFFFFF_0%,#F7F9FC_54%,#EEF3F8_100%)] shadow-[0_30px_72px_rgba(10,37,64,0.15)]" />
      <span className="absolute left-[14%] top-[10%] h-[17%] w-[72%] skew-x-[-18deg] rounded-t-[1rem] bg-[linear-gradient(135deg,#07182F_0%,#0A2540_72%,#183B63_100%)] shadow-[0_18px_44px_rgba(10,37,64,0.18)]" />
      <span className="absolute left-[61%] top-[3%] h-[17%] w-[7%] rounded-sm bg-[linear-gradient(180deg,#FFFFFF_0%,#DDE5EE_100%)] shadow-[0_8px_24px_rgba(10,37,64,0.12)]" />
      <span className="absolute left-[22%] top-[31%] h-[18%] w-[17%] rounded-md bg-white/96 shadow-[inset_0_0_0_1px_rgba(10,37,64,0.08),0_14px_32px_rgba(10,37,64,0.08)]" />
      <span className="absolute left-[42%] top-[31%] h-[18%] w-[18%] rounded-md bg-white/92 shadow-[inset_0_0_0_1px_rgba(10,37,64,0.07)]" />
      <span className="absolute left-[63%] top-[31%] h-[18%] w-[15%] rounded-md bg-[#FFF4EA] shadow-[inset_0_0_0_1px_rgba(255,101,0,0.12)]" />
      <span className="absolute left-[24%] top-[54%] h-[17%] w-[16%] rounded-md bg-[#FFF4EA] shadow-[inset_0_0_0_1px_rgba(255,101,0,0.12)]" />
      <span className="absolute left-[43%] top-[54%] h-[17%] w-[17%] rounded-md bg-white/96 shadow-[inset_0_0_0_1px_rgba(10,37,64,0.08)]" />
      <span className="absolute left-[63%] top-[54%] h-[17%] w-[15%] rounded-md bg-white/92 shadow-[inset_0_0_0_1px_rgba(10,37,64,0.07)]" />
      <span className="absolute left-[18%] top-[45%] h-px w-[65%] bg-[rgba(10,37,64,0.08)]" />
      <span className="absolute left-[40%] top-[24%] h-[50%] w-px bg-[rgba(10,37,64,0.07)]" />
      <span className="absolute left-[61%] top-[24%] h-[50%] w-px bg-[rgba(10,37,64,0.07)]" />
      <span className="absolute left-[16%] top-[63%] h-[13%] w-[5%] rounded-sm bg-[var(--brand-orange)] shadow-[0_10px_24px_rgba(255,101,0,0.28)]" />
      <span className="absolute left-[78%] top-[56%] h-[13%] w-[5%] rounded-sm bg-[#C8D6E2]" />
      <span className="absolute left-[31%] top-[68%] h-[10%] w-[6%] rounded-full bg-[#C8D6E2] blur-[1px]" />
      <span className="absolute left-[69%] top-[70%] h-[11%] w-[6%] rounded-full bg-[#BFD3C8] blur-[1px]" />
    </div>
  );
}

function CategoryPlaceholder({
  accent,
  iconName,
}: {
  accent: string;
  iconName: ServiceIconName;
}) {
  return (
    <div className="absolute inset-0">
      <span className="absolute left-1/2 top-[58%] h-4 w-[62%] -translate-x-1/2 rounded-full bg-[rgba(10,37,64,0.12)] blur-[7px]" />
      <span
        className="absolute left-1/2 top-[45%] grid size-[4.6rem] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg border border-white bg-white shadow-[0_20px_44px_rgba(10,37,64,0.14)] ring-1 ring-[rgba(10,37,64,0.08)] [transform:translate(-50%,-50%)_perspective(760px)_rotateX(57deg)_rotateZ(-14deg)]"
      >
        <span
          className="absolute inset-2 rounded-md opacity-14"
          style={{ backgroundColor: accent }}
        />
        <span
          className="absolute bottom-2 left-1/2 h-1.5 w-2/3 -translate-x-1/2 rounded-full opacity-45"
          style={{ backgroundColor: accent }}
        />
        <ServiceIcon className="relative z-10 size-8" name={iconName} />
      </span>
      <span
        className="absolute right-[24%] top-[26%] size-5 rounded-sm opacity-20"
        style={{ backgroundColor: accent }}
      />
      <span className="absolute left-[22%] top-[30%] size-3 rounded-full bg-white shadow-[0_8px_18px_rgba(10,37,64,0.08)]" />
    </div>
  );
}

function CharacterPlaceholder({ tone }: { tone: "customer" | "provider" }) {
  const isProvider = tone === "provider";

  return (
    <div className="absolute inset-0">
      <span className="absolute bottom-0 left-[10%] h-[12%] w-[74%] rounded-full bg-[rgba(10,37,64,0.11)] blur-md" />
      <span className="absolute left-[33%] top-[12%] size-[28%] rounded-full border border-[rgba(10,37,64,0.08)] bg-white shadow-[0_18px_42px_rgba(10,37,64,0.12)]" />
      <span
        className={cn(
          "absolute bottom-0 left-[23%] h-[50%] w-[38%] rounded-t-[2rem] shadow-[0_26px_60px_rgba(10,37,64,0.16)]",
          isProvider ? "bg-[var(--brand-navy)]" : "bg-[var(--brand-orange)]",
        )}
      />
      <span
        className={cn(
          "absolute top-[6%] shadow-[0_12px_28px_rgba(10,37,64,0.14)]",
          isProvider
            ? "left-[27%] h-[14%] w-[47%] rounded-b-md rounded-t-[2rem] bg-[var(--brand-navy)]"
            : "left-[21%] h-[35%] w-[58%] rounded-t-[3rem] bg-[var(--brand-navy)]",
        )}
      />
      <span className="absolute bottom-[20%] left-[13%] h-[21%] w-[9%] -rotate-12 rounded-full bg-white shadow-[0_12px_28px_rgba(10,37,64,0.1)]" />
      <span className="absolute bottom-[21%] right-[18%] h-[21%] w-[9%] rotate-12 rounded-full bg-white shadow-[0_12px_28px_rgba(10,37,64,0.1)]" />
      <span className="absolute bottom-[27%] right-[7%] grid h-[24%] w-[18%] rotate-[-10deg] place-items-center rounded-md bg-[var(--brand-navy)] text-white shadow-[0_18px_36px_rgba(10,37,64,0.22)]">
        <Smartphone className="size-5" />
      </span>
      {isProvider ? (
        <span className="absolute bottom-[26%] left-[29%] h-[8%] w-[29%] rounded-full bg-[var(--brand-orange)]" />
      ) : null}
    </div>
  );
}

function SecurityPlaceholder() {
  return (
    <div className="absolute inset-0">
      <span className="absolute bottom-[9%] left-[14%] h-[16%] w-[70%] rounded-full bg-[rgba(10,37,64,0.12)] blur-lg" />
      <span className="absolute bottom-[16%] right-[16%] grid size-[64%] place-items-center rounded-lg bg-white text-[var(--brand-navy)] shadow-[0_28px_68px_rgba(10,37,64,0.16)] ring-1 ring-[rgba(10,37,64,0.08)]">
        <ShieldCheck className="size-[58%]" />
      </span>
      <span className="absolute bottom-[9%] right-[7%] grid size-[28%] place-items-center rounded-full bg-[var(--trust-green)] text-white shadow-[0_14px_34px_rgba(20,150,108,0.22)] ring-4 ring-white">
        <Check className="size-[48%]" />
      </span>
    </div>
  );
}

function PaymentPlaceholder() {
  return (
    <div className="absolute inset-0">
      <span className="absolute bottom-[12%] right-[12%] h-[30%] w-[68%] rotate-[8deg] rounded-lg bg-[var(--brand-navy)] shadow-[0_28px_62px_rgba(10,37,64,0.22)]" />
      <span className="absolute bottom-[34%] right-[31%] h-[28%] w-[62%] rotate-[-4deg] rounded-lg bg-white shadow-[0_20px_48px_rgba(10,37,64,0.12)] ring-1 ring-[rgba(10,37,64,0.08)]" />
      <span className="absolute right-[28%] top-[7%] grid size-[44%] place-items-center rounded-lg bg-white shadow-[0_28px_68px_rgba(10,37,64,0.16)] ring-1 ring-[rgba(10,37,64,0.08)]">
        <span className="absolute top-[18%] h-[32%] w-[46%] rounded-t-full border-[0.42rem] border-[rgba(10,37,64,0.16)] border-b-0" />
        <span className="grid size-[54%] translate-y-[16%] place-items-center rounded-md bg-[#FFF8EF] text-[var(--brand-orange)] ring-1 ring-[rgba(255,101,0,0.16)]">
          <LockKeyhole className="size-[52%]" />
        </span>
      </span>
    </div>
  );
}

function Placeholder({
  accent,
  iconName,
  variant,
}: {
  accent: string;
  iconName: ServiceIconName;
  variant: HomeAssetVisualVariant;
}) {
  if (variant === "hero-house") {
    return <HeroHousePlaceholder />;
  }

  if (variant === "category") {
    return <CategoryPlaceholder accent={accent} iconName={iconName} />;
  }

  if (variant === "provider-character") {
    return <CharacterPlaceholder tone="provider" />;
  }

  if (variant === "customer-character") {
    return <CharacterPlaceholder tone="customer" />;
  }

  if (variant === "security-lock") {
    return <SecurityPlaceholder />;
  }

  return <PaymentPlaceholder />;
}

export function HomeAssetVisual({
  accent = "var(--brand-orange)",
  alt = "",
  className,
  iconName = "wrench",
  imageClassName,
  priority = false,
  sizes = "100vw",
  src,
  variant,
}: HomeAssetVisualProps) {
  const [canUseImage, setCanUseImage] = useState(true);

  useEffect(() => {
    setCanUseImage(true);
  }, [src]);

  return (
    <div
      aria-hidden={alt ? undefined : "true"}
      className={cn("relative block overflow-visible", className)}
    >
      {canUseImage ? (
        <Image
          alt={alt}
          className={cn("object-contain", imageClassName)}
          fill
          onError={() => {
            warnMissingAsset(src);
            setCanUseImage(false);
          }}
          priority={priority}
          sizes={sizes}
          src={src}
        />
      ) : (
        <Placeholder accent={accent} iconName={iconName} variant={variant} />
      )}
    </div>
  );
}
