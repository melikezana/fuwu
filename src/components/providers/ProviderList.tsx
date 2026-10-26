"use client";

import { UserRoundSearch } from "lucide-react";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";
import { getServiceDisplayLabel } from "@/lib/constants/services";
import { useI18n } from "@/lib/i18n";
import type { Provider } from "@/types/provider";
import { ProviderCard } from "./ProviderCard";

type ProviderListProps = {
  categoryDistrictEmptyState?: {
    category: string;
    district: string;
    requestHref: string;
  };
  isUnavailable?: boolean;
  hasActiveFilters?: boolean;
  providers: Provider[];
  totalCount: number;
  purchases?: Record<string, { priceMinor: number; href: string; serviceName: string }>;
};

function ProviderEmptyState({
  hasActiveFilters = false,
  requestHref,
  testId,
  title,
  isUnavailable,
}: {
  hasActiveFilters?: boolean;
  requestHref: string;
  testId?: string;
  title?: string;
  isUnavailable?: boolean;
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
        {isUnavailable ? "Usta listesine ulaşılamıyor" : title || (hasActiveFilters ? "Bu ölçütlere uygun usta bulunamadı." : "Bu alanda henüz usta yok")}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--muted)]">
        {isUnavailable ? "Listeyi yüklemek için biraz sonra tekrar deneyin veya hizmet kataloğunu inceleyin." : hasActiveFilters
          ? "Filtreleri temizleyerek diğer ustaları ve satın alınabilir hizmetleri inceleyebilirsin."
          : "Satın alınabilir hizmetleri katalogdan inceleyebilirsiniz."}
      </p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        {hasActiveFilters ? (
          <Button className="inline-flex" href={appRoutes.providers} variant="secondary">
            Filtreleri Temizle
          </Button>
        ) : null}
        <Button className="inline-flex" href={requestHref} variant="primary">
          Hizmet Satın Al
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
  isUnavailable = false,
  purchases = {},
}: ProviderListProps) {
  const { t } = useI18n();
  const hasNoPublicProviders = totalCount === 0;
  const resultHeading =
    isUnavailable ? "Profiller şu anda yüklenemiyor" : hasNoPublicProviders
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
      <div className="market-result-heading">
        <p className="market-eyebrow">
          {t("providers.list.eyebrow")}
        </p>
        <h2 className="mt-2 text-xl font-semibold leading-tight text-[var(--brand-navy)] sm:text-2xl">
          {resultHeading}
        </h2>
        <p aria-live="polite" className="mt-2 text-sm font-medium leading-6 text-[var(--muted)]">
          {t("providers.list.description", { count: totalCount })}
        </p>
      </div>

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
              purchase={purchases[provider.id]}
            />
          ))}
        </div>
      ) : (
        <ProviderEmptyState
          isUnavailable={isUnavailable}
          title={categoryDistrictEmptyState ? `Bu bölgede henüz ${getServiceDisplayLabel(categoryDistrictEmptyState.category)} ustası yok` : undefined}
          hasActiveFilters={hasActiveFilters && !hasNoPublicProviders}
          requestHref={categoryDistrictEmptyState?.requestHref || appRoutes.catalog}
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
