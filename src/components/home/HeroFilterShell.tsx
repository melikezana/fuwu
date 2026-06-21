import type { ReactNode } from "react";
import { Check } from "lucide-react";

export function HeroFilterSummaryPill({
  label,
  onClick,
  value,
}: {
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button
      className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-[rgba(255,138,0,0.22)] bg-[#fff8ed] px-3 py-2 text-left text-xs font-semibold text-[var(--brand-navy)] transition-colors hover:border-[var(--brand-orange)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)]"
      onClick={onClick}
      type="button"
    >
      <Check className="size-3.5 shrink-0 text-[var(--brand-orange-dark)]" aria-hidden />
      <span className="shrink-0 text-[var(--brand-orange-dark)]">{label}</span>
      <span className="min-w-0 truncate">{value}</span>
    </button>
  );
}

export function HeroFilterStepShell({
  children,
  description,
  icon,
  stepNumber,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  stepNumber: number;
  title: string;
}) {
  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-[rgba(13,20,36,0.08)] bg-[#fffdf9] p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--brand-orange)] text-sm font-semibold text-white shadow-[var(--shadow-action)]">
          {stepNumber}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-wrap-anywhere break-words text-lg font-semibold leading-tight text-[var(--brand-navy)]">
                {title}
              </h3>
              <p className="text-wrap-anywhere mt-1 break-words text-sm font-normal leading-6 text-[var(--muted)]">
                {description}
              </p>
            </div>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-[var(--brand-orange-dark)] ring-1 ring-[rgba(13,20,36,0.08)]">
              {icon}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
