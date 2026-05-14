import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";
import {
  minimumRatingOptions,
  providerAvailabilityOptions,
  providerAveragePrices,
  providerCategories,
  providerDistricts,
} from "@/lib/constants/providers";

export type ProviderFilterValues = {
  category?: string;
  district?: string;
  maximumPrice?: string;
  minimumPrice?: string;
  price?: string;
  rating?: string;
  availability?: string;
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
    <label className="block min-w-0 cursor-default select-none">
      <span className="block cursor-default select-none text-xs font-bold uppercase leading-4 text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

const selectClassName =
  "mt-2 h-12 w-full min-w-0 cursor-pointer select-none rounded-md border border-[var(--border)] bg-white px-3.5 pr-10 text-sm font-semibold text-[var(--brand-navy)] outline-none transition-colors focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]";

const inputClassName =
  "mt-2 h-12 w-full min-w-0 cursor-text select-text rounded-md border border-[var(--border)] bg-white px-3.5 text-sm font-semibold text-[var(--brand-navy)] outline-none transition-colors placeholder:text-[#6B7280] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]";

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

export function ProviderFilters({
  values,
  compact = false,
  categories = providerCategories,
  districts = providerDistricts,
  averagePrices = providerAveragePrices,
  availabilityOptions = providerAvailabilityOptions,
}: ProviderFiltersProps) {
  const priceOptions = averagePrices.map((price) => ({
    label: price,
    value: getPriceFilterValue(price),
  }));
  const selectedPriceValue = getSelectedPriceValue(values?.price, averagePrices);

  if (compact) {
    return (
      <form
        action={appRoutes.providers}
        className="cursor-default rounded-lg bg-white p-4 shadow-[0_24px_70px_rgba(13,20,36,0.1)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-5"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(14rem,1.2fr)_minmax(12rem,1fr)_minmax(12rem,1fr)_minmax(8.5rem,auto)] xl:items-end">
          <FilterField label="Arama">
            <input
              className={inputClassName}
              defaultValue={values?.query ?? ""}
              name="q"
              placeholder="Hizmet veya usta ara"
              type="search"
            />
          </FilterField>

          <FilterField label="İhtiyacını belirle">
            <select className={selectClassName} defaultValue={values?.category ?? ""} name="category">
              <option value="">Tüm kategoriler</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="İlçeni belirle">
            <select className={selectClassName} defaultValue={values?.district ?? ""} name="district">
              <option value="">Tüm ilçeler</option>
              {districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </FilterField>

          <Button className="h-12 min-h-12 w-full rounded-md px-7 xl:w-fit" type="submit">
            Usta Bul
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      action={appRoutes.providers}
      className="cursor-default rounded-lg bg-white p-4 shadow-[0_22px_58px_rgba(13,20,36,0.08)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-5 lg:p-6"
    >
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="cursor-default select-none">
          <p className="text-lg font-bold leading-tight text-[var(--brand-navy)]">Usta Bul</p>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
            Hizmetini ve ilçeni seç; minimum/maksimum fiyat, puan ve uygunluğa göre profilleri daralt.
          </p>
        </div>
        <Link
          className="cursor-pointer text-sm font-bold text-[var(--brand-orange-dark)] transition-colors hover:text-[var(--brand-navy)]"
          href={appRoutes.providers}
        >
          Filtreleri temizle
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6 xl:items-end">
        <div className="md:col-span-2 xl:col-span-6">
          <FilterField label="Arama">
            <input
              className={inputClassName}
              defaultValue={values?.query ?? ""}
              name="q"
              placeholder="Hizmet veya usta ara"
              type="search"
            />
          </FilterField>
        </div>

        <FilterField label="İhtiyacını belirle">
          <select className={selectClassName} defaultValue={values?.category ?? ""} name="category">
            <option value="">Tüm kategoriler</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="İlçeni belirle">
          <select className={selectClassName} defaultValue={values?.district ?? ""} name="district">
            <option value="">Tüm ilçeler</option>
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </FilterField>

        <div className="md:col-span-2 xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <FilterField label="Minimum fiyat">
              <input
                className={inputClassName}
                defaultValue={values?.minimumPrice ?? ""}
                inputMode="numeric"
                min="0"
                name="average_price_min"
                placeholder="Örn. 500"
                step="50"
                type="number"
              />
            </FilterField>

            <FilterField label="Maksimum fiyat">
              <input
                className={inputClassName}
                defaultValue={values?.maximumPrice ?? ""}
                inputMode="numeric"
                min="0"
                name="average_price_max"
                placeholder="Örn. 2500"
                step="50"
                type="number"
              />
            </FilterField>
          </div>
        </div>

        <FilterField label="Minimum puan">
          <select className={selectClassName} defaultValue={values?.rating ?? ""} name="rating">
            <option value="">Tüm puanlar</option>
            {minimumRatingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterField>

        <Button className="h-12 min-h-12 w-full rounded-md px-7" type="submit">
          Usta Bul
        </Button>

        {priceOptions.length > 0 ? (
          <div className="md:col-span-2 xl:col-span-2">
            <FilterField label="Hazır fiyat aralığı">
              <select className={selectClassName} defaultValue={selectedPriceValue} name="price">
                <option value="">Tüm fiyatlar</option>
                {priceOptions.map((price) => (
                  <option key={price.label} value={price.value}>
                    {price.label}
                  </option>
                ))}
              </select>
            </FilterField>
          </div>
        ) : null}

        <div className="md:col-span-2 xl:col-span-4">
          <FilterField label="Uygunluk">
            <select
              className={selectClassName}
              defaultValue={values?.availability ?? ""}
              name="availability"
            >
              <option value="">Tüm uygunluklar</option>
              {availabilityOptions.map((availability) => (
                <option key={availability} value={availability}>
                  {availability}
                </option>
              ))}
            </select>
          </FilterField>
        </div>
      </div>
    </form>
  );
}
