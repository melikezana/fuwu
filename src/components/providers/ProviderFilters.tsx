"use client";

import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { TextLink } from "@/components/ui/TextLink";
import { appRoutes } from "@/lib/constants/navigation";
import {
  providerBudgetOptions,
  providerCategories,
  providerDistricts,
} from "@/lib/constants/providers";
import { normalizeServiceValue } from "@/lib/constants/services";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { trackFilterUsed } from "@/services/analytics";

export type ProviderFilterValues = {
  category?: string;
  district?: string;
  maximumPrice?: string;
  minimumPrice?: string;
  price?: string;
  rating?: string;
  availability?: string;
  budget?: string;
  query?: string;
};

type ProviderFiltersProps = {
  values?: ProviderFilterValues;
  compact?: boolean;
  categories?: string[];
  districts?: string[];
  averagePrices?: string[];
  availabilityOptions?: string[];
};

function FilterField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block min-w-0 cursor-default">
      <span className="block cursor-default select-none text-xs font-semibold uppercase leading-4 text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function FilterGroup({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return (
    <div className={cn("block min-w-0 cursor-default", className)}>
      <span className="block cursor-default select-none text-xs font-semibold uppercase leading-4 text-[var(--muted)]">
        {label}
      </span>
      {children}
    </div>
  );
}

const selectClassName =
  "mt-2 h-12 w-full min-w-0 cursor-pointer select-none overflow-hidden text-ellipsis rounded-md border border-[var(--border)] bg-white px-3.5 pr-10 text-sm font-medium leading-5 text-[var(--brand-navy)] outline-none transition-colors focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]";

const visibleBudgetOptions = providerBudgetOptions.filter(
  (option) => option.value !== "acil-hizmet",
);

function getSelectedBudgetValue(value: string | undefined) {
  const normalizedValue = value?.trim().toLocaleLowerCase("tr").replace(/\s+/g, "-") ?? "";

  return normalizedValue === "acil" ? "acil-hizmet" : normalizedValue;
}

function BudgetPreferenceTags({ selectedBudget }: { selectedBudget?: string }) {
  const selectedBudgetValue = getSelectedBudgetValue(selectedBudget);

  return (
    <div className="mt-2 grid grid-cols-3 gap-1 rounded-md bg-[#F3F4F6] p-1 ring-1 ring-[rgba(13,20,36,0.06)]">
      {visibleBudgetOptions.map((option) => (
        <label className="min-w-0 cursor-pointer" key={option.value}>
          <input
            className="peer sr-only"
            defaultChecked={
              selectedBudgetValue
                ? selectedBudgetValue === option.value
                : option.value === "standart"
            }
            name="budget"
            type="radio"
            value={option.value}
          />
          <span className="inline-flex h-10 w-full min-w-0 select-none items-center justify-center whitespace-nowrap rounded-md px-2 text-xs font-semibold leading-5 text-[var(--muted)] transition-all hover:bg-white hover:text-[var(--brand-navy)] peer-checked:bg-[var(--brand-orange)] peer-checked:text-white peer-checked:shadow-[var(--shadow-action)] sm:text-sm">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function ProviderFilters({
  values,
  compact = false,
  categories = providerCategories,
  districts = providerDistricts,
}: ProviderFiltersProps) {
  const { t } = useI18n();
  const selectedCategory =
    categories.find(
      (category) =>
        normalizeServiceValue(category) ===
        normalizeServiceValue(values?.category ?? ""),
    ) ?? values?.category ?? "";
  const hasActiveFilters = Boolean(
    values?.category ||
      values?.district ||
      values?.availability ||
      values?.budget ||
      values?.maximumPrice ||
      values?.minimumPrice ||
      values?.price ||
      values?.query ||
      values?.rating,
  );
  const selectedSelectClassName = (hasValue: boolean) =>
    cn(
      selectClassName,
      hasValue ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)]" : undefined,
    );
  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);

    trackFilterUsed({
      availability: "",
      category: String(formData.get("category") ?? ""),
      district: String(formData.get("district") ?? ""),
      hasQuery: false,
      maximumPrice: "",
      minimumPrice: "",
      rating: "",
      budget: String(formData.get("budget") ?? ""),
    });
  };

  return (
    <form
      aria-label={t("filters.title")}
      action={appRoutes.providers}
      className={cn(
        "max-w-full cursor-default overflow-hidden rounded-lg bg-white shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)]",
        compact ? "p-3 sm:p-4" : "p-4 sm:p-5",
      )}
      onSubmit={handleFilterSubmit}
    >
      {!compact ? (
        <div className="hidden lg:block mb-4 cursor-default select-none">
          <p className="text-lg font-semibold leading-tight text-[var(--brand-navy)]">
            Hızlı usta bul
          </p>
          <p className="mt-1 text-sm font-medium leading-6 text-[var(--muted)]">
            Hizmet, ilçe ve bütçeyi seç; uygun profillere geç.
          </p>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_minmax(11rem,0.9fr)_minmax(18rem,1.2fr)_minmax(8rem,auto)] lg:items-end">
        <FilterField label={t("filters.service")}>
          <select
            className={selectedSelectClassName(Boolean(values?.category))}
            defaultValue={selectedCategory}
            name="category"
          >
            <option value="">{t("filters.allCategories")}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label={t("filters.district")}>
          <select
            className={selectedSelectClassName(Boolean(values?.district))}
            defaultValue={values?.district ?? ""}
            name="district"
          >
            <option value="">{t("filters.allDistricts")}</option>
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterGroup className="col-span-2 lg:col-span-1" label="Bütçe">
          <BudgetPreferenceTags selectedBudget={values?.budget} />
        </FilterGroup>

        <Button className="col-span-2 lg:col-span-1 h-12 min-h-12 w-full rounded-md px-6" type="submit">
          {t("cta.findProvider")}
        </Button>
      </div>

      {hasActiveFilters ? (
        <TextLink
          className="mt-3 inline-flex min-h-10 items-center px-2 text-sm font-semibold no-underline"
          href={appRoutes.providers}
        >
          {t("cta.clearFilters")}
        </TextLink>
      ) : null}
    </form>
  );
}
