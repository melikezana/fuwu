"use client";

import { UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";
import { useI18n } from "@/lib/i18n";
import type { Provider } from "@/types/provider";
import { ProviderCard } from "./ProviderCard";

type ProviderListProps = {
  categoryDistrictEmptyState?: {
    requestHref: string;
  };
  providers: Provider[];
  totalCount: number;
};

function ProviderEmptyState({
  requestHref,
  testId,
}: {
  requestHref: string;
  testId?: string;
}) {
  return (
    <div
      className="col-span-full mt-6 py-16 text-center"
      data-testid={testId}
    >
      <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-[var(--brand-orange-soft)]">
        <UserRoundSearch
          className="size-10 text-[var(--brand-orange)]"
          aria-hidden
        />
      </div>
      <h3 className="text-xl font-bold text-[var(--brand-navy)]">
        Bu alanda henüz usta yok
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--muted)]">
        İhtiyacını bırak, uygun usta müsait olduğunda seni bilgilendirelim.
      </p>
      <Button
        className="mt-6 inline-flex"
        href={requestHref}
        variant="primary"
      >
        Talep Oluştur
      </Button>
    </div>
  );
}

export function ProviderList({
  categoryDistrictEmptyState,
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
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

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
        <div className={`mt-6 grid auto-rows-fr gap-4 ${providerGridClassName}`}>
          {providers.map((provider, index) => (
            <ProviderCard
              featured={index < 2}
              key={provider.id}
              provider={provider}
            />
          ))}
        </div>
      ) : (
        <ProviderEmptyState
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
