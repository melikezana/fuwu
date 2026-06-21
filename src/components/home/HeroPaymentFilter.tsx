import { WalletCards } from "lucide-react";
import { HeroFilterStepShell } from "@/components/home/HeroFilterShell";
import { cn } from "@/lib/utils";
import type { ServiceRequestPaymentPreference } from "@/services/payments";

type PaymentOption = {
  description: string;
  label: string;
  value: ServiceRequestPaymentPreference;
};

export function HeroPaymentFilter({
  onSelect,
  options,
  paymentPreference,
}: {
  onSelect: (preference: ServiceRequestPaymentPreference) => void;
  options: PaymentOption[];
  paymentPreference: ServiceRequestPaymentPreference | "";
}) {
  return (
    <HeroFilterStepShell
      description="Ustaya nasıl ödeme yapmak istediğini seç."
      icon={<WalletCards className="size-4" aria-hidden />}
      stepNumber={4}
      title="Ödeme tercihi"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = option.value === paymentPreference;

          return (
            <button
              aria-pressed={isSelected}
              className={cn(
                "rounded-md border px-4 py-3 text-left transition-all",
                isSelected
                  ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[var(--shadow-action)]"
                  : "border-[rgba(13,20,36,0.08)] bg-white hover:border-[var(--brand-orange)]",
              )}
              key={option.value}
              onClick={() => onSelect(option.value)}
              type="button"
            >
              <span className="block text-base font-semibold text-[var(--brand-navy)]">
                {option.label}
              </span>
              <span className="mt-1 block text-sm font-medium leading-5 text-[var(--muted)]">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </HeroFilterStepShell>
  );
}
