"use client";

import { CheckCircle2, ShieldCheck } from "lucide-react";
import { HeroCategoryFilter } from "@/components/home/HeroCategoryFilter";
import { HeroDistrictFilter } from "@/components/home/HeroDistrictFilter";
import {
  HeroFilterSummaryPill,
} from "@/components/home/HeroFilterShell";
import { HeroPaymentFilter } from "@/components/home/HeroPaymentFilter";
import { HeroPriceFilter } from "@/components/home/HeroPriceFilter";
import {
  formatHeroPrice,
  formatProviderNotificationCount,
  useHeroFilters,
} from "@/components/home/useHeroFilters";
import { Button } from "@/components/ui/Button";
import { TextLink } from "@/components/ui/TextLink";
import {
  PAYMENT_PREFERENCES,
  getPaymentPreferenceLabel,
  type ServiceRequestPaymentPreference,
} from "@/services/payments";
import type { ProviderFilterOptions } from "@/services/providers";

type HomeHeroFiltersProps = {
  filterOptions: ProviderFilterOptions;
};

const paymentOptions: Array<{
  description: string;
  label: string;
  value: ServiceRequestPaymentPreference;
}> = [
  {
    description: "Usta geldiğinde öde",
    label: "Nakit",
    value: PAYMENT_PREFERENCES.cash,
  },
  {
    description: "IBAN bilgisi usta kabulünden sonra paylaşılır.",
    label: "IBAN",
    value: PAYMENT_PREFERENCES.iban,
  },
];

