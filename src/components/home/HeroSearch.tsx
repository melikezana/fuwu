"use client";

import type { FormEvent } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";
import { homeCopy } from "@/lib/constants/home";
import { trackFilterUsed } from "@/services/analytics";

type HeroSearchProps = {
  categories: string[];
  districts: string[];
};

export function HeroSearch({ categories, districts }: HeroSearchProps) {
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
      className="mt-6 overflow-hidden rounded-lg border border-[rgba(10,37,64,0.08)] bg-white shadow-[0_24px_70px_rgba(10,37,64,0.12)]"
      onSubmit={handleSubmit}
    >
      <div className="grid min-w-0 gap-0 md:grid-cols-[minmax(0,1.16fr)_minmax(10.75rem,0.74fr)_7.75rem]">
        <label className="grid min-h-[58px] min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-center border-b border-[var(--border)] px-2 md:border-b-0 md:border-r">
          <Search aria-hidden="true" className="mx-auto size-5 text-[var(--muted)]" />
          <span className="sr-only">{homeCopy.hero.searchServiceLabel}</span>
          <input
            className="h-full min-w-0 bg-transparent pr-3 text-[0.95rem] font-semibold text-[var(--brand-navy)] outline-none placeholder:text-[var(--muted)]"
            list="home-service-options"
            name="q"
            placeholder="Hangi hizmete ihtiyacın var?"
            type="search"
          />
          <datalist id="home-service-options">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </label>

        <label className="grid min-h-[58px] min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-center border-b border-[var(--border)] px-2 md:border-b-0 md:border-r">
          <MapPin aria-hidden="true" className="mx-auto size-5 text-[var(--brand-navy)]" />
          <span className="sr-only">{homeCopy.hero.searchDistrictLabel}</span>
          <select
            className="h-full min-w-0 cursor-pointer truncate bg-transparent pr-3 text-[0.95rem] font-semibold text-[var(--brand-navy)] outline-none"
            defaultValue=""
            name="district"
          >
            <option value="">Konum seç</option>
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </label>

        <div className="min-w-0 p-1.5">
          <Button className="h-12 min-h-12 w-full rounded-md px-4 md:w-[7.75rem]" type="submit">
            Usta Bul
          </Button>
        </div>
      </div>
    </form>
  );
}
