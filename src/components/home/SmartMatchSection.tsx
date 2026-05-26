import Link from "next/link";
import {
  ClipboardList,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  Star,
  UserSearch,
} from "lucide-react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { instantMatchServiceOptions, instantMatchTimeOptions } from "@/lib/constants/instantMatch";
import { appRoutes } from "@/lib/constants/navigation";
import {
  getProviderPhoneHref,
  getProviderWhatsAppHref,
  providerBudgetOptions,
  providerDistricts,
} from "@/lib/constants/providers";
import { getServiceIconNameForCategory, normalizeServiceValue } from "@/lib/constants/services";
import { cn } from "@/lib/utils";
import {
  getBudgetTagLabel,
  getTimePreferenceLabel,
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
  requestHref: string;
};

const optionCardClassName =
  "flex min-h-[4.35rem] w-full min-w-0 select-none flex-col items-center justify-center gap-1.5 rounded-lg border border-[rgba(13,20,36,0.08)] bg-white px-2.5 py-3 text-center text-[0.82rem] font-black leading-4 text-[var(--brand-navy)] shadow-[0_8px_22px_rgba(13,20,36,0.04)] transition-all hover:border-[rgba(255,138,0,0.38)] hover:bg-[var(--brand-orange-soft)] peer-checked:border-[var(--brand-orange)] peer-checked:bg-[var(--brand-orange)] peer-checked:text-white peer-checked:shadow-[0_14px_32px_rgba(255,138,0,0.22)] sm:text-sm sm:leading-5";

const compactOptionClassName =
  "flex min-h-14 w-full min-w-0 select-none flex-col justify-center rounded-lg border border-[rgba(13,20,36,0.08)] bg-white px-3 py-2 text-center text-sm font-black leading-5 text-[var(--brand-navy)] shadow-[0_8px_22px_rgba(13,20,36,0.04)] transition-all hover:border-[rgba(255,138,0,0.38)] hover:bg-[var(--brand-orange-soft)] peer-checked:border-[var(--brand-orange)] peer-checked:bg-[var(--brand-orange)] peer-checked:text-white peer-checked:shadow-[0_14px_32px_rgba(255,138,0,0.22)]";

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

function buildRequestHref(matchQuery: InstantMatchQuery) {
  const params = new URLSearchParams();
  const budgetLabel = getBudgetTagLabel(matchQuery.budgetTag);
  const timeLabel = getTimePreferenceLabel(matchQuery.timePreference);
  const notes = [
    budgetLabel ? `Bütçe tercihi: ${budgetLabel}` : "",
    matchQuery.timeIntent.requestNote,
    "Kaynak: Hızlı Eşleşme",
  ]
    .filter(Boolean)
    .join("\n");

  params.set("service", matchQuery.category);
  params.set("district", matchQuery.district);

  if (matchQuery.budgetTag) {
    params.set("budget", matchQuery.budgetTag);
  }

  if (matchQuery.timePreference) {
    params.set("time", matchQuery.timePreference);
    params.set("match_time", matchQuery.timePreference);
  }

  if (timeLabel) {
    params.set("time_label", timeLabel);
  }

  if (notes) {
    params.set("notes", notes);
  }

  return `${appRoutes.request}?${params.toString()}`;
}

