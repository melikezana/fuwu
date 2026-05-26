"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";
import {
  getProviderAvailabilityLabel,
  minimumRatingOptions,
  providerAvailabilityOptions,
  providerAveragePrices,
  providerCategories,
  providerDistricts,
} from "@/lib/constants/providers";
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
      <span className="block cursor-default select-none text-xs font-bold uppercase leading-4 text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

const selectClassName =
  "mt-2 h-12 w-full min-w-0 cursor-pointer select-none overflow-hidden text-ellipsis rounded-md border border-[var(--border)] bg-white px-3.5 pr-10 text-sm font-medium leading-5 text-[var(--brand-navy)] outline-none transition-colors focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]";

const inputClassName =
  "mt-2 h-12 w-full min-w-0 cursor-text select-text rounded-md border border-[var(--border)] bg-white px-3.5 text-sm font-medium leading-5 text-[var(--brand-navy)] outline-none transition-colors placeholder:text-[#6B7280] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]";

function getPriceFilterValue(price: string) {
  const priceValues =
    price
      .match(/\d[\d.,]*/g)
      ?.map((value) => value.replace(/\./g, "").replace(",", "."))
      .filter(Boolean) ?? [];

  if (priceValues.length >= 2) {
    return `${priceValues[0]}-${priceValues[1]}`;
  }

  return price;
}

function getSelectedPriceValue(price: string | undefined, prices: string[]) {
  if (!price) {
    return "";
  }

  const normalizedPrice = getPriceFilterValue(price);
  const matchingPrice = prices.find((option) => getPriceFilterValue(option) === normalizedPrice);

  return matchingPrice ? getPriceFilterValue(matchingPrice) : price;
}

function getAvailabilityLabel(value: string) {
  if (value === "müsait" || value === "yoğun" || value === "çevrimdışı") {
    return getProviderAvailabilityLabel(value);
  }

  return value;
}

