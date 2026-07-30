"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";
import { homeCopy } from "@/lib/constants/home";
import type { Service } from "@/lib/constants/services";
import { trackFilterUsed } from "@/services/analytics";

type HeroSearchProps = {
  categories: string[];
  districts: string[];
  popularServices: readonly Service[];
};

export function HeroSearch({
  categories,
  districts,
  popularServices,
}: HeroSearchProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") ?? "");
    const district = String(formData.get("district") ?? "");

    trackFilterUsed({
      category: "",
      district,
      hasQuery: Boolean(query.trim()),
    });
  }

  return (
    <form
      action={appRoutes.providers}
      aria-label="Usta arama"
      className="mt-7 overflow-hidden rounded-lg border border-[rgba(20,33,61,0.1)] bg-white p-3 shadow-[var(--shadow-elevated)] sm:p-4"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(12rem,0.75fr)_auto] lg:items-end">
        <label className="block min-w-0">
          <span className="flex items-center gap-2 text-xs font-bold uppercase leading-4 text-[var(--muted)]">
            <Search aria-hidden="true" className="size-3.5 text-[var(--brand-orange-dark)]" />
            {homeCopy.hero.searchServiceLabel}
          </span>
          <input
            className="mt-2 h-[52px] min-h-[52px] w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-4 text-base font-semibold text-[var(--brand-navy)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand-orange)] focus:bg-white focus:ring-2 focus:ring-[var(--brand-orange-soft)]"
            list="home-service-options"
            name="q"
            placeholder={homeCopy.hero.searchServicePlaceholder}
            type="search"
          />
          <datalist id="home-service-options">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </label>

        <label className="block min-w-0">
          <span className="flex items-center gap-2 text-xs font-bold uppercase leading-4 text-[var(--muted)]">
            <MapPin aria-hidden="true" className="size-3.5 text-[var(--brand-orange-dark)]" />
            {homeCopy.hero.searchDistrictLabel}
          </span>
          <select
            className="mt-2 h-[52px] min-h-[52px] w-full cursor-pointer rounded-md border border-[var(--border)] bg-[var(--background)] px-4 text-base font-semibold text-[var(--brand-navy)] outline-none transition-colors focus:border-[var(--brand-orange)] focus:bg-white focus:ring-2 focus:ring-[var(--brand-orange-soft)]"
            defaultValue=""
            name="district"
          >
            <option value="">{homeCopy.hero.searchDistrictPlaceholder}</option>
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </label>

        <Button className="h-[52px] min-h-[52px] gap-2 px-6" type="submit">
          <Search aria-hidden="true" className="size-4" />
          {homeCopy.hero.primaryCta}
        </Button>
      </div>

      <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
          <SlidersHorizontal aria-hidden="true" className="size-4 text-[var(--brand-orange)]" />
          Hızlı başla
        </span>
        {popularServices.slice(0, 5).map((service) => (
          <Link
            className="inline-flex min-h-9 cursor-pointer items-center rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--brand-navy)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(249,115,22,0.35)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={service.href}
            key={service.id}
          >
            {service.title}
          </Link>
        ))}
      </div>
    </form>
  );
}
