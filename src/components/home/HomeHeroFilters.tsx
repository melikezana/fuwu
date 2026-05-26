"use client";

import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";
import { providerBudgetOptions } from "@/lib/constants/providers";
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
  "Bahçe Bakımı",
  "Havuz Bakımı",
];

const heroBudgetOptions = providerBudgetOptions.filter(
  (option) => option.value !== "acil-hizmet",
);

const fieldBaseClassName =
  "mt-2 h-12 w-full min-w-0 rounded-md border border-[rgba(13,20,36,0.12)] bg-white px-3.5 text-sm font-medium leading-5 text-[var(--brand-navy)] outline-none transition-all placeholder:text-[#6B7280] hover:border-[rgba(13,20,36,0.2)] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[rgba(255,138,0,0.14)]";

const selectClassName = `${fieldBaseClassName} cursor-pointer select-none overflow-hidden text-ellipsis pr-10`;

function HeroField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block min-w-0 cursor-default">
      <span className="block cursor-default select-none text-[0.68rem] font-semibold uppercase leading-4 text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function BudgetPreferenceTags({
  defaultBudget = "standart",
}: {
  defaultBudget?: string;
}) {
  return (
    <div className="mt-2 grid min-w-0 grid-cols-3 gap-1 rounded-md bg-[#F3F4F6] p-1 ring-1 ring-[rgba(13,20,36,0.06)]">
      {heroBudgetOptions.map((option) => (
        <label className="min-w-0 cursor-pointer" key={option.value}>
          <input
            defaultChecked={defaultBudget === option.value}
            className="peer sr-only"
            name="budget"
            type="radio"
            value={option.value}
          />
          <span className="inline-flex h-10 w-full min-w-0 select-none items-center justify-center whitespace-nowrap rounded px-2 text-xs font-semibold leading-5 text-[var(--muted)] transition-all hover:bg-white hover:text-[var(--brand-navy)] peer-checked:bg-[var(--brand-orange)] peer-checked:text-white peer-checked:shadow-[0_8px_18px_rgba(255,138,0,0.2)] sm:text-sm">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function HomeHeroFilters({ filterOptions }: HomeHeroFiltersProps) {
  const { t } = useI18n();
  const router = useRouter();
  const serviceFilterOptions = Array.from(
    new Set([...heroServiceFilterOptions, ...filterOptions.categories]),
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
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
      className="mt-5 w-full max-w-full cursor-default overflow-hidden rounded-lg bg-white p-3 shadow-[0_18px_48px_rgba(13,20,36,0.08)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-4 lg:mt-6"
      onSubmit={handleSubmit}
    >
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(12rem,1fr)_minmax(11rem,0.9fr)_minmax(18rem,1.25fr)_minmax(8rem,auto)] lg:items-end">
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
          <HeroField label="Bütçe">
            <BudgetPreferenceTags />
          </HeroField>
        </div>

        <Button
          className="h-12 min-h-12 w-full rounded-md px-6 font-semibold shadow-[0_14px_30px_rgba(255,138,0,0.24)]"
          type="submit"
        >
          {t("cta.findProvider")}
        </Button>
      </div>
    </form>
  );
}
