import Link from "next/link";
import {
  ClipboardList,
  ListChecks,
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
import { appRoutes } from "@/lib/constants/navigation";
import {
  getProviderPhoneHref,
  getProviderWhatsAppHref,
  providerBudgetOptions,
} from "@/lib/constants/providers";
import { getServiceIconNameForCategory, services } from "@/lib/constants/services";
import { cn } from "@/lib/utils";
import { getBudgetTagLabel, type MatchQuery } from "@/services/matching";
import type { Provider, ProviderFilterOptions } from "@/types/provider";

type SmartMatchSectionProps = {
  filterOptions: ProviderFilterOptions;
  isActive: boolean;
  matchQuery: MatchQuery;
  matchedProviders: Provider[];
};

type SmartMatchProviderResultProps = {
  provider: Provider;
  requestHref: string;
};

const smartMatchServiceOrder = [
  "Tesisat",
  "Elektrik",
  "Temizlik",
  "Halı Yıkama",
  "Klima & Beyaz Eşya",
  "Mobilya Montaj",
  "Boya Badana",
  "Nakliye Yardımı",
  "Bahçe Bakımı",
  "Havuz Bakımı",
];

const fieldClassName =
  "mt-2 h-12 w-full min-w-0 rounded-md border border-[rgba(13,20,36,0.12)] bg-white px-3.5 text-sm font-semibold text-[var(--brand-navy)] outline-none transition-colors focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]";

function buildProviderListHref(matchQuery: MatchQuery) {
  const params = new URLSearchParams();

  params.set("category", matchQuery.service);
  params.set("district", matchQuery.district);

  if (matchQuery.budgetTag) {
    params.set("budget", matchQuery.budgetTag);
  }

  return `${appRoutes.providers}?${params.toString()}`;
}

function buildRequestHref(matchQuery: MatchQuery) {
  const params = new URLSearchParams();
  const budgetLabel = getBudgetTagLabel(matchQuery.budgetTag);
  const notes = [
    matchQuery.notes,
    budgetLabel ? `Bütçe tercihi: ${budgetLabel}` : "",
    "Kaynak: Hızlı Eşleşme",
  ]
    .filter(Boolean)
    .join("\n");

  params.set("service", matchQuery.service);
  params.set("district", matchQuery.district);

  if (matchQuery.budgetTag) {
    params.set("budget", matchQuery.budgetTag);
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
            className="block truncate text-base font-bold text-[var(--brand-navy)] transition-colors hover:text-[var(--brand-orange-dark)]"
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
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-yellow-50 px-2 py-1 text-xs font-bold text-yellow-700 ring-1 ring-yellow-100">
            <Star className="size-3 fill-current" />
            {provider.rating.toFixed(1)}
          </span>
        ) : null}
      </div>

      <div className="mt-3 rounded-md bg-[#F7F7F8] px-3 py-2">
        <p className="text-xs font-bold uppercase text-[var(--muted)]">Fiyat aralığı</p>
        <p className="mt-1 text-sm font-bold text-[var(--brand-navy)]">{provider.averagePrice}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {provider.whatsapp ? (
          <a
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#25D366]/10 px-3 text-sm font-bold text-[#1DA851] transition-colors hover:bg-[#25D366]/20"
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
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--surface-soft)] px-3 text-sm font-bold text-[var(--brand-navy)] transition-colors hover:bg-[#E5E7EB]"
            href={getProviderPhoneHref(provider)}
          >
            <Phone className="size-4" />
            Telefon
          </a>
        ) : null}
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--brand-navy)] transition-colors hover:bg-[var(--surface-soft)]"
          href={profileHref}
        >
          <UserSearch className="size-4" />
          Profili İncele
        </Link>
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-3 text-sm font-bold text-white shadow-[0_12px_26px_rgba(255,138,0,0.18)] transition-colors hover:bg-[var(--brand-orange-dark)]"
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

