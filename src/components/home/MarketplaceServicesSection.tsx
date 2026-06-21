import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { Container } from "@/components/ui/Container";
import { I18nText, type TranslationKey } from "@/lib/i18n";
import { serviceCategories, type Service } from "@/lib/constants/services";

const serviceHeaderBadges: Array<{
  icon: LucideIcon;
  label: string;
}> = [
  { icon: ShieldCheck, label: "Onaylı ustalar" },
  { icon: MessageCircle, label: "Hızlı iletişim" },
  { icon: MapPin, label: "İstanbul içi hizmet" },
];

const homeServiceCardDetails: Record<
  string,
  {
    description: string;
    trustLine: string;
  }
> = {
  plumbing: {
    description: "Su kaçağı, gider açma ve musluk değişimi için yakın ustaları karşılaştır.",
    trustLine: "Acil ve planlı işler için uygun profiller",
  },
  locksmith: {
    description: "Kapıda kalma, kilit değişimi ve oto çilingir için hızlıca destek bul.",
    trustLine: "Hızlı iletişim kurabileceğin ustalar",
  },
  electrical: {
    description: "Priz, aydınlatma, sigorta ve arıza tespiti için güvenilir ustaları gör.",
    trustLine: "Onaylı elektrik profilleri listelenir",
  },
  cleaning: {
    description: "Ev, ofis ve taşınma sonrası temizlik için uygun ekipleri karşılaştır.",
    trustLine: "Bölgen için müsait temizlik ekipleri",
  },
  "carpet-cleaning": {
    description: "Halı yıkama, teslim alma ve leke çıkarma hizmetlerini kolayca incele.",
    trustLine: "İstanbul içi servis seçenekleri",
  },
  "climate-appliance-service": {
    description: "Klima bakımı, montaj ve beyaz eşya arızaları için servisleri karşılaştır.",
    trustLine: "Teknik servis profilleri tek ekranda",
  },
  "furniture-assembly": {
    description: "Dolap, yatak, masa ve raf montajı için deneyimli ustalara ulaş.",
    trustLine: "Montaj işlerinde hızlı randevu akışı",
  },
  painting: {
    description: "Boya badana, rötuş ve yüzey hazırlığı için uygun ustaları seç.",
    trustLine: "Fiyat ve ilçe bilgisiyle karşılaştır",
  },
  "moving-help": {
    description: "Koli taşıma, küçük eşya nakli ve apartman içi taşıma desteği al.",
    trustLine: "Yakındaki taşıma desteğini filtrele",
  },
};

function ServiceCard({ service }: { service: Service }) {
  const titleKey = `services.${service.id}.title` as TranslationKey;
  const details = homeServiceCardDetails[service.id] ?? {
    description: service.description,
    trustLine: "Bölgen için uygun ustaları karşılaştır",
  };

  return (
    <Link
      aria-label={`${service.title} kategorisinde usta bul`}
      className="group flex h-full min-h-[254px] cursor-pointer flex-col rounded-lg border border-[rgba(13,20,36,0.08)] bg-white p-5 shadow-[var(--shadow-elevated)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(255,138,0,0.38)] hover:shadow-[var(--shadow-premium)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
      href={service.href}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.22)] transition-all duration-300 group-hover:bg-[var(--brand-orange)] group-hover:text-white group-hover:shadow-[var(--shadow-action)]">
          <ServiceIcon className="size-6" name={service.iconName} />
        </span>
        <span className="rounded-md border border-[var(--border)] bg-[#FAFAFA] px-2.5 py-1 text-xs font-bold leading-4 text-[#4B5563] transition-colors group-hover:border-[rgba(255,138,0,0.3)] group-hover:bg-[var(--brand-orange-soft)] group-hover:text-[var(--brand-navy)]">
          {service.category}
        </span>
      </div>

      <h3 className="mt-5 text-xl font-bold leading-tight text-[var(--brand-navy)]">
        <I18nText i18nKey={titleKey} />
      </h3>
      <p className="mt-3 min-h-12 text-sm font-medium leading-6 text-[#4B5563]">
        {details.description}
      </p>

      <div className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-md bg-[#FAFAFA] px-3 py-2 text-xs font-bold leading-4 text-[var(--brand-navy)] ring-1 ring-[rgba(13,20,36,0.06)]">
        <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-[var(--trust-green)]" />
        <span>{details.trustLine}</span>
      </div>

      <div className="mt-auto pt-5">
        <span className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-4 py-2.5 text-sm font-bold leading-5 text-white shadow-[var(--shadow-action)] transition-all duration-200 group-hover:bg-[var(--brand-orange-dark)] group-hover:shadow-[var(--shadow-action)]">
          Usta Bul
          <ArrowRight aria-hidden="true" className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function MarketplaceServicesSection() {
  return (
    <section className="bg-[#FAFAFA]" id="services">
      <Container className="py-12 sm:py-16 lg:py-20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl cursor-default select-none">
            <p className="text-sm font-bold uppercase text-[var(--brand-orange-dark)]">
              Hizmet kategorileri
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl">
              İhtiyacını Seç
            </h2>
            <p className="mt-4 text-base font-medium leading-7 text-[#4B5563]">
              Evindeki ihtiyacı seç, uygun ustaları dakikalar içinde karşılaştır.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {serviceHeaderBadges.map((badge) => {
              const Icon = badge.icon;

              return (
                <span
                  className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[rgba(13,20,36,0.08)] bg-white px-3 py-2 text-xs font-bold leading-4 text-[var(--brand-navy)] shadow-[var(--shadow-subtle)]"
                  key={badge.label}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0 text-[var(--brand-orange-dark)]" />
                  {badge.label}
                </span>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-5">
          {serviceCategories.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </Container>
    </section>
  );
}