function SmartMatchProviderResult({ provider, requestHref }: SmartMatchProviderResultProps) {
  const profileHref = `${appRoutes.providers}/${provider.id}`;
  const iconName = getServiceIconNameForCategory(provider.category);

  return (
    <article className="flex min-w-0 flex-col rounded-lg bg-white p-4 shadow-[0_12px_34px_rgba(13,20,36,0.06)] ring-1 ring-[rgba(13,20,36,0.08)]">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
          <ServiceIcon className="size-5" name={iconName} />
        </span>
        <div className="min-w-0">
          <Link
            className="block truncate text-base font-black text-[var(--brand-navy)] transition-colors hover:text-[var(--brand-orange-dark)]"
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
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-yellow-50 px-2 py-1 text-xs font-black text-yellow-700 ring-1 ring-yellow-100">
            <Star className="size-3 fill-current" />
            {provider.rating.toFixed(1)}
          </span>
        ) : null}
      </div>

      <div className="mt-3 rounded-md bg-[#F7F7F8] px-3 py-2">
        <p className="text-xs font-black uppercase text-[var(--muted)]">Fiyat aralığı</p>
        <p className="mt-1 text-sm font-black text-[var(--brand-navy)]">{provider.averagePrice}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {provider.whatsapp ? (
          <a
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#25D366]/10 px-3 text-sm font-black text-[#1DA851] transition-colors hover:bg-[#25D366]/20"
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
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--surface-soft)] px-3 text-sm font-black text-[var(--brand-navy)] transition-colors hover:bg-[#E5E7EB]"
            href={getProviderPhoneHref(provider)}
          >
            <Phone className="size-4" />
            Telefon
          </a>
        ) : null}
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-black text-[var(--brand-navy)] transition-colors hover:bg-[var(--surface-soft)]"
          href={profileHref}
        >
          <UserSearch className="size-4" />
          Profili İncele
        </Link>
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(255,138,0,0.18)] transition-colors hover:bg-[var(--brand-orange-dark)]"
          href={requestHref}
        >
          <ClipboardList className="size-4" />
          Talep Oluştur
        </Link>
      </div>
    </article>
  );
}

function SmartMatchStepLabel({ children, step }: { children: string; step: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-[var(--brand-orange-dark)]">
      <span className="flex size-6 items-center justify-center rounded-md bg-[var(--brand-orange)] text-white">
        {step}
      </span>
      {children}
    </span>
  );
}

function ProgressIndicator({
  isActive,
  matchQuery,
}: {
  isActive: boolean;
  matchQuery: InstantMatchQuery;
}) {
  const steps = [
    { label: "Hizmet", isComplete: Boolean(matchQuery.category) },
    { label: "İlçe", isComplete: Boolean(matchQuery.district) },
    { label: "Bütçe", isComplete: Boolean(matchQuery.budgetTag) },
    { label: "Zaman", isComplete: Boolean(matchQuery.timePreference) },
    { label: "Eşleşme", isComplete: isActive && matchQuery.isComplete },
  ];

  return (
    <div aria-label="Hızlı eşleşme ilerlemesi" className="grid grid-cols-5 gap-1.5">
      {steps.map((step, index) => (
        <div
          className={cn(
            "min-w-0 rounded-md px-1.5 py-2 text-center text-[0.65rem] font-black leading-4 ring-1",
            step.isComplete
              ? "bg-[var(--brand-orange)] text-white ring-[var(--brand-orange)]"
              : "bg-white text-[var(--muted)] ring-[rgba(13,20,36,0.08)]",
          )}
          key={step.label}
        >
          <span className="block">{index + 1}</span>
          <span className="block truncate">{step.label}</span>
        </div>
      ))}
    </div>
  );
}

