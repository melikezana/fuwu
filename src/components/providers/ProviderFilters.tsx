"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Filter, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextLink } from "@/components/ui/TextLink";
import { appRoutes } from "@/lib/constants/navigation";
import {
  getServiceDisplayLabel,
  getServiceFilterValue,
  normalizeServiceValue,
} from "@/lib/constants/services";
import {
  availabilityFilterOptions,
  defaultProviderSort,
  getProviderSortLabel,
  minimumRatingFilterOptions,
  priceInfoFilterOptions,
  providerSortOptions,
  responseTimeFilterOptions,
  type ProviderFilterCapabilities,
} from "@/lib/provider-filters";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { trackFilterUsed } from "@/services/analytics";

export type ProviderFilterValues = {
  availability?: string;
  category?: string;
  district?: string;
  hasPortfolio?: string;
  hasPrice?: string;
  hasProfileImage?: string;
  hasReviews?: string;
  maximumPrice?: string;
  minimumPrice?: string;
  price?: string;
  query?: string;
  rating?: string;
  responseTime?: string;
  sort?: string;
  verified?: string;
};

type ProviderFiltersProps = {
  availabilityOptions?: string[];
  averagePrices?: string[];
  capabilities: ProviderFilterCapabilities;
  categories?: string[];
  compact?: boolean;
  districts?: string[];
  resultCount: number;
  values?: ProviderFilterValues;
};

type FilterChip = {
  key: keyof ProviderFilterValues;
  label: string;
};

type FilterOption = {
  chipLabel?: string;
  label: string;
  value: string;
};

const emptyCapabilities: ProviderFilterCapabilities = {
  availabilityOptions: [],
  hasAvailability: false,
  hasCreatedAt: false,
  hasDistance: false,
  hasPortfolio: false,
  hasPrice: false,
  hasProfileImage: false,
  hasRating: false,
  hasResponseTime: false,
  hasReviews: false,
  hasVerification: false,
  priceInfoOptions: [],
  ratingOptions: [],
  responseTimeOptions: [],
  sortOptions: [providerSortOptions[0]],
};

const fieldLabelClassName =
  "block cursor-default select-none text-xs font-bold leading-4 text-[var(--brand-navy)]";
const selectClassName =
  "premium-control mt-2 h-[54px] w-full min-w-0 cursor-pointer select-none overflow-hidden text-ellipsis rounded-[14px] px-3.5 pr-10 text-[0.95rem] font-semibold leading-5 outline-none";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function FilterField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block min-w-0 cursor-default">
      <span className={fieldLabelClassName}>{label}</span>
      {children}
    </label>
  );
}

function FilterSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="border-b border-[var(--border)] py-4 last:border-b-0">
      <h3 className="text-sm font-extrabold leading-5 text-[var(--brand-navy)]">{title}</h3>
      <div className="mt-3 grid gap-2">{children}</div>
    </section>
  );
}

function CheckboxOption({
  defaultChecked,
  label,
  name,
  type = "checkbox",
  value,
}: {
  defaultChecked: boolean;
  label: string;
  name: string;
  type?: "checkbox" | "radio";
  value: string;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer select-none items-center gap-3 rounded-[14px] border border-[rgba(10,37,64,0.08)] bg-white px-3.5 py-2.5 text-sm font-bold text-[var(--brand-navy)] transition-colors hover:border-[rgba(255,101,0,0.35)] hover:bg-[var(--brand-orange-soft)]">
      <input
        className="size-4 accent-[var(--brand-orange)]"
        defaultChecked={defaultChecked}
        name={name}
        type={type}
        value={value}
      />
      <span className="min-w-0 leading-5">{label}</span>
    </label>
  );
}

function FilterButtonContent({ activeFilterCount }: { activeFilterCount: number }) {
  return (
    <>
      <Filter aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 truncate">Filtrele</span>
      {activeFilterCount > 0 ? (
        <span className="inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-orange)] px-1.5 text-xs font-extrabold leading-none text-white">
          {activeFilterCount}
        </span>
      ) : null}
    </>
  );
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}

