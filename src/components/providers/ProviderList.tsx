"use client";

import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";
import { useI18n } from "@/lib/i18n";
import type { Provider } from "@/types/provider";
import { ProviderCard } from "./ProviderCard";

type ProviderListProps = {
  categoryDistrictEmptyState?: {
    requestHref: string;
    title: string;
  };
  hasActiveFilters?: boolean;
  providers: Provider[];
  totalCount: number;
};

export function ProviderList({
  categoryDistrictEmptyState,
  hasActiveFilters = false,
  providers,
  totalCount,
}: ProviderListProps) {
  const { t } = useI18n();
  const hasNoPublicProviders = totalCount === 0;
  const resultHeading =
    hasNoPublicProviders
      ? t("providers.list.noPublic")
      : providers.length > 0
        ? t("providers.list.count", { count: providers.length })
        : t("providers.list.noMatches");
  const providerGridClassName =
    providers.length === 1
      ? "mx-auto max-w-2xl"
      : providers.length === 2
        ? "mx-auto max-w-5xl md:grid-cols-2"
        : "md:grid-cols-2 xl:grid-cols-3";

  return (
    <section>
      <div className="cursor-default select-none">
        <p className="text-sm font-semibold uppercase text-[var(--brand-orange-dark)]">
          {t("providers.list.eyebrow")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-[var(--brand-navy)] sm:text-3xl">
          {resultHeading}
        </h2>
        <p aria-live="polite" className="mt-2 text-sm font-medium leading-6 text-[var(--muted)]">
          {t("providers.list.description", { count: totalCount })}
        </p>
      </div>

      {providers.length > 0 ? (
        <div className={`mt-6 grid auto-rows-fr gap-5 ${providerGridClassName}`}>
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      ) : categoryDistrictEmptyState ? (
        <div
          className="mt-6 rounded-lg border border-[rgba(255,138,0,0.28)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-card)]"
          data-testid="provider-category-district-empty-state"
        >
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-base font-semibold text-[var(--brand-orange-dark)]">
            0
          </div>
          <p className="text-lg font-semibold text-[var(--brand-navy)]">
            {categoryDistrictEmptyState.title}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--muted)]">
            Talebini bırak, bölgeye uygun usta bulunduğunda süreç hemen başlasın.
          </p>
          <Button
            className="mt-5 w-full sm:w-fit"
            href={categoryDistrictEmptyState.requestHref}
          >
            Talep Oluştur
          </Button>
        </div>
      ) : (
        <div className="mt-6 cursor-default rounded-lg bg-white p-6 text-center shadow-[var(--shadow-card)] ring-1 ring-[rgba(13,20,36,0.08)]">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-base font-semibold text-[var(--brand-orange-dark)]">
            0
          </div>
          <p className="text-lg font-semibold text-[var(--brand-navy)]">
            {hasNoPublicProviders
              ? t("providers.empty.noPublicTitle")
              : t("providers.empty.noMatchesTitle")}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--muted)]">
            {hasActiveFilters
              ? "Bu kategori ve bölgede henüz uygun usta yok. Talep oluşturduğunda uygun ustalar bilgilendirilecek."
              : hasNoPublicProviders
                ? t("providers.empty.noPublicDescription")
                : t("providers.empty.noMatchesDescription")}
          </p>
          <Button className="mt-5 w-full sm:w-fit" href={appRoutes.request}>
            Talep Oluştur
          </Button>
        </div>
      )}
    </section>
  );
}
