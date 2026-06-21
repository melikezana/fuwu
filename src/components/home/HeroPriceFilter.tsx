import { WalletCards } from "lucide-react";
import { HeroFilterStepShell } from "@/components/home/HeroFilterShell";
import { formatHeroPrice } from "@/components/home/useHeroFilters";
import { cn } from "@/lib/utils";
import type { EmergencyPriceOption, EmergencyPriceRange } from "@/services/matching";

export function HeroPriceFilter({
  offeredPrice,
  onContinue,
  onInputChange,
  onSelect,
  priceError,
  priceInputValue,
  priceOptions,
  priceRange,
  selectedServiceLabel,
}: {
  offeredPrice: number | null;
  onContinue: () => void;
  onInputChange: (value: string) => void;
  onSelect: (price: number) => void;
  priceError: string | null;
  priceInputValue: string;
  priceOptions: EmergencyPriceOption[];
  priceRange: EmergencyPriceRange;
  selectedServiceLabel: string;
}) {
  return (
    <HeroFilterStepShell
      description="Önerilen tutarlardan seçebilir veya farklı teklif tutarı girebilirsin."
      icon={<WalletCards className="size-4" aria-hidden />}
      stepNumber={3}
      title="Teklif tutarı seç/yaz"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)]">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-[var(--muted)]">Önerilen teklifler</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            {priceOptions.map((option) => {
              const isSelected = option.value === offeredPrice;

              return (
                <button
                  aria-pressed={isSelected}
                  className={cn(
                    "min-h-12 rounded-md border px-3 text-sm font-semibold transition-all",
                    isSelected
                      ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] text-[var(--brand-navy)] shadow-[var(--shadow-action)]"
                      : "border-[rgba(13,20,36,0.08)] bg-white text-[var(--muted)] hover:border-[var(--brand-orange)] hover:text-[var(--brand-navy)]",
                  )}
                  key={option.value}
                  onClick={() => onSelect(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm font-normal leading-6 text-[var(--muted)]">
            {selectedServiceLabel} için hızlı başlangıç tutarları.
          </p>
        </div>

        <div className="min-w-0 rounded-lg border border-[rgba(13,20,36,0.08)] bg-white p-3">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--brand-navy)]">
              Farklı tutar gir
            </span>
            <span className="relative mt-2 block">
              <input
                aria-describedby="emergency-price-help"
                aria-invalid={Boolean(priceError)}
                className={cn(
                  "h-12 w-full rounded-md border bg-white px-3 pr-10 text-base font-semibold text-[var(--brand-navy)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]",
                  priceError
                    ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                    : "border-[rgba(13,20,36,0.1)]",
                )}
                inputMode="numeric"
                onChange={(event) => onInputChange(event.target.value)}
                placeholder="Teklif tutarı"
                type="text"
                value={priceInputValue}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--muted)]">
                TL
              </span>
            </span>
          </label>
          <p
            className={cn(
              "mt-2 text-xs font-medium leading-5",
              priceError ? "text-red-700" : "text-[var(--muted)]",
            )}
            id="emergency-price-help"
          >
            {priceError ??
              `${formatHeroPrice(priceRange.minimumPrice)} - ${formatHeroPrice(priceRange.maximumPrice)} aralığında teklif ver.`}
          </p>
          <button
            className={cn(
              "mt-3 h-11 w-full rounded-md px-4 text-sm font-semibold transition-all",
              offeredPrice && !priceError
                ? "bg-[var(--brand-orange)] text-white shadow-[var(--shadow-action)] hover:bg-[var(--brand-orange-dark)]"
                : "bg-[#F3F4F6] text-[var(--muted)]",
            )}
            disabled={!offeredPrice || Boolean(priceError)}
            onClick={onContinue}
            type="button"
          >
            Ödeme tercihine geç
          </button>
        </div>
      </div>
    </HeroFilterStepShell>
  );
}