export function SmartMatchSection({
  filterOptions,
  isActive,
  matchQuery,
  matchResult,
}: SmartMatchSectionProps) {
  const districtOptions = filterOptions.districts.length ? filterOptions.districts : providerDistricts;
  const requestHref = buildRequestHref(matchQuery);
  const providerListHref = buildProviderListHref(matchQuery);
  const budgetLabel = getBudgetTagLabel(matchQuery.budgetTag);
  const timeLabel = getTimePreferenceLabel(matchQuery.timePreference);
  const matchedProviders = matchResult.providers;
  const hasResults = matchedProviders.length > 0;
  const shouldShowFallbackNotice = isActive && matchQuery.isComplete && matchResult.isFallback;

  return (
    <section className="border-b border-[var(--border)] bg-white" id="instant-match">
      <Container className="py-8 sm:py-10 lg:py-12">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start">
          <div className="min-w-0 cursor-default select-none">
            <p className="inline-flex items-center gap-2 text-sm font-black uppercase text-[var(--brand-orange-dark)]">
              <Sparkles className="size-4" />
              Hızlı Eşleşme
            </p>
            <h2 className="mt-3 max-w-xl text-2xl font-black leading-tight text-[var(--brand-navy)] sm:text-3xl">
              Seçenekleri işaretle, uygun ustaları hemen gör.
            </h2>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
              Uzun not yazmadan hizmet, ilçe, bütçe ve zaman tercihini seç. Sonraki adımda direkt
              WhatsApp, telefon veya profil inceleme aksiyonları gelir.
            </p>
            <div className="mt-5 max-w-xl">
              <ProgressIndicator isActive={isActive} matchQuery={matchQuery} />
            </div>
          </div>

          <form
            action={`${appRoutes.home}#instant-match`}
            className="min-w-0 rounded-lg bg-[#F7F7F8] p-4 shadow-[0_18px_50px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-5"
            method="get"
          >
            <input name="instant_match" type="hidden" value="1" />

            <div>
              <SmartMatchStepLabel step={1}>Hizmet seç</SmartMatchStepLabel>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
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

            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <label className="min-w-0">
                <SmartMatchStepLabel step={2}>İlçe seç</SmartMatchStepLabel>
                <select
                  className="mt-3 h-14 w-full min-w-0 cursor-pointer rounded-lg border border-[rgba(13,20,36,0.12)] bg-white px-3.5 pr-10 text-sm font-black text-[var(--brand-navy)] outline-none transition-colors focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]"
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
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {providerBudgetOptions.map((option) => (
                    <label className="min-w-0 cursor-pointer" key={option.value}>
                      <input
                        className="peer sr-only"
                        defaultChecked={matchQuery.budgetTag === option.value}
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
            </div>

            <div className="mt-5">
              <SmartMatchStepLabel step={4}>Zaman seç</SmartMatchStepLabel>
              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                {instantMatchTimeOptions.map((option) => (
                  <label className="min-w-0 cursor-pointer" key={option.value}>
                    <input
                      className="peer sr-only"
                      defaultChecked={matchQuery.timePreference === option.value}
                      name="match_time"
                      required
                      type="radio"
                      value={option.value}
                    />
                    <span className={compactOptionClassName}>
                      <span>{option.label}</span>
                      <span className="mt-1 hidden text-[0.68rem] font-semibold leading-4 opacity-80 sm:block">
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold leading-6 text-[var(--muted)]">
                <Clock3 className="mr-1 inline size-4 align-[-3px] text-[var(--brand-orange-dark)]" />
                Eşleşme; kategori, ilçe, bütçe ve puana göre sıralanır.
              </p>
              <Button className="w-full sm:w-fit" type="submit">
                Uygun Ustaları Göster
              </Button>
            </div>
          </form>
        </div>

        {isActive && matchQuery.isComplete ? (
          <div className="mt-6 rounded-lg bg-[#fffdf9] p-4 shadow-[0_14px_42px_rgba(13,20,36,0.05)] ring-1 ring-[rgba(255,138,0,0.18)] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="cursor-default select-none">
                <p className="text-sm font-black uppercase text-[var(--brand-orange-dark)]">
                  5. Eşleşmeleri göster
                </p>
                <h3 className="mt-2 text-2xl font-black leading-tight text-[var(--brand-navy)]">
                  {hasResults ? `${matchedProviders.length} uygun usta` : "Uygun usta bulunamadı"}
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--muted)]">
                  {matchQuery.serviceLabel} • {matchQuery.district}
                  {budgetLabel ? ` • ${budgetLabel}` : ""}
                  {timeLabel ? ` • ${timeLabel}` : ""}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="w-full sm:w-fit" href={requestHref} variant="secondary">
                  Talep Oluştur
                </Button>
                <Button className="w-full sm:w-fit" href={providerListHref} variant="ghost">
                  Tümünü Listele
                </Button>
              </div>
            </div>

            {shouldShowFallbackNotice ? (
              <p className="mt-4 rounded-md border border-[rgba(255,138,0,0.22)] bg-white px-4 py-3 text-sm font-black leading-6 text-[var(--brand-navy)]">
                Bu seçim için birebir eşleşme yok. En yakın uygun ustaları gösteriyoruz.
              </p>
            ) : null}

            {hasResults ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {matchedProviders.map((provider) => (
                  <SmartMatchProviderResult
                    key={provider.id}
                    provider={provider}
                    requestHref={requestHref}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-lg bg-white p-5 text-center ring-1 ring-[rgba(13,20,36,0.08)]">
                <p className="text-base font-black text-[var(--brand-navy)]">
                  Bu seçim için yayında uygun usta yok.
                </p>
                <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)]">
                  Fuwu sahte profil göstermeden devam eder. Talep oluşturursan seçtiğin hizmet,
                  ilçe, bütçe ve zaman tercihi forma hazır gelir.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </Container>
    </section>
  );
}
