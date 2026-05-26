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
  "mt-1.5 h-12 w-full min-w-0 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-sm font-medium leading-5 text-[var(--brand-navy)] outline-none transition-all placeholder:text-[#6B7280] focus:border-[var(--brand-orange)] focus:bg-white focus:ring-4 focus:ring-[rgba(255,138,0,0.15)] hover:border-[#D1D5DB]";

const selectClassName = `${fieldBaseClassName} cursor-pointer select-none overflow-hidden text-ellipsis pr-10 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_12px_center] bg-no-repeat`;

function HeroField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block min-w-0 cursor-default">
      <span className="block cursor-default select-none text-[0.7rem] font-bold uppercase tracking-wide text-[#6B7280] ml-1">
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
      className="mt-6 w-full max-w-full cursor-default overflow-hidden rounded-xl bg-white p-4 shadow-[0_20px_60px_rgba(13,20,36,0.08)] ring-1 ring-[#F3F4F6] sm:p-6 lg:mt-8"
      onSubmit={handleSubmit}
    >
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1.5fr_1fr_auto] lg:items-end">
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

        <Button 
          className="h-12 min-h-[3rem] w-full min-w-[140px] rounded-lg bg-[var(--brand-orange)] px-6 font-bold text-white shadow-[0_8px_20px_rgba(255,138,0,0.25)] transition-all hover:bg-[var(--brand-orange-dark)] hover:shadow-[0_12px_24px_rgba(255,138,0,0.35)]" 
          type="submit"
        >
          {t("cta.findProvider")}
        </Button>
      </div>

      <div className="mt-5 pt-5 border-t border-[#F3F4F6]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="block cursor-default select-none text-[0.7rem] font-bold uppercase tracking-wide text-[#6B7280]">
            Bütçe Tercihi
          </span>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer">
              <input type="radio" name="budget" value="" defaultChecked className="peer sr-only" />
              <span className="inline-flex h-9 items-center justify-center rounded-full bg-[#F3F4F6] px-4 text-xs font-bold text-[#4B5563] transition-all peer-checked:bg-[var(--brand-orange)] peer-checked:text-white hover:bg-[#E5E7EB] peer-checked:hover:bg-[var(--brand-orange-dark)] peer-checked:shadow-[0_4px_12px_rgba(255,138,0,0.25)]">
                Tümü
              </span>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="budget" value="ekonomik" className="peer sr-only" />
              <span className="inline-flex h-9 items-center justify-center rounded-full bg-[#F3F4F6] px-4 text-xs font-bold text-[#4B5563] transition-all peer-checked:bg-[var(--brand-orange)] peer-checked:text-white hover:bg-[#E5E7EB] peer-checked:hover:bg-[var(--brand-orange-dark)] peer-checked:shadow-[0_4px_12px_rgba(255,138,0,0.25)]">
                Ekonomik
              </span>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="budget" value="standart" className="peer sr-only" />
              <span className="inline-flex h-9 items-center justify-center rounded-full bg-[#F3F4F6] px-4 text-xs font-bold text-[#4B5563] transition-all peer-checked:bg-[var(--brand-orange)] peer-checked:text-white hover:bg-[#E5E7EB] peer-checked:hover:bg-[var(--brand-orange-dark)] peer-checked:shadow-[0_4px_12px_rgba(255,138,0,0.25)]">
                Standart
              </span>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="budget" value="premium" className="peer sr-only" />
              <span className="inline-flex h-9 items-center justify-center rounded-full bg-[#F3F4F6] px-4 text-xs font-bold text-[#4B5563] transition-all peer-checked:bg-[var(--brand-orange)] peer-checked:text-white hover:bg-[#E5E7EB] peer-checked:hover:bg-[var(--brand-orange-dark)] peer-checked:shadow-[0_4px_12px_rgba(255,138,0,0.25)]">
                Premium
              </span>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="budget" value="acil" className="peer sr-only" />
              <span className="inline-flex h-9 items-center justify-center rounded-full bg-[#F3F4F6] px-4 text-xs font-bold text-[#4B5563] transition-all peer-checked:bg-[var(--brand-orange)] peer-checked:text-white hover:bg-[#E5E7EB] peer-checked:hover:bg-[var(--brand-orange-dark)] peer-checked:shadow-[0_4px_12px_rgba(255,138,0,0.25)]">
                Acil Hizmet
              </span>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
}
