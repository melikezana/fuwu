import Link from "next/link";
import {
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  Star,
} from "lucide-react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { instantMatchServiceOptions } from "@/lib/constants/instantMatch";
import { appRoutes } from "@/lib/constants/navigation";
import {
  getProviderPhoneHref,
  getProviderWhatsAppHref,
  providerBudgetOptions,
  providerDistricts,
} from "@/lib/constants/providers";
import { getServiceIconNameForCategory, normalizeServiceValue } from "@/lib/constants/services";
import {
  getBudgetTagLabel,
  type InstantMatchedProvidersResult,
  type InstantMatchQuery,
} from "@/services/matching";
import type { Provider, ProviderFilterOptions } from "@/types/provider";

type SmartMatchSectionProps = {
  filterOptions: ProviderFilterOptions;
  isActive: boolean;
  matchQuery: InstantMatchQuery;
  matchResult: InstantMatchedProvidersResult;
};

type SmartMatchProviderResultProps = {
  provider: Provider;
};

const optionCardClassName =
  "flex min-h-16 w-full min-w-0 select-none flex-col items-center justify-center gap-1.5 rounded-md border border-[rgba(13,20,36,0.08)] bg-white px-2.5 py-2.5 text-center text-[0.82rem] font-semibold leading-4 text-[var(--brand-navy)] shadow-[0_8px_20px_rgba(13,20,36,0.04)] transition-all hover:border-[rgba(255,138,0,0.38)] hover:bg-[var(--brand-orange-soft)] peer-checked:border-[var(--brand-orange)] peer-checked:bg-[var(--brand-orange)] peer-checked:text-white peer-checked:shadow-[0_10px_24px_rgba(255,138,0,0.2)] sm:text-sm sm:leading-5";

const compactOptionClassName =
  "flex min-h-11 w-full min-w-0 select-none items-center justify-center rounded-md border border-[rgba(13,20,36,0.08)] bg-white px-3 py-2 text-center text-sm font-semibold leading-5 text-[var(--brand-navy)] shadow-[0_8px_20px_rgba(13,20,36,0.04)] transition-all hover:border-[rgba(255,138,0,0.38)] hover:bg-[var(--brand-orange-soft)] peer-checked:border-[var(--brand-orange)] peer-checked:bg-[var(--brand-orange)] peer-checked:text-white peer-checked:shadow-[0_10px_24px_rgba(255,138,0,0.2)]";

const visibleBudgetOptions = providerBudgetOptions.filter(
  (option) => option.value !== "acil-hizmet",
);

function isSelectedValue(currentValue: string | undefined, optionValue: string) {
  return normalizeServiceValue(currentValue ?? "") === normalizeServiceValue(optionValue);
}

function buildProviderListHref(matchQuery: InstantMatchQuery) {
  const params = new URLSearchParams();

  params.set("category", matchQuery.category);
  params.set("district", matchQuery.district);

  if (matchQuery.budgetTag) {
    params.set("budget", matchQuery.budgetTag);
  }

  return `${appRoutes.providers}?${params.toString()}`;
}

function SmartMatchProviderResult({ provider }: SmartMatchProviderResultProps) {
  const profileHref = `${appRoutes.providers}/${provider.id}`;
  const iconName = getServiceIconNameForCategory(provider.category);
  const displayPrice =
    provider.averagePrice && !/\b(null|undefined|nan)\b/i.test(provider.averagePrice)
      ? provider.averagePrice
      : "Fiyat bilgisi yakında";

  return (
    <article className="flex min-w-0 flex-col rounded-lg bg-white p-4 shadow-[0_12px_30px_rgba(13,20,36,0.05)] ring-1 ring-[rgba(13,20,36,0.08)]">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
          <ServiceIcon className="size-5" name={iconName} />
        </span>
        <div className="min-w-0">
          <Link
            className="block truncate text-base font-semibold text-[var(--brand-navy)] transition-colors hover:text-[var(--brand-orange-dark)]"
            href={profileHref}
          >
            {provider.name}
          </Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[var(--muted)]">
            <span>{provider.category}</span>
            <span aria-hidden="true">•</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {provider.district}
            </span>
          </p>
        </div>
        {provider.rating > 0 ? (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-yellow-50 px-2 py-1 text-xs font-semibold text-yellow-700 ring-1 ring-yellow-100">
            <Star className="size-3 fill-current" />
            {provider.rating.toFixed(1)}
          </span>
        ) : null}
      </div>

      <div className="mt-3 rounded-md bg-[#F7F7F8] px-3 py-2">
        <p className="text-xs font-semibold uppercase text-[var(--muted)]">Fiyat aralığı</p>
        <p className="mt-1 text-sm font-semibold text-[var(--brand-navy)]">{displayPrice}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {provider.whatsapp ? (
          <a
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#25D366]/10 px-3 text-sm font-semibold text-[#1DA851] transition-colors hover:bg-[#25D366]/20"
            href={getProviderWhatsAppHref(provider)}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageCircle className="size-4" />
            WhatsApp
          </a>
        ) : null}
        {provider.phone ? (
          <a
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--surface-soft)] px-3 text-sm font-semibold text-[var(--brand-navy)] transition-colors hover:bg-[#E5E7EB]"
            href={getProviderPhoneHref(provider)}
          >
            <Phone className="size-4" />
            Telefon
          </a>
        ) : null}
      </div>
    </article>
  );
}

function SmartMatchStepLabel({ children, step }: { children: string; step: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-[var(--brand-orange-dark)]">
      <span className="flex size-6 items-center justify-center rounded-md bg-[var(--brand-orange)] text-white">
        {step}
      </span>
      {children}
    </span>
  );
}