export function SmartMatchSection({
  filterOptions,
  isActive,
  matchQuery,
  matchedProviders,
}: SmartMatchSectionProps) {
  const serviceOptions = Array.from(
    new Set([
      ...smartMatchServiceOrder,
      ...services.map((service) => service.title),
      ...filterOptions.categories,
    ]),
  );
  const requestHref = buildRequestHref(matchQuery);
  const providerListHref = buildProviderListHref(matchQuery);
  const budgetLabel = getBudgetTagLabel(matchQuery.budgetTag);
  const hasResults = matchedProviders.length > 0;

  return (
    <section className="border-b border-[var(--border)] bg-white" id="smart-match">
      <Container className="py-8 sm:py-10 lg:py-12">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div className="min-w-0 cursor-default select-none">
            <p className="inline-flex items-center gap-2 text-sm font-black uppercase text-[var(--brand-orange-dark)]">
              <Sparkles className="size-4" />
              Hızlı Eşleşme
            </p>
            <h2 className="mt-3 max-w-xl text-2xl font-black leading-tight text-[var(--brand-navy)] sm:text-3xl">
              Hizmetini seç, bütçeni söyle, uygun ustaları gör.
            </h2>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
              Martı TAG benzeri hızlı seçim akışı: önce hizmet, sonra ilçe ve bütçe tercihi.
            </p>
          </div>

          <form
            action={`${appRoutes.home}#smart-match`}
            className="min-w-0 rounded-lg bg-[#F7F7F8] p-4 shadow-[0_18px_50px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-5"
            method="get"
          >
            <input name="smart_match" type="hidden" value="1" />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="min-w-0">
                <SmartMatchStepLabel step={1}>Hizmet seç</SmartMatchStepLabel>
                <select
                  className={`${fieldClassName} cursor-pointer pr-10`}
                  defaultValue={matchQuery.service}
                  name="match_service"
                  required
                >
                  <option value="">Hizmet seç</option>
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <SmartMatchStepLabel step={2}>İlçe seç</SmartMatchStepLabel>
                <select
                  className={`${fieldClassName} cursor-pointer pr-10`}
                  defaultValue={matchQuery.district}
                  name="match_district"
                  required
                >
                  <option value="">İlçe seç</option>
                  {filterOptions.districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5">
              <SmartMatchStepLabel step={3}>Bütçe tercihi seç</SmartMatchStepLabel>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {providerBudgetOptions.map((option) => {
                  const isSelected = matchQuery.budgetTag === option.value;

                  return (
                    <label className="min-w-0 cursor-pointer" key={option.value}>
                      <input
                        className="peer sr-only"
                        defaultChecked={isSelected}
                        name="match_budget"
                        required
                        type="radio"
                        value={option.value}
                      />
                      <span
                        className={cn(
                          "flex min-h-11 w-full items-center justify-center rounded-md border border-[rgba(13,20,36,0.08)] bg-white px-2 text-center text-sm font-bold leading-5 text-[var(--brand-navy)] transition-all hover:border-[rgba(255,138,0,0.4)] hover:bg-[var(--brand-orange-soft)] peer-checked:border-[var(--brand-orange)] peer-checked:bg-[var(--brand-orange)] peer-checked:text-white",
                          isSelected && "shadow-[0_12px_26px_rgba(255,138,0,0.18)]",
                        )}
                      >
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="mt-5 block min-w-0">
              <span className="text-xs font-black uppercase text-[var(--muted)]">
                Notlar
              </span>
              <textarea
                className="mt-2 min-h-24 w-full min-w-0 resize-y rounded-md border border-[rgba(13,20,36,0.12)] bg-white px-3.5 py-3 text-sm font-semibold leading-6 text-[var(--brand-navy)] outline-none transition-colors placeholder:text-[#6B7280] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]"
                defaultValue={matchQuery.notes}
                maxLength={500}
                name="match_notes"
                placeholder="Kısa not ekle"
              />
            </label>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold leading-6 text-[var(--muted)]">
                <ListChecks className="mr-1 inline size-4 align-[-3px] text-[var(--brand-orange-dark)]" />
                Uygun ustalar puan ve ilçe yakınlığına göre sıralanır.
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
                  4. Uygun ustaları göster
                </p>
                <h3 className="mt-2 text-2xl font-black leading-tight text-[var(--brand-navy)]">
                  {hasResults ? `${matchedProviders.length} uygun usta` : "Uygun usta bulunamadı"}
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--muted)]">
                  {matchQuery.service} • {matchQuery.district}
                  {budgetLabel ? ` • ${budgetLabel}` : ""}
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
                <p className="text-base font-bold text-[var(--brand-navy)]">
                  Bu seçimle yayında onaylı usta yok.
                </p>
                <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)]">
                  Fuwu sahte profil göstermeden devam eder. Talep bırakırsan bilgiler seçtiğin
                  hizmet, ilçe ve bütçeyle hazır gelir.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </Container>
    </section>
  );
}