export function HomeHeroFilters({ filterOptions }: HomeHeroFiltersProps) {
  const filters = useHeroFilters(filterOptions);

  if (filters.submittedRequest) {
    const submittedRequest = filters.submittedRequest;

    return (
      <div className="mt-6 w-full overflow-hidden rounded-xl bg-white p-5 shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6 lg:mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-md bg-[var(--trust-green-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--trust-green)]">
              <CheckCircle2 className="size-4" aria-hidden />
              Acil talep iletildi
            </span>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-[var(--brand-navy)]">
              Acil talebiniz uygun ustalara iletildi.
            </h2>
            <p className="mt-2 max-w-xl text-sm font-normal leading-6 text-[var(--muted)]">
              Henüz usta ataması yapılmadı. İlk uygun usta kabul ettiğinde varış ve güvenli
              başlangıç durumu aynı akışta görünür.
            </p>
          </div>
          <span className="w-fit rounded-md bg-[#F9FAFB] px-3 py-2 text-xs font-semibold text-[var(--brand-navy)] ring-1 ring-[rgba(13,20,36,0.08)]">
            {submittedRequest.requestCode}
          </span>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            [
              "Tahmini varış",
              submittedRequest.estimatedArrivalText ?? "Usta kabul edince netleşir",
            ],
            [
              "Bilgilendirilen usta",
              formatProviderNotificationCount(submittedRequest.providerCountNotified),
            ],
            ["Teklif", formatHeroPrice(submittedRequest.offeredPrice ?? filters.offeredPrice)],
            [
              "Ödeme",
              getPaymentPreferenceLabel(
                submittedRequest.paymentPreference ?? filters.paymentPreference,
              ),
            ],
            [
              "Doğrulama durumu",
              submittedRequest.confirmationCode
                ? "Kod üretildi"
                : "Usta kabul edince paylaşılacak",
            ],
          ].map(([label, value]) => (
            <div
              className="rounded-lg bg-[#F9FAFB] p-3 ring-1 ring-[rgba(13,20,36,0.06)]"
              key={label}
            >
              <dt className="text-[0.68rem] font-medium uppercase text-[var(--muted)]">
                {label}
              </dt>
              <dd className="mt-1 text-sm font-semibold leading-5 text-[var(--brand-navy)]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <form
      className="mt-6 w-full max-w-[calc(100vw-2rem)] min-w-0 rounded-xl bg-white p-4 shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)] sm:max-w-full sm:p-5 lg:mt-8"
      onSubmit={filters.handleSubmit}
    >
      <div className="border-b border-[rgba(13,20,36,0.08)] pb-4">
        <h2 className="text-wrap-anywhere break-words text-xl font-semibold leading-tight text-[var(--brand-navy)]">
          Acil usta çağır
        </h2>
        <p className="mt-2 max-w-2xl text-sm font-normal leading-6 text-[var(--muted)]">
          Hizmetini, ilçeni ve teklifini seç. Uygun ustalara hemen iletelim.
        </p>
      </div>

      {filters.completedStepPills.length > 0 ? (
        <div
          aria-label="Tamamlanan acil eşleşme adımları"
          className="mt-4 flex flex-wrap gap-2"
        >
          {filters.completedStepPills.map((pill) => (
            <HeroFilterSummaryPill
              key={pill.label}
              label={pill.label}
              onClick={pill.onClick}
              value={pill.value}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-4">
        {filters.activeStep === "service" ? (
          <HeroCategoryFilter
            onSelect={filters.handleServiceSelect}
            selectedServiceId={filters.selectedServiceId}
            services={filters.emergencyServices}
          />
        ) : null}

        {filters.activeStep === "district" ? (
          <HeroDistrictFilter
            district={filters.district}
            districtSearch={filters.districtSearch}
            filteredDistrictOptions={filters.filteredDistrictOptions}
            highlightedDistrictIndex={filters.highlightedDistrictIndex}
            onHighlight={filters.setHighlightedDistrictIndex}
            onKeyDown={filters.handleDistrictKeyDown}
            onSearchChange={filters.handleDistrictSearchChange}
            onSelect={filters.handleDistrictSelect}
          />
        ) : null}

        {filters.activeStep === "price" ? (
          <HeroPriceFilter
            offeredPrice={filters.offeredPrice}
            onContinue={filters.handleManualPriceContinue}
            onInputChange={filters.handlePriceInputChange}
            onSelect={filters.handlePriceSelect}
            priceError={filters.priceError}
            priceInputValue={filters.priceInputValue}
            priceOptions={filters.priceOptions}
            priceRange={filters.priceRange}
            selectedServiceLabel={filters.selectedServiceLabel}
          />
        ) : null}

        {filters.activeStep === "payment" ? (
          <HeroPaymentFilter
            onSelect={filters.handlePaymentSelect}
            options={paymentOptions}
            paymentPreference={filters.paymentPreference}
          />
        ) : null}

        {filters.activeStep === "submit" && filters.paymentPreference ? (
          <section className="rounded-lg border border-[rgba(255,138,0,0.34)] bg-[#fffdf9] p-4 shadow-[var(--shadow-card)] ring-2 ring-[rgba(255,138,0,0.16)] sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">
                  Çağrı hazır
                </p>
                <h3 className="mt-1 text-2xl font-semibold leading-tight text-[var(--brand-navy)]">
                  Acil Usta Çağır
                </h3>
                <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted)]">
                  {filters.selectedServiceLabel} · {filters.district} ·{" "}
                  {formatHeroPrice(filters.offeredPrice)} ·{" "}
                  {getPaymentPreferenceLabel(filters.paymentPreference)}
                </p>
                {filters.paymentPreference === PAYMENT_PREFERENCES.iban ? (
                  <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-medium leading-6 text-[var(--brand-navy)] ring-1 ring-[rgba(13,20,36,0.08)]">
                    IBAN bilgisi usta kabulünden sonra paylaşılır.
                  </p>
                ) : null}
              </div>
              <Button
                className="h-12 min-h-12 w-full px-7 text-base lg:w-fit"
                disabled={filters.isSubmitting || !filters.isReadyToSubmit}
                type="submit"
                variant="premium"
              >
                {filters.isSubmitting ? "Çağrı açılıyor..." : "Acil Usta Çağır"}
              </Button>
            </div>
            <div className="mt-4 flex min-w-0 items-start gap-3 rounded-lg bg-white p-3 ring-1 ring-[rgba(13,20,36,0.06)]">
              <ShieldCheck
                className="mt-0.5 size-5 shrink-0 text-[var(--trust-green)]"
                aria-hidden
              />
              <p className="text-sm font-medium leading-6 text-[var(--muted)]">
                Usta kabul edince geçici doğrulama üretilir. Nakit veya IBAN tercihin kayıt
                altında kalır.
              </p>
            </div>
          </section>
        ) : null}
      </div>

      {filters.submitError ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {filters.submitError}{" "}
          <TextLink
            className="font-semibold text-red-800"
            href={filters.requestHref}
          >
            Güvenli akışla devam et
          </TextLink>
        </p>
      ) : null}
    </form>
  );
}
