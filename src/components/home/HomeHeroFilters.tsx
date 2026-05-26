"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";
import { minimumRatingOptions, providerBudgetOptions } from "@/lib/constants/providers";
import { useI18n } from "@/lib/i18n";
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
  "Bahçe Bakımı",
  "Havuz Bakımı",
];

const fieldBaseClassName =
  "mt-2 h-12 w-full min-w-0 rounded-md border border-[var(--border)] bg-white px-3.5 text-sm font-medium leading-5 text-[var(--brand-navy)] outline-none transition-colors placeholder:text-[#6B7280] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]";

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
      <span className="block cursor-default select-none text-xs font-bold uppercase leading-4 text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function BudgetPreferenceTags() {
  const allOptions = [{ label: "Tümü", value: "" }, ...providerBudgetOptions];

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {allOptions.map((option) => (
        <label className="min-w-0 cursor-pointer" key={option.value || "all"}>
          <input
            className="peer sr-only"
            defaultChecked={option.value === ""}
            name="budget"
            type="radio"
            value={option.value}
          />
          <span className="inline-flex min-h-10 max-w-full select-none items-center justify-center whitespace-nowrap rounded-md border border-[rgba(13,20,36,0.08)] bg-[#F7F3EC] px-3 text-sm font-semibold leading-5 text-[var(--brand-navy)] shadow-sm transition-all hover:border-[rgba(255,138,0,0.36)] hover:bg-[var(--brand-orange-soft)] peer-checked:border-[var(--brand-orange)] peer-checked:bg-[var(--brand-orange)] peer-checked:text-white peer-checked:shadow-[0_12px_26px_rgba(255,138,0,0.2)]">
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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const advancedPanelId = useId();
  const serviceFilterOptions = Array.from(
    new Set([...heroServiceFilterOptions, ...filterOptions.categories]),
  );
  const mobileAdvancedClassName = cn(
    "order-4 lg:order-none",
    isAdvancedOpen ? "block" : "hidden",
    "lg:block",
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
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(9rem,1.1fr)_minmax(8.5rem,0.95fr)_minmax(15rem,1.45fr)_minmax(8rem,0.8fr)_minmax(8.5rem,auto)] lg:items-end">
        <div className="order-0 min-w-0 lg:order-none">
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

        <div className="order-1 min-w-0 lg:order-none">
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

        <div className={mobileAdvancedClassName} id={advancedPanelId}>
          <HeroField label="Bütçe Tercihi">
            <BudgetPreferenceTags />
          </HeroField>
        </div>

        <div className={mobileAdvancedClassName}>
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
          className={cn(
            "h-12 min-h-12 w-full rounded-md px-5 lg:order-none",
            isAdvancedOpen ? "order-5" : "order-2",
          )}
          type="submit"
        >
          {t("cta.findProvider")}
        </Button>

        <button
          aria-controls={advancedPanelId}
          aria-expanded={isAdvancedOpen}
          className={cn(
            "order-3 inline-flex min-h-11 w-full cursor-pointer select-none items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:col-span-2 lg:hidden",
            isAdvancedOpen
              ? "bg-[var(--brand-orange)] text-white"
              : "bg-[var(--surface-soft)] text-[var(--brand-navy)] hover:bg-[var(--brand-orange-soft)]",
          )}
          onClick={() => setIsAdvancedOpen((currentValue) => !currentValue)}
          type="button"
        >
          {t("filters.advanced")}
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 transition-transform", isAdvancedOpen ? "rotate-180" : "")}
          />
        </button>
      </div>
    </form>
  );
}
