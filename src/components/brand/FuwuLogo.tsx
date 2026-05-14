import { cn } from "@/lib/utils";

type FuwuLogoSize = "sm" | "md" | "lg" | "hero";

type FuwuLogoProps = {
  className?: string;
  inverted?: boolean;
  size?: FuwuLogoSize;
};

type FuwuWatermarkProps = {
  className?: string;
};

const wordSizeClasses: Record<FuwuLogoSize, string> = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-4xl",
  hero: "text-6xl sm:text-7xl",
};

const subtitleSizeClasses: Record<FuwuLogoSize, string> = {
  sm: "text-[0.56rem]",
  md: "text-[0.64rem]",
  lg: "text-[0.72rem]",
  hero: "text-sm",
};

const accentSizeClasses: Record<FuwuLogoSize, string> = {
  sm: "h-1.5 w-7",
  md: "h-1.5 w-9",
  lg: "h-2 w-11",
  hero: "h-2.5 w-16",
};

export function FuwuLogo({ className, inverted = false, size = "md" }: FuwuLogoProps) {
  return (
    <span
      aria-label="FUWU HİZMET"
      className={cn("inline-flex min-w-0 select-none flex-col leading-none", className)}
    >
      <span
        className={cn(
          "block font-extrabold uppercase leading-none tracking-[0.1em]",
          wordSizeClasses[size],
          inverted ? "text-white" : "text-[var(--brand-navy)]",
        )}
      >
        FUW<span className="text-[var(--brand-orange)]">U</span>
      </span>
      <span className="mt-1.5 flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn("rounded-full bg-[var(--brand-orange)]", accentSizeClasses[size])}
        />
        <span
          className={cn(
            "font-bold uppercase leading-none tracking-[0.18em]",
            subtitleSizeClasses[size],
            inverted ? "text-white/88" : "text-[var(--muted)]",
          )}
        >
          HİZMET
        </span>
      </span>
    </span>
  );
}

export function FuwuWatermark({ className }: FuwuWatermarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute select-none font-extrabold uppercase leading-none tracking-[0.12em] text-[var(--brand-navy)]",
        className,
      )}
    >
      FUWU
    </span>
  );
}
