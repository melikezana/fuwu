import { ServiceIcon } from "@/components/home/ServiceIcon";
import type { ServiceIconName } from "@/lib/constants/services";
import { cn } from "@/lib/utils";

type ThreeDIconProps = {
  accent?: string;
  className?: string;
  iconClassName?: string;
  name: ServiceIconName;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: {
    base: "size-14",
    icon: "size-7",
    shadow: "h-3 w-12",
  },
  md: {
    base: "size-20",
    icon: "size-10",
    shadow: "h-4 w-16",
  },
  lg: {
    base: "size-28",
    icon: "size-14",
    shadow: "h-5 w-24",
  },
};

export function ThreeDIcon({
  accent = "var(--brand-orange)",
  className,
  iconClassName,
  name,
  size = "md",
}: ThreeDIconProps) {
  const classes = sizeClasses[size];

  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-flex flex-col items-center justify-center", className)}
      style={{ color: accent }}
    >
      <span
        className={cn(
          "relative z-10 grid place-items-center rounded-lg border border-white/80 bg-white shadow-[0_18px_42px_rgba(10,37,64,0.14)] ring-1 ring-[rgba(10,37,64,0.08)]",
          "[transform:perspective(720px)_rotateX(58deg)_rotateZ(-16deg)]",
          classes.base,
        )}
      >
        <span
          className="absolute inset-2 rounded-md opacity-15"
          style={{ backgroundColor: accent }}
        />
        <span
          className="absolute bottom-2 left-1/2 h-1.5 w-2/3 -translate-x-1/2 rounded-full opacity-45"
          style={{ backgroundColor: accent }}
        />
        <ServiceIcon className={cn("relative z-10", classes.icon, iconClassName)} name={name} />
      </span>
      <span
        className={cn(
          "-mt-1 block rounded-full bg-[rgba(10,37,64,0.12)] blur-[2px]",
          classes.shadow,
        )}
      />
    </span>
  );
}
