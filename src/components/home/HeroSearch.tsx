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
      className="mt-6 overflow-hidden rounded-lg border border-[rgba(10,37,64,0.08)] bg-white shadow-[0_18px_52px_rgba(10,37,64,0.1)]"
      onSubmit={handleSubmit}
    >
      <div className="grid min-w-0 gap-0 sm:grid-cols-[minmax(0,1.18fr)_minmax(11.5rem,0.72fr)_auto]">
        <label className="grid min-h-[58px] min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center border-b border-[var(--border)] px-2 sm:border-b-0 sm:border-r">
          <Search aria-hidden="true" className="mx-auto size-5 text-[var(--muted)]" />
          <span className="sr-only">{homeCopy.hero.searchServiceLabel}</span>
          <input
            className="h-full min-w-0 bg-transparent pr-3 text-sm font-semibold text-[var(--brand-navy)] outline-none placeholder:text-[var(--muted)] sm:text-base"
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

        <label className="grid min-h-[58px] min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center border-b border-[var(--border)] px-2 sm:border-b-0 sm:border-r">
          <MapPin aria-hidden="true" className="mx-auto size-5 text-[var(--brand-navy)]" />
          <span className="sr-only">{homeCopy.hero.searchDistrictLabel}</span>
          <select
            className="h-full min-w-0 cursor-pointer bg-transparent pr-3 text-sm font-semibold text-[var(--brand-navy)] outline-none sm:text-base"
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

        <div className="p-2">
          <Button className="h-[46px] min-h-[46px] w-full rounded-md px-6 sm:w-auto" type="submit">
            Usta Bul
          </Button>
        </div>
      </div>
    </form>
  );
}
