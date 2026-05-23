"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";
import { minimumRatingOptions } from "@/lib/constants/providers";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
  const router = useRouter();
  const serviceFilterOptions = Array.from(
    new Set([...heroServiceFilterOptions, ...filterOptions.categories]),
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value.trim() !== "") {
        params.set(key, value.trim());
      }
    }

    const queryString = params.toString();
    router.push(queryString ? `${appRoutes.providers}?${queryString}` : appRoutes.providers);
  };

  return (
    <form
      action={appRoutes.providers}
      className="mt-6 w-full max-w-full cursor-default overflow-hidden rounded-lg bg-white p-3 shadow-[0_18px_48px_rgba(13,20,36,0.08)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-5 lg:mt-8"
      onSubmit={handleSubmit}
    >
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(9rem,1.5fr)_minmax(9rem,1.25fr)_minmax(7.5rem,1fr)_minmax(7.5rem,1fr)_minmax(8rem,1fr)_minmax(8.5rem,auto)] lg:items-end">
        <div className="min-w-0">
          <HeroField label={t("filters.service")}>
            <select className={selectClassName} defaultValue="" name="category">
              <option value="">{t("filters.allServices")}</option>
              {serviceFilterOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </HeroField>
        </div>

        <div className="min-w-0">
          <HeroField label={t("filters.district")}>
            <select className={selectClassName} defaultValue="" name="district">
              <option value="">{t("filters.allDistricts")}</option>
              {filterOptions.districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </HeroField>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:contents">
          <div className="min-w-0">
            <HeroField label={t("filters.minimumPrice")}>
              <input
                className={inputClassName}
                inputMode="numeric"
                min="0"
                name="average_price_min"
                placeholder="En az"
                step="50"
                type="number"
              />
            </HeroField>
          </div>

          <div className="min-w-0">
            <HeroField label={t("filters.maximumPrice")}>
              <input
                className={inputClassName}
                inputMode="numeric"
                min="0"
                name="average_price_max"
                placeholder="En çok"
                step="50"
                type="number"
              />
            </HeroField>
          </div>
        </div>

        <div className="min-w-0">
          <HeroField label={t("filters.rating")}>
            <select className={selectClassName} defaultValue="" name="rating">
              <option value="">{t("filters.allRatings")}</option>
              {minimumRatingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t("filters.ratingAtLeast", { rating: option.value.replace(".", ",") })}
                </option>
              ))}
            </select>
          </HeroField>
        </div>

        <Button className="h-12 min-h-12 w-full rounded-md px-5" type="submit">
          {t("cta.findProvider")}
        </Button>
      </div>
    </form>
  );
}