export function SmartMatchSection({
  filterOptions,
  isActive,
  matchQuery,
  matchResult,
}: SmartMatchSectionProps) {
  const districtOptions = filterOptions.districts.length ? filterOptions.districts : providerDistricts;
  const providerListHref = buildProviderListHref(matchQuery);
  const budgetLabel = getBudgetTagLabel(matchQuery.budgetTag);
  const matchedProviders = matchResult.providers;
  const hasResults = matchedProviders.length > 0;
  const shouldShowFallbackNotice = isActive && matchQuery.isComplete && matchResult.isFallback;

  return (
    <section className="border-b border-[var(--border)] bg-white" id="instant-match">
      <Container className="py-7 sm:py-9 lg:py-10">
        <div className="mb-4 flex min-w-0 cursor-default select-none flex-col gap-2 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[var(--brand-orange-dark)]">
              <Sparkles className="size-4" />
              Hızlı eşleşme
            </p>
            <h2 className="mt-2 max-w-[22rem] break-words text-2xl font-semibold leading-tight text-[var(--brand-navy)] sm:max-w-xl sm:text-3xl">
              Uygun ustaları saniyeler içinde gör.
            </h2>
          </div>
          <p className="max-w-[22rem] break-words text-sm font-medium leading-6 text-[var(--muted)] sm:max-w-md">
            Hizmet, ilçe ve bütçe seç. Sonuçlarda direkt WhatsApp veya telefonla ilerle.
          </p>
        </div>

        <form
          action={`${appRoutes.home}#instant-match`}
          className="min-w-0 rounded-lg bg-[#F7F7F8] p-4 shadow-[0_16px_42px_rgba(13,20,36,0.06)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-5"
          method="get"
        >
          <input name="instant_match" type="hidden" value="1" />
          <input name="match_time" type="hidden" value={matchQuery.timePreference ?? "bugun"} />

          <div>
            <SmartMatchStepLabel step={1}>Hizmet seç</SmartMatchStepLabel>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {instantMatchServiceOptions.map((option) => (
                <label className="min-w-0 cursor-pointer" key={option.value}>
                  <input
                    className="peer sr-only"
                    defaultChecked={
                      isSelectedValue(matchQuery.serviceLabel, option.label) ||
                      isSelectedValue(matchQuery.category, option.matchCategory)
                    }
                    name="match_service"
                    required
                    type="radio"
                    value={option.value}
                  />
                  <span className={optionCardClassName}>
                    <ServiceIcon className="size-5 shrink-0" name={option.iconName} />
                    <span className="min-w-0">{option.label}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(10rem,auto)] lg:items-end">
            <label className="min-w-0">
              <SmartMatchStepLabel step={2}>İlçe seç</SmartMatchStepLabel>
              <select
                className="mt-3 h-12 w-full min-w-0 cursor-pointer rounded-md border border-[rgba(13,20,36,0.12)] bg-white px-3.5 pr-10 text-sm font-semibold text-[var(--brand-navy)] outline-none transition-colors focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]"
                defaultValue={matchQuery.district}
                name="match_district"
                required
              >
                <option value="">İlçe seç</option>
                {districtOptions.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>

            <div className="min-w-0">
              <SmartMatchStepLabel step={3}>Bütçe seç</SmartMatchStepLabel>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {visibleBudgetOptions.map((option) => (
                  <label className="min-w-0 cursor-pointer" key={option.value}>
                    <input
                      className="peer sr-only"
                      defaultChecked={
                        matchQuery.budgetTag
                          ? matchQuery.budgetTag === option.value
                          : option.value === "standart"
                      }
                      name="match_budget"
                      required
                      type="radio"
                      value={option.value}
                    />
                    <span className={compactOptionClassName}>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button className="h-12 min-h-12 w-full whitespace-nowrap" type="submit">
              <span className="hidden sm:inline">Uygun Ustaları Göster</span>
              <span className="sm:hidden">Ustaları Göster</span>
            </Button>
          </div>
        </form>

        {isActive && matchQuery.isComplete ? (
          <div className="mt-5 rounded-lg bg-[#fffdf9] p-4 shadow-[0_14px_38px_rgba(13,20,36,0.05)] ring-1 ring-[rgba(255,138,0,0.18)] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="cursor-default select-none">
                <p className="text-sm font-semibold uppercase text-[var(--brand-orange-dark)]">
                  4. Uygun ustaları göster
                </p>
                <h3 className="mt-2 text-2xl font-semibold leading-tight text-[var(--brand-navy)]">
                  {hasResults ? `${matchedProviders.length} uygun usta` : "Uygun usta bulunamadı"}
                </h3>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--muted)]">
                  {matchQuery.serviceLabel} • {matchQuery.district}
                  {budgetLabel ? ` • ${budgetLabel}` : ""}
                </p>
              </div>
              <Button className="w-full sm:w-fit" href={providerListHref} variant="secondary">
                Tümünü Listele
              </Button>
            </div>

            {shouldShowFallbackNotice ? (
              <p className="mt-4 rounded-md border border-[rgba(255,138,0,0.22)] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[var(--brand-navy)]">
                Bu seçim için birebir eşleşme yok. En yakın uygun ustaları gösteriyoruz.
              </p>
            ) : null}

            {hasResults ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {matchedProviders.map((provider) => (
                  <SmartMatchProviderResult
                    key={provider.id}
                    provider={provider}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-lg bg-white p-5 text-center ring-1 ring-[rgba(13,20,36,0.08)]">
                <p className="text-base font-semibold text-[var(--brand-navy)]">
                  Bu seçim için yayında uygun usta yok.
                </p>
                <p className="mx-auto mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--muted)]">
                  İlçe veya bütçeyi değiştirerek daha fazla profili hızlıca deneyebilirsin.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </Container>
    </section>
  );
}
