import { Zap } from "lucide-react";
import { HeroFilterStepShell } from "@/components/home/HeroFilterShell";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { cn } from "@/lib/utils";
import type { Service } from "@/lib/constants/services";

export function HeroCategoryFilter({
  onSelect,
  selectedServiceId,
  services,
}: {
  onSelect: (service: Service) => void;
  selectedServiceId: string;
  services: readonly Service[];
}) {
  return (
    <HeroFilterStepShell
      description="Acil destek almak istediğin hizmeti seç."
      icon={<Zap className="size-4" aria-hidden />}
      stepNumber={1}
      title="Hizmet seç"
    >
      <div className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3">
        {services.map((service) => {
          const isSelected = service.id === selectedServiceId;

          return (
            <button
              aria-pressed={isSelected}
              className={cn(
                "group flex h-full min-h-24 min-w-0 flex-col items-start justify-between rounded-lg border bg-white p-3 text-left transition-all",
                isSelected
                  ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[var(--shadow-action)]"
                  : "border-[rgba(13,20,36,0.08)] hover:border-[rgba(255,138,0,0.5)] hover:bg-[#fffaf3]",
              )}
              key={service.id}
              onClick={() => onSelect(service)}
              type="button"
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-md transition-colors",
                  isSelected
                    ? "bg-[var(--brand-orange)] text-white"
                    : "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] group-hover:bg-[var(--brand-orange)] group-hover:text-white",
                )}
              >
                <ServiceIcon className="size-5" name={service.iconName} />
              </span>
              <span className="mt-3 min-w-0 text-sm font-semibold leading-5 text-[var(--brand-navy)]">
                {service.title}
              </span>
            </button>
          );
        })}
      </div>
    </HeroFilterStepShell>
  );
}
