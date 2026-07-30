import type { ServiceCategoryTarget } from "@/lib/constants/service-category-map";

type ServiceTooltipProps = {
  target: ServiceCategoryTarget;
};

export function ServiceTooltip({ target }: ServiceTooltipProps) {
  return (
    <div className="pointer-events-none w-max max-w-[9.5rem] rounded-md border border-[rgba(20,33,61,0.12)] bg-white/95 px-3 py-2 text-center shadow-[var(--shadow-elevated)] backdrop-blur">
      <p className="text-sm font-extrabold leading-5 text-[var(--brand-navy)]">
        {target.label}
      </p>
      <p className="mt-0.5 text-xs font-bold leading-4 text-[var(--brand-orange-dark)]">
        {target.ctaLabel}
      </p>
    </div>
  );
}
