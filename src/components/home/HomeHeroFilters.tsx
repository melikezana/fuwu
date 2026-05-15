"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { appRoutes, ctaLabels } from "@/lib/constants/navigation";
import { minimumRatingOptions } from "@/lib/constants/providers";
import { cn } from "@/lib/utils";
import type { ProviderFilterOptions } from "@/services/providers";

type HomeHeroFiltersProps = {
  filterOptions: ProviderFilterOptions;
};

const heroServiceFilterOptions = [
  "Tesisat",
  "Elektrik",
  "Temizlik",
  "Halı Yıkama",
  "Klima & Beyaz Eşya",
  "Mobilya Montaj",
  "Boya Badana",
  "Nakliye Yardımı",
];

const fieldBaseClassName =
  "mt-2 h-12 w-full min-w-0 rounded-md border border-[var(--border)] bg-white px-3.5 text-sm font-medium leading-5 text-[var(--brand-navy)] outline-none transition-colors placeholder:text-[#6B7280] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]";

const selectClassName = `${fieldBaseClassName} cursor-pointer select-none overflow-hidden text-ellipsis pr-10`;
const inputClassName = `${fieldBaseClassName} cursor-text select-text`;

function HeroField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block min-w-0 cursor-default">
      <span className="block cursor-default select-none text-xs font-bold uppercase leading-4 text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function HomeHeroFilters({ filterOptions }: HomeHeroFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const advancedPanelId = useId();
  const serviceFilterOptions = Array.from(
    new Set([...heroServiceFilterOptions, ...filterOptions.categories]),
  );

  return (
    <form
      action={appRoutes.providers}
      className="mt-8 w-full max-w-full cursor-default overflow-hidden rounded-lg bg-white p-4 shadow-[0_22px_60px_rgba(13,20,36,0.09)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-5"
    >
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(10rem,1.15fr)_minmax(8.5rem,0.95fr)_minmax(7.5rem,0.8fr)_minmax(7.5rem,0.8fr)_minmax(9.5rem,0.9fr)_minmax(7.75rem,auto)] 2xl:items-end">
        <div className="order-1 min-w-0 md:order-none">
          <HeroField label="Hizmet">
            <select className={selectClassName} defaultValue="" name="category">
              <option value="">Tüm hizmetler</option>
              {serviceFilterOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </HeroField>
        </div>

        <div className="order-2 min-w-0 md:order-none">
          <HeroField label="İlçe">
            <select className={selectClassName} defaultValue="" name="district">
              <option value="">Tüm ilçeler</option>
              {filterOptions.districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </HeroField>
        </div>

        <div
          className={cn(
            "order-5 grid min-w-0 gap-3 md:contents",
            isAdvancedOpen ? "grid" : "hidden md:contents",
          )}
          id={advancedPanelId}
        >
          <HeroField label="Minimum Fiyat">
            <input
              className={inputClassName}
              inputMode="numeric"
              min="0"
              name="average_price_min"
              placeholder="Örn. 500"
              step="50"
              type="number"
            />
          </HeroField>

          <HeroField label="Maksimum Fiyat">
            <input
              className={inputClassName}
              inputMode="numeric"
              min="0"
              name="average_price_max"
              placeholder="Örn. 2500"
              step="50"
              type="number"
            />
          </HeroField>

          <HeroField label="Puan">
            <select className={selectClassName} defaultValue="" name="rating">
              <option value="">Tüm puanlar</option>
              {minimumRatingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </HeroField>
        </div>

        <Button className="order-3 h-12 min-h-12 w-full rounded-md px-5 md:order-none" type="submit">
          {ctaLabels.findProvider}
        </Button>

        <div className="order-4 min-w-0 md:hidden">
          <button
            aria-controls={advancedPanelId}
            aria-expanded={isAdvancedOpen}
            className="inline-flex min-h-10 w-full cursor-pointer select-none items-center justify-center gap-2 rounded-md bg-[var(--surface-soft)] px-3 text-sm font-black text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            onClick={() => setIsAdvancedOpen((currentValue) => !currentValue)}
            type="button"
          >
            Gelişmiş filtreler
            <ChevronDown
              aria-hidden="true"
              className={cn("size-4 transition-transform", isAdvancedOpen ? "rotate-180" : "")}
            />
          </button>
        </div>
      </div>
    </form>
  );
}
