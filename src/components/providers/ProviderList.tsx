"use client";

import { UserRoundSearch } from "lucide-react";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { PremiumCard } from "@/components/ui/Premium";
import { appRoutes } from "@/lib/constants/navigation";
import { useI18n } from "@/lib/i18n";
import type { Provider } from "@/types/provider";
import { ProviderCard } from "./ProviderCard";

type ProviderListProps = {
  categoryDistrictEmptyState?: {
    requestHref: string;
  };
  hasActiveFilters?: boolean;
  providers: Provider[];
  totalCount: number;
};

function ProviderEmptyState({
  hasActiveFilters = false,
  requestHref,
  testId,
}: {
  hasActiveFilters?: boolean;
  requestHref: string;
  testId?: string;
}) {
  return (
    <div
      className="premium-card col-span-full mt-6 px-5 py-12 text-center sm:px-8"
      data-testid={testId}
    >
      <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-lg bg-[var(--brand-orange-soft)] shadow-[var(--shadow-subtle)]">
        <UserRoundSearch
          className="size-10 text-[var(--brand-orange)]"
          aria-hidden
        />
      </div>
      <h3 className="text-xl font-bold text-[var(--brand-navy)]">
        {hasActiveFilters ? "Bu ölçütlere uygun usta bulunamadı." : "Bu alanda henüz usta yok"}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--muted)]">
        {hasActiveFilters
          ? "Filtreleri temizleyerek daha geniş bir listeye dönebilir veya ihtiyacını talep olarak bırakabilirsin."
          : "İhtiyacını bırak, uygun usta müsait olduğunda seni bilgilendirelim."}
      </p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        {hasActiveFilters ? (
          <Button className="inline-flex" href={appRoutes.providers} variant="secondary">
            Filtreleri Temizle
          </Button>
        ) : null}
        <Button className="inline-flex" href={requestHref} variant="primary">
          Talep Oluştur
        </Button>
      </div>
    </div>
  );
}

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
        ? providers.length === 1
          ? "1 uygun usta bulundu"
          : t("providers.list.count", { count: providers.length })
        : t("providers.list.noMatches");
  const providerGridClassName =
    providers.length === 1 ? "justify-center" : "";
  const providerGridStyle: CSSProperties = {
    gridTemplateColumns:
      providers.length === 1
        ? "minmax(0, min(100%, 28rem))"
        : "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
  };

  return (
    <section>
      <PremiumCard className="premium-reveal cursor-default select-none">
        <p className="text-sm font-semibold uppercase text-[var(--brand-orange-dark)]">
          {t("providers.list.eyebrow")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-[var(--brand-navy)] sm:text-3xl">
          {resultHeading}
        </h2>
        <p aria-live="polite" className="mt-2 text-sm font-medium leading-6 text-[var(--muted)]">
          {t("providers.list.description", { count: totalCount })}
        </p>
      </PremiumCard>

      {providers.length > 0 ? (
        <div
          className={`mt-6 grid auto-rows-fr items-stretch gap-5 sm:gap-6 ${providerGridClassName}`}
          style={providerGridStyle}
        >
          {providers.map((provider) => (
            <ProviderCard
              galleryPreviewUrl={provider.galleryPreviewUrl}
              key={provider.id}
              provider={provider}
            />
          ))}
        </div>
      ) : (
        <ProviderEmptyState
          hasActiveFilters={hasActiveFilters && !hasNoPublicProviders}
          requestHref={categoryDistrictEmptyState?.requestHref ?? appRoutes.request}
          testId={
            categoryDistrictEmptyState
              ? "provider-category-district-empty-state"
              : undefined
          }
        />
      )}
    </section>
  );
}
