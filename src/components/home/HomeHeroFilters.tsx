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

const heroBudgetOptions = [
  { label: "Tümü", value: "" },
  ...providerBudgetOptions.map((option) => ({
    label: option.value === "acil-hizmet" ? "Acil" : option.label,
    value: option.value,
  })),
];

const fieldBaseClassName =
  "mt-2 h-[3.25rem] w-full min-w-0 rounded-lg border border-[rgba(13,20,36,0.12)] bg-[#fffdf9] px-4 text-sm font-medium leading-5 text-[var(--brand-navy)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition-all placeholder:text-[#6B7280] hover:border-[rgba(13,20,36,0.2)] focus:border-[var(--brand-orange)] focus:bg-white focus:ring-[3px] focus:ring-[rgba(255,138,0,0.14)]";

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
  selectedBudget,
  setSelectedBudget,
}: {
  selectedBudget: string;
  setSelectedBudget: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-lg bg-[#F3F4F6] p-1.5 ring-1 ring-[rgba(13,20,36,0.06)]">
      {heroBudgetOptions.map((option) => (
        <label className="min-w-0 flex-1 cursor-pointer sm:flex-none" key={option.value || "all"}>
          <input
            checked={selectedBudget === option.value}
            className="peer sr-only"
            name="budget"
            onChange={() => setSelectedBudget(option.value)}
            type="radio"
            value={option.value}
          />
          <span className="inline-flex h-9 w-full min-w-0 select-none items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-semibold leading-5 text-[var(--muted)] transition-all hover:bg-white hover:text-[var(--brand-navy)] peer-checked:bg-[var(--brand-orange)] peer-checked:text-white peer-checked:shadow-[0_10px_24px_rgba(255,138,0,0.24)] sm:w-auto">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function BudgetPreferenceField({
  budgetPanelId,
  isBudgetOpen,
  selectedBudget,
  toggleBudgetOpen,
}: {
  budgetPanelId: string;
  isBudgetOpen: boolean;
  selectedBudget: string;
  toggleBudgetOpen: () => void;
}) {
  const selectedBudgetLabel =
    heroBudgetOptions.find((option) => option.value === selectedBudget)?.label ?? "Tümü";

  return (
    <div className="block min-w-0 cursor-default">
      <span className="block cursor-default select-none text-[0.68rem] font-semibold uppercase leading-4 text-[var(--muted)]">
        Bütçe Tercihi
      </span>
      <button
        aria-controls={budgetPanelId}
        aria-expanded={isBudgetOpen}
        className="mt-2 flex h-[3.25rem] w-full min-w-0 cursor-pointer select-none items-center justify-between gap-3 rounded-lg border border-[rgba(13,20,36,0.12)] bg-[#fffdf9] px-4 text-left text-sm font-medium leading-5 text-[var(--brand-navy)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all hover:border-[rgba(255,138,0,0.42)] hover:bg-white focus:outline-none focus:ring-[3px] focus:ring-[rgba(255,138,0,0.16)]"
        onClick={toggleBudgetOpen}
        type="button"
      >
        <span className="min-w-0 truncate">{selectedBudgetLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 shrink-0 text-[var(--brand-orange-dark)] transition-transform", isBudgetOpen ? "rotate-180" : "")}
        />
      </button>
    </div>
  );
}

export function HomeHeroFilters({ filterOptions }: HomeHeroFiltersProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState("");
  const advancedPanelId = useId();
  const budgetPanelId = useId();
  const serviceFilterOptions = Array.from(
    new Set([...heroServiceFilterOptions, ...filterOptions.categories]),
  );
  const mobileAdvancedClassName = cn(
    "order-4 min-w-0 sm:col-span-2 lg:col-span-1 lg:order-none",
    isAdvancedOpen ? "block" : "hidden",
    "lg:block",
  );
  const shouldShowBudgetTags = isBudgetOpen || selectedBudget !== "";
  const toggleAdvancedOpen = () => {
    if (isAdvancedOpen) {
      setIsBudgetOpen(false);
    }

    setIsAdvancedOpen((currentValue) => !currentValue);
  };

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
      className="mt-5 w-full max-w-full cursor-default overflow-hidden rounded-lg bg-white p-3.5 shadow-[0_18px_54px_rgba(13,20,36,0.08)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-4 lg:mt-6"
      onSubmit={handleSubmit}
    >
      <input name="budget" type="hidden" value={selectedBudget} />
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(11.5rem,1.25fr)_minmax(10.25rem,1.05fr)_minmax(9.75rem,0.95fr)_minmax(8.5rem,0.78fr)_minmax(7.75rem,auto)] xl:items-end">
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
          <BudgetPreferenceField
            budgetPanelId={budgetPanelId}
            isBudgetOpen={isBudgetOpen}
            selectedBudget={selectedBudget}
            toggleBudgetOpen={() => setIsBudgetOpen((currentValue) => !currentValue)}
          />
        </div>

        <div className={mobileAdvancedClassName}>
          <HeroField label={t("filters.rating")}>
            <select className={selectClassName} defaultValue="" name="rating">
              <option value="">Tümü</option>
              {minimumRatingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t("filters.ratingAtLeast", { rating: option.value.replace(".", ",") })}
                </option>
              ))}
            </select>
          </HeroField>
        </div>

        <Button
          className="order-2 h-[3.25rem] min-h-[3.25rem] w-full rounded-lg px-6 font-semibold shadow-[0_18px_36px_rgba(255,138,0,0.28)] lg:order-none"
          type="submit"
        >
          {t("cta.findProvider")}
        </Button>

        <button
          aria-controls={advancedPanelId}
          aria-expanded={isAdvancedOpen}
          className={cn(
            "order-3 inline-flex min-h-11 w-full cursor-pointer select-none items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:col-span-2 lg:hidden",
            isAdvancedOpen
              ? "bg-[var(--brand-orange)] text-white"
              : "bg-[var(--surface-soft)] text-[var(--brand-navy)] hover:bg-[var(--brand-orange-soft)]",
          )}
          onClick={toggleAdvancedOpen}
          type="button"
        >
          {t("filters.advanced")}
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 transition-transform", isAdvancedOpen ? "rotate-180" : "")}
          />
        </button>
      </div>

      <div
        className={cn("mt-3 min-w-0", shouldShowBudgetTags ? "block" : "hidden")}
        id={budgetPanelId}
      >
        <BudgetPreferenceTags
          selectedBudget={selectedBudget}
          setSelectedBudget={setSelectedBudget}
        />
      </div>
    </form>
  );
}
