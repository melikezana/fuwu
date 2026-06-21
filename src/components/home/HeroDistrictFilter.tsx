import type { KeyboardEvent } from "react";
import { Check, MapPin, Search } from "lucide-react";
import { HeroFilterStepShell } from "@/components/home/HeroFilterShell";
import { cn } from "@/lib/utils";

export function HeroDistrictFilter({
  district,
  districtSearch,
  filteredDistrictOptions,
  highlightedDistrictIndex,
  onKeyDown,
  onSearchChange,
  onSelect,
  onHighlight,
}: {
  district: string;
  districtSearch: string;
  filteredDistrictOptions: string[];
  highlightedDistrictIndex: number;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSearchChange: (value: string) => void;
  onSelect: (district: string) => void;
  onHighlight: (index: number) => void;
}) {
  return (
    <HeroFilterStepShell
      description="İstanbul içindeki ilçeni yaz, uygun seçenekleri hemen filtreleyelim."
      icon={<MapPin className="size-4" aria-hidden />}
      stepNumber={2}
      title="İlçe seç"
    >
      <div className="rounded-lg bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
        <label className="relative block">
          <span className="sr-only">İlçe ara</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden
          />
          <input
            aria-activedescendant={
              filteredDistrictOptions[highlightedDistrictIndex]
                ? `emergency-district-${highlightedDistrictIndex}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls="emergency-district-list"
            aria-expanded="true"
            className="h-12 w-full rounded-md border border-[rgba(13,20,36,0.1)] bg-white pl-10 pr-3 text-base font-semibold text-[var(--brand-navy)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]"
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Kadıköy, Kağıthane, Kartal..."
            role="combobox"
            type="text"
            value={districtSearch}
          />
        </label>

        <div
          className="mt-3 max-h-60 overflow-y-auto rounded-md border border-[rgba(13,20,36,0.08)] bg-[#F9FAFB] p-1"
          id="emergency-district-list"
          role="listbox"
        >
          {filteredDistrictOptions.length > 0 ? (
            filteredDistrictOptions.map((districtOption, index) => {
              const isHighlighted = index === highlightedDistrictIndex;
              const isSelected = districtOption === district;

              return (
                <button
                  aria-selected={isSelected}
                  className={cn(
                    "flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors",
                    isSelected || isHighlighted
                      ? "bg-[var(--brand-orange-soft)] text-[var(--brand-navy)]"
                      : "text-[var(--muted)] hover:bg-white hover:text-[var(--brand-navy)]",
                  )}
                  id={`emergency-district-${index}`}
                  key={districtOption}
                  onClick={() => onSelect(districtOption)}
                  onMouseEnter={() => onHighlight(index)}
                  role="option"
                  type="button"
                >
                  <span className="min-w-0 truncate">{districtOption}</span>
                  {isSelected ? (
                    <Check
                      className="size-4 shrink-0 text-[var(--brand-orange-dark)]"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })
          ) : (
            <p className="px-3 py-4 text-sm font-semibold text-[var(--muted)]">
              Bu aramayla eşleşen İstanbul ilçesi bulunamadı.
            </p>
          )}
        </div>
      </div>
    </HeroFilterStepShell>
  );
}