function getSingularResultLabel(count: number) {
  return count === 1 ? "1 Ustayı Göster" : `${count.toLocaleString("tr-TR")} Ustayı Göster`;
}

function getSelectedSortValue(value: string | undefined, capabilities: ProviderFilterCapabilities) {
  const availableSorts = capabilities.sortOptions.length
    ? capabilities.sortOptions
    : emptyCapabilities.sortOptions;

  return availableSorts.some((option) => option.value === value)
    ? value ?? defaultProviderSort
    : defaultProviderSort;
}

function getCategoryOptions(categories: string[], selectedCategory: string | undefined) {
  const rawOptions = [
    ...(selectedCategory ? [selectedCategory] : []),
    ...categories,
  ].filter(Boolean);
  const uniqueOptions = new Map<string, { label: string; value: string }>();

  rawOptions.forEach((category) => {
    const value = getServiceFilterValue(category);
    const label = getServiceDisplayLabel(category);

    if (value && label && !uniqueOptions.has(normalizeServiceValue(value))) {
      uniqueOptions.set(normalizeServiceValue(value), { label, value });
    }
  });

  return Array.from(uniqueOptions.values());
}

function createProviderHref(values: ProviderFilterValues = {}) {
  const params = new URLSearchParams();

  if (values.category) params.set("category", values.category);
  if (values.district) params.set("district", values.district);
  if (values.minimumPrice) params.set("average_price_min", values.minimumPrice);
  if (values.maximumPrice) params.set("average_price_max", values.maximumPrice);
  if (values.price) params.set("price", values.price);
  if (values.rating) params.set("rating", values.rating);
  if (values.availability) params.set("availability", values.availability);
  if (values.verified) params.set("verified", values.verified);
  if (values.responseTime) params.set("response_time", values.responseTime);
  if (values.hasPrice) params.set("price_info", values.hasPrice);
  if (values.hasProfileImage) params.set("profile_image", values.hasProfileImage);
  if (values.hasPortfolio) params.set("portfolio", values.hasPortfolio);
  if (values.hasReviews) params.set("reviews", values.hasReviews);
  if (values.sort && values.sort !== defaultProviderSort) params.set("sort", values.sort);
  if (values.query) params.set("q", values.query);

  const queryString = params.toString();

  return queryString ? `${appRoutes.providers}?${queryString}` : appRoutes.providers;
}

function removeFilter(values: ProviderFilterValues | undefined, key: keyof ProviderFilterValues) {
  return createProviderHref({
    ...(values ?? {}),
    [key]: undefined,
  });
}

function getOptionLabel(options: readonly FilterOption[], value: string | undefined) {
  return options.find((option) => option.value === value)?.chipLabel ?? "";
}

function getActiveFilterChips(values: ProviderFilterValues | undefined): FilterChip[] {
  const chips: FilterChip[] = [];

  if (values?.category) {
    chips.push({ key: "category", label: getServiceDisplayLabel(values.category) });
  }

  if (values?.district) {
    chips.push({ key: "district", label: values.district });
  }

  if (values?.rating) {
    const label = getOptionLabel(minimumRatingFilterOptions, values.rating);
    chips.push({ key: "rating", label: label || `${values.rating}+ Puan` });
  }

  if (values?.verified) {
    chips.push({ key: "verified", label: "Doğrulanmış" });
  }

  if (values?.availability) {
    const label = getOptionLabel(availabilityFilterOptions, values.availability);
    chips.push({ key: "availability", label: label || values.availability });
  }

  if (values?.responseTime) {
    const label = getOptionLabel(responseTimeFilterOptions, values.responseTime);
    chips.push({ key: "responseTime", label: label || "Hızlı yanıt" });
  }

  if (values?.hasPrice) {
    const label = getOptionLabel(priceInfoFilterOptions, values.hasPrice);
    chips.push({ key: "hasPrice", label: label || "Fiyat bilgisi var" });
  }

  if (values?.hasProfileImage) {
    chips.push({ key: "hasProfileImage", label: "Profil fotoğrafı var" });
  }

  if (values?.hasPortfolio) {
    chips.push({ key: "hasPortfolio", label: "Portföyü var" });
  }

  if (values?.hasReviews) {
    chips.push({ key: "hasReviews", label: "Yorum alan" });
  }

  if (values?.sort && values.sort !== defaultProviderSort) {
    chips.push({
      key: "sort",
      label: getProviderSortLabel(values.sort, true) ?? "Sıralama",
    });
  }

  return chips.filter((chip) => Boolean(chip.label));
}

