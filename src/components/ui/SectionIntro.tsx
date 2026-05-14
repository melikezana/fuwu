import { cn } from "@/lib/utils";

type SectionIntroProps = {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
};

export function SectionIntro({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "light",
  className,
}: SectionIntroProps) {
  const isDark = tone === "dark";

  return (
    <div
      className={cn(
        "max-w-2xl cursor-default select-none",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <p
        className={cn(
          "text-sm font-bold uppercase tracking-normal",
          isDark ? "text-[var(--brand-orange)]" : "text-[var(--brand-orange-dark)]",
        )}
      >
        {eyebrow}
      </p>
      <h2
        className={cn(
          "mt-3 text-3xl font-black leading-tight tracking-normal sm:text-4xl",
          isDark ? "text-white" : "text-[var(--brand-navy)]",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-4 text-base font-medium leading-7",
            isDark ? "text-white/70" : "text-[var(--muted)]",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