export function ProviderFilters({
  values,
  compact = false,
  categories = providerCategories,
  districts = providerDistricts,
  averagePrices = providerAveragePrices,
  availabilityOptions = providerAvailabilityOptions,
}: ProviderFiltersProps) {
  const { t } = useI18n();
  const priceOptions = averagePrices.map((price) => ({
    label: price,
    value: getPriceFilterValue(price),
  }));
  const selectedPriceValue = getSelectedPriceValue(values?.price, averagePrices);
  const hasAdvancedFilterValue = Boolean(
    values?.availability ||
      values?.maximumPrice ||
      values?.minimumPrice ||
      values?.price ||
      values?.query ||
      values?.rating,
  );
  const hasActiveFilters = Boolean(
    values?.category ||
      values?.district ||
      values?.availability ||
      values?.maximumPrice ||
      values?.minimumPrice ||
      values?.price ||
      values?.query ||
      values?.rating,
  );
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(hasAdvancedFilterValue);
  const advancedPanelId = useId();
  const selectedSelectClassName = (hasValue: boolean) =>
    cn(
      selectClassName,
      hasValue ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)]" : undefined,
    );
  const selectedInputClassName = (hasValue: boolean) =>
    cn(
      inputClassName,
      hasValue ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)]" : undefined,
    );
  const mobileAdvancedClassName = cn(
    "order-4 md:order-none",
    isAdvancedOpen ? "block" : "hidden",
    "md:block",
  );
  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);

    trackFilterUsed({
      availability: String(formData.get("availability") ?? ""),
      category: String(formData.get("category") ?? ""),
      district: String(formData.get("district") ?? ""),
      hasQuery: Boolean(String(formData.get("q") ?? "").trim()),
      maximumPrice: String(formData.get("average_price_max") ?? ""),
      minimumPrice: String(formData.get("average_price_min") ?? ""),
      rating: String(formData.get("rating") ?? ""),
      budget: String(formData.get("budget") ?? ""),
    });
  };

  if (compact) {
    return (
      <form
        aria-label={t("filters.title")}
        action={appRoutes.providers}
        className="max-w-full cursor-default overflow-hidden rounded-lg bg-white p-4 shadow-[0_24px_70px_rgba(13,20,36,0.1)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-5"
        onSubmit={handleFilterSubmit}
      >
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(15rem,1.25fr)_minmax(13rem,1fr)_minmax(13rem,1fr)_minmax(8.5rem,auto)] xl:items-end">
          <FilterField label={t("filters.search")}>
            <input
              className={selectedInputClassName(Boolean(values?.query))}
              defaultValue={values?.query ?? ""}
              name="q"
              placeholder={t("filters.searchPlaceholder")}
              type="search"
            />
          </FilterField>

          <FilterField label={t("filters.service")}>
            <select
              className={selectedSelectClassName(Boolean(values?.category))}
              defaultValue={values?.category ?? ""}
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

          <Button className="h-12 min-h-12 w-full rounded-md px-7" type="submit">
            {t("cta.findProvider")}
          </Button>
        </div>
        {hasActiveFilters ? (
          <Link
            className="mt-4 inline-flex min-h-11 cursor-pointer select-none items-center rounded-md px-2 text-sm font-bold text-[var(--brand-orange-dark)] transition-colors hover:text-[var(--brand-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.providers}
          >
            {t("cta.clearFilters")}
          </Link>
        ) : null}
      </form>
    );
  }

  return (
    <form
      aria-label={t("filters.title")}
      action={appRoutes.providers}
      className="max-w-full cursor-default overflow-hidden rounded-lg bg-white p-4 shadow-[0_22px_58px_rgba(13,20,36,0.08)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-5 lg:p-6"
      onSubmit={handleFilterSubmit}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="cursor-default select-none">
          <p className="text-lg font-bold leading-tight text-[var(--brand-navy)]">
            {t("filters.title")}
          </p>
          <p className="mt-1 hidden text-sm font-semibold text-[var(--muted)] sm:block">
            {t("filters.description")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            aria-controls={advancedPanelId}
            aria-expanded={isAdvancedOpen}
            className={cn(
              "inline-flex min-h-11 cursor-pointer select-none items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition-colors hover:bg-[var(--brand-orange-soft)] active:bg-[var(--brand-orange)] active:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 md:hidden",
              isAdvancedOpen
                ? "bg-[var(--brand-orange)] text-white"
                : "bg-[var(--surface-soft)] text-[var(--brand-navy)]",
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
          {hasActiveFilters ? (
            <Link
              aria-label={t("cta.clearFilters")}
              className="inline-flex min-h-11 cursor-pointer select-none items-center rounded-md px-2 text-sm font-bold text-[var(--brand-orange-dark)] transition-colors hover:bg-[var(--brand-orange-soft)] hover:text-[var(--brand-navy)] active:bg-[var(--brand-orange)] active:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={appRoutes.providers}
            >
              {t("cta.clearFilters")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(13rem,1.25fr)_minmax(12rem,1fr)_minmax(9rem,0.85fr)_minmax(9rem,0.85fr)_minmax(10rem,0.9fr)_minmax(8.5rem,auto)] xl:items-end">
        <div className="order-0 md:order-none md:col-span-2 xl:col-span-6">
          <FilterField label={t("filters.search")}>
            <input
              className={selectedInputClassName(Boolean(values?.query))}
              defaultValue={values?.query ?? ""}
              name="q"
              placeholder={t("filters.searchPlaceholder")}
              type="search"
            />
          </FilterField>
        </div>

        <div className="order-1 md:order-none">
          <FilterField label={t("filters.service")}>
            <select
              className={selectedSelectClassName(Boolean(values?.category))}
              defaultValue={values?.category ?? ""}
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
        </div>

        <div className="order-2 md:order-none">
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
        </div>

        <div
          className={cn(mobileAdvancedClassName, "md:col-span-2 xl:col-span-2")}
          id={advancedPanelId}
        >
          <div className="block min-w-0 cursor-default">
            <FilterField label="Bütçe Tercihi">
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="budget"
                    value=""
                    defaultChecked={!values?.budget}
                    className="peer sr-only"
                  />
                  <span className="inline-flex h-9 items-center justify-center rounded-full bg-[var(--surface-soft)] px-4 text-sm font-semibold text-[var(--muted)] transition-colors peer-checked:bg-[var(--brand-orange)] peer-checked:text-white hover:bg-[#F3F4F6] peer-checked:hover:bg-[var(--brand-orange-dark)]">
                    Tümü
                  </span>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="budget"
                    value="ekonomik"
                    defaultChecked={values?.budget === "ekonomik"}
                    className="peer sr-only"
                  />
                  <span className="inline-flex h-9 items-center justify-center rounded-full bg-[var(--surface-soft)] px-4 text-sm font-semibold text-[var(--muted)] transition-colors peer-checked:bg-[var(--brand-orange)] peer-checked:text-white hover:bg-[#F3F4F6] peer-checked:hover:bg-[var(--brand-orange-dark)]">
                    Ekonomik
                  </span>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="budget"
                    value="standart"
                    defaultChecked={values?.budget === "standart"}
                    className="peer sr-only"
                  />
                  <span className="inline-flex h-9 items-center justify-center rounded-full bg-[var(--surface-soft)] px-4 text-sm font-semibold text-[var(--muted)] transition-colors peer-checked:bg-[var(--brand-orange)] peer-checked:text-white hover:bg-[#F3F4F6] peer-checked:hover:bg-[var(--brand-orange-dark)]">
                    Standart
                  </span>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="budget"
                    value="premium"
                    defaultChecked={values?.budget === "premium"}
                    className="peer sr-only"
                  />
                  <span className="inline-flex h-9 items-center justify-center rounded-full bg-[var(--surface-soft)] px-4 text-sm font-semibold text-[var(--muted)] transition-colors peer-checked:bg-[var(--brand-orange)] peer-checked:text-white hover:bg-[#F3F4F6] peer-checked:hover:bg-[var(--brand-orange-dark)]">
                    Premium
                  </span>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="budget"
                    value="acil"
                    defaultChecked={values?.budget === "acil"}
                    className="peer sr-only"
                  />
                  <span className="inline-flex h-9 items-center justify-center rounded-full bg-[var(--surface-soft)] px-4 text-sm font-semibold text-[var(--muted)] transition-colors peer-checked:bg-[var(--brand-orange)] peer-checked:text-white hover:bg-[#F3F4F6] peer-checked:hover:bg-[var(--brand-orange-dark)]">
                    Acil Hizmet
                  </span>
                </label>
              </div>
            </FilterField>
          </div>
        </div>

        <div className={mobileAdvancedClassName}>
          <FilterField label={t("filters.rating")}>
            <select
              className={selectedSelectClassName(Boolean(values?.rating))}
              defaultValue={values?.rating ?? ""}
              name="rating"
            >
              <option value="">{t("filters.allRatings")}</option>
              {minimumRatingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t("filters.ratingAtLeast", { rating: option.value.replace(".", ",") })}
                </option>
              ))}
            </select>
          </FilterField>
        </div>

        <Button
          className={cn(
            "h-12 min-h-12 w-full rounded-md px-6 md:order-none",
            isAdvancedOpen ? "order-5" : "order-3",
          )}
          type="submit"
        >
          {t("cta.findProvider")}
        </Button>

        {priceOptions.length > 0 ? (
          <div className={cn(mobileAdvancedClassName, "md:col-span-2 xl:col-span-2")}>
            <FilterField label={t("filters.pricePreset")}>
              <select
                className={selectedSelectClassName(Boolean(selectedPriceValue))}
                defaultValue={selectedPriceValue}
                name="price"
              >
                <option value="">{t("filters.allPrices")}</option>
                {priceOptions.map((price) => (
                  <option key={price.label} value={price.value}>
                    {price.label}
                  </option>
                ))}
              </select>
            </FilterField>
          </div>
        ) : null}

        <div className={cn(mobileAdvancedClassName, "md:col-span-2 xl:col-span-4")}>
          <FilterField label={t("filters.availability")}>
            <select
              className={selectedSelectClassName(Boolean(values?.availability))}
              defaultValue={values?.availability ?? ""}
              name="availability"
            >
              <option value="">{t("filters.allAvailability")}</option>
              {availabilityOptions.map((availability) => (
                <option key={availability} value={availability}>
                  {getAvailabilityLabel(availability)}
                </option>
              ))}
            </select>
          </FilterField>
        </div>
      </div>
    </form>
  );
}