export function ProviderFilters({
  capabilities = emptyCapabilities,
  categories = [],
  compact = false,
  districts = [],
  resultCount,
  values,
}: ProviderFiltersProps) {
  const { t } = useI18n();
  const effectiveCapabilities = capabilities ?? emptyCapabilities;
  const sortOptions = effectiveCapabilities.sortOptions.length
    ? effectiveCapabilities.sortOptions
    : emptyCapabilities.sortOptions;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortValue, setSortValue] = useState(() =>
    getSelectedSortValue(values?.sort, effectiveCapabilities),
  );
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const filterCloseButtonRef = useRef<HTMLButtonElement>(null);
  const ratingOptions = effectiveCapabilities.ratingOptions;
  const availabilityOptions = effectiveCapabilities.availabilityOptions;
  const responseTimeOptions = effectiveCapabilities.responseTimeOptions;
  const priceInfoOptions = effectiveCapabilities.priceInfoOptions;
  const categoryOptions = useMemo(
    () => getCategoryOptions(categories, values?.category),
    [categories, values?.category],
  );
  const selectedCategory = getServiceFilterValue(values?.category);
  const activeValues = { ...values, sort: sortValue };
  const activeChips = getActiveFilterChips(activeValues);
  const activeFilterCount = [
    values?.availability,
    values?.category,
    values?.district,
    values?.hasPortfolio,
    values?.hasPrice,
    values?.hasProfileImage,
    values?.hasReviews,
    values?.maximumPrice,
    values?.minimumPrice,
    values?.price,
    values?.query,
    values?.rating,
    values?.responseTime,
    values?.verified,
  ].filter(Boolean).length;
  const selectedSelectClassName = (hasValue: boolean) =>
    cn(
      selectClassName,
      hasValue ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)]" : undefined,
    );
  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSortValue(event.target.value);
  };
  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    filterCloseButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsFilterOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(filterPanelRef.current);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterOpen]);
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
    });
  };

  return (
    <form
      action={appRoutes.providers}
      aria-label={t("filters.title")}
      className={cn(
        "premium-card relative max-w-full cursor-default overflow-visible bg-white p-0 shadow-[0_22px_72px_rgba(10,37,64,0.10)]",
        compact ? "p-3 sm:p-4" : "p-5 sm:p-6",
      )}
      onSubmit={handleFilterSubmit}
    >
      <input
        disabled={sortValue === defaultProviderSort}
        name="sort"
        type="hidden"
        value={sortValue}
      />

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(210px,1.1fr)_minmax(190px,1fr)_minmax(220px,1fr)_auto_auto] lg:items-end">
        <FilterField label={t("filters.service")}>
          <select
            className={selectedSelectClassName(Boolean(values?.category))}
            defaultValue={selectedCategory}
            name="category"
          >
            <option value="">{t("filters.allCategories")}</option>
            {categoryOptions.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
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

        <div className="hidden lg:block">
          <FilterField label="Sırala">
            <select className={selectedSelectClassName(sortValue !== defaultProviderSort)} onChange={handleSortChange} value={sortValue}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>
        </div>

        <button
          className="relative z-10 hidden h-[54px] min-h-[54px] items-center justify-center gap-2 rounded-[14px] border border-[rgba(20,33,61,0.1)] bg-white px-4 text-sm font-extrabold leading-5 text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-all hover:-translate-y-0.5 hover:border-[rgba(249,115,22,0.42)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 lg:inline-flex"
          onClick={() => setIsFilterOpen(true)}
          type="button"
        >
          <FilterButtonContent activeFilterCount={activeFilterCount} />
        </button>

        <Button className="h-[54px] min-h-[54px] w-full rounded-[14px] px-5 text-sm font-extrabold sm:col-span-2 lg:col-span-1 lg:min-w-[132px]" type="submit">
          Ustaları Göster
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:hidden">
        <button
          className="relative z-10 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] border border-[rgba(20,33,61,0.1)] bg-white px-4 text-sm font-extrabold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
          onClick={() => setIsFilterOpen(true)}
          type="button"
        >
          <FilterButtonContent activeFilterCount={activeFilterCount} />
        </button>
        <button
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] border border-[rgba(20,33,61,0.1)] bg-white px-4 text-sm font-extrabold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
          onClick={() => setIsSortOpen(true)}
          type="button"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Sırala
        </button>
      </div>

      {activeChips.length > 0 ? (
        <div className="mt-4 flex min-w-0 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible">
          {activeChips.map((chip) => (
            <TextLink
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-[rgba(255,101,0,0.26)] bg-[var(--brand-orange-soft)] px-3 text-xs font-extrabold leading-4 text-[var(--brand-navy)] no-underline transition-colors hover:border-[var(--brand-orange)] hover:bg-white"
              href={removeFilter(activeValues, chip.key)}
              key={`${chip.key}-${chip.label}`}
            >
              <span>{chip.label}</span>
              <X aria-hidden="true" className="size-3.5" />
            </TextLink>
          ))}
          <TextLink
            className="ml-auto inline-flex min-h-9 shrink-0 items-center px-2 text-xs font-extrabold text-[var(--brand-orange-dark)] no-underline"
            href={appRoutes.providers}
          >
            Tümünü Temizle
          </TextLink>
        </div>
      ) : null}

      {isFilterOpen ? (
        <div className="fixed inset-0 z-[80]">
          <button
            aria-label="Filtre panelini kapat"
            className="absolute inset-0 cursor-default bg-[rgba(10,37,64,0.34)] backdrop-blur-[1px] lg:bg-[rgba(10,37,64,0.18)]"
            onClick={() => setIsFilterOpen(false)}
            type="button"
          />
          <div
            aria-labelledby="provider-filter-panel-title"
            aria-modal="true"
            className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_-28px_80px_rgba(10,37,64,0.22)] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-full lg:max-h-none lg:w-[30rem] lg:rounded-l-[24px] lg:rounded-tr-none lg:border-l lg:border-[rgba(10,37,64,0.1)] lg:shadow-[0_24px_90px_rgba(10,37,64,0.20)]"
            ref={filterPanelRef}
            role="dialog"
          >
            <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-[rgba(10,37,64,0.16)] lg:hidden" />
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
              <h2
                className="min-w-0 text-base font-extrabold text-[var(--brand-navy)]"
                id="provider-filter-panel-title"
              >
                Ustaları Filtrele
              </h2>
              <div className="flex shrink-0 items-center gap-2">
                <TextLink className="min-h-10 px-2 text-sm font-extrabold no-underline" href={appRoutes.providers}>
                  Temizle
                </TextLink>
                <button
                  aria-label="Filtre panelini kapat"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)]"
                  onClick={() => setIsFilterOpen(false)}
                  ref={filterCloseButtonRef}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-24 lg:pb-5">
              {effectiveCapabilities.hasVerification ? (
                <FilterSection title="Doğrulama">
                  <CheckboxOption
                    defaultChecked={values?.verified === "true"}
                    label="Yalnızca doğrulanmış ustalar"
                    name="verified"
                    value="true"
                  />
                </FilterSection>
              ) : null}

              {ratingOptions.length > 0 ? (
                <FilterSection title="Puan">
                  {ratingOptions.map((option) => (
                    <CheckboxOption
                      defaultChecked={values?.rating === option.value}
                      key={option.value}
                      label={option.label}
                      name="rating"
                      type="radio"
                      value={option.value}
                    />
                  ))}
                </FilterSection>
              ) : null}

              {availabilityOptions.length > 0 ? (
                <FilterSection title="Müsaitlik">
                  {availabilityOptions.map((option) => (
                    <CheckboxOption
                      defaultChecked={values?.availability === option.value}
                      key={option.value}
                      label={option.label}
                      name="availability"
                      value={option.value}
                    />
                  ))}
                </FilterSection>
              ) : null}

              {responseTimeOptions.length > 0 ? (
                <FilterSection title="Yanıt Süresi">
                  {responseTimeOptions.map((option) => (
                    <CheckboxOption
                      defaultChecked={values?.responseTime === option.value}
                      key={option.value}
                      label={option.label}
                      name="response_time"
                      type="radio"
                      value={option.value}
                    />
                  ))}
                </FilterSection>
              ) : null}

              {priceInfoOptions.length > 0 ? (
                <FilterSection title="Fiyatlandırma">
                  {priceInfoOptions.map((option) => (
                    <CheckboxOption
                      defaultChecked={values?.hasPrice === option.value}
                      key={option.value}
                      label={option.label}
                      name="price_info"
                      type="radio"
                      value={option.value}
                    />
                  ))}
                </FilterSection>
              ) : null}

              {values?.district ? (
                <FilterSection title="Hizmet Bölgesi">
                  <CheckboxOption
                    defaultChecked
                    label="Seçili ilçede hizmet verenler"
                    name="district"
                    value={values.district}
                  />
                </FilterSection>
              ) : null}

              {effectiveCapabilities.hasProfileImage ||
              effectiveCapabilities.hasPortfolio ||
              effectiveCapabilities.hasReviews ? (
                <FilterSection title="Profil Özellikleri">
                  {effectiveCapabilities.hasProfileImage ? (
                    <CheckboxOption
                      defaultChecked={values?.hasProfileImage === "true"}
                      label="Profil fotoğrafı bulunanlar"
                      name="profile_image"
                      value="true"
                    />
                  ) : null}
                  {effectiveCapabilities.hasPortfolio ? (
                    <CheckboxOption
                      defaultChecked={values?.hasPortfolio === "true"}
                      label="Portföyü bulunanlar"
                      name="portfolio"
                      value="true"
                    />
                  ) : null}
                  {effectiveCapabilities.hasReviews ? (
                    <CheckboxOption
                      defaultChecked={values?.hasReviews === "true"}
                      label="Yorum alan ustalar"
                      name="reviews"
                      value="true"
                    />
                  ) : null}
                </FilterSection>
              ) : null}
            </div>
            <div className="absolute inset-x-0 bottom-0 shrink-0 border-t border-[var(--border)] bg-white/95 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur lg:static lg:hidden">
              <Button className="h-[52px] min-h-[52px] w-full rounded-[14px] text-sm font-extrabold" type="submit">
                {getSingularResultLabel(resultCount)}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isSortOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Sıralama panelini kapat"
            className="absolute inset-0 bg-[rgba(10,37,64,0.45)]"
            onClick={() => setIsSortOpen(false)}
            type="button"
          />
          <div className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[24px] bg-white shadow-[0_-28px_80px_rgba(10,37,64,0.22)]">
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-[rgba(10,37,64,0.16)]" />
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-base font-extrabold text-[var(--brand-navy)]">Sırala</h2>
              <button
                aria-label="Sıralama panelini kapat"
                className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--brand-navy)]"
                onClick={() => setIsSortOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <div className="grid gap-2 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {sortOptions.map((option) => {
                const isSelected = sortValue === option.value;

                return (
                  <button
                    className={cn(
                      "flex min-h-[52px] items-center justify-between gap-3 rounded-[14px] border px-4 text-left text-sm font-extrabold text-[var(--brand-navy)] transition-colors",
                      isSelected
                        ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)]"
                        : "border-[var(--border)] bg-white hover:bg-[var(--surface-soft)]",
                    )}
                    key={option.value}
                    onClick={() => {
                      setSortValue(option.value);
                      setIsSortOpen(false);
                    }}
                    type="button"
                  >
                    <span>{option.mobileLabel}</span>
                    {isSelected ? <Check aria-hidden="true" className="size-4 text-[var(--brand-orange-dark)]" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
