import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { appRoutes, ctaLabels } from "@/lib/constants/navigation";
import { serviceCategories } from "@/lib/constants/services";

type PopularServiceMeta = {
  badge: string;
  detail: string;
};

const popularServiceMeta: Record<string, PopularServiceMeta> = {
  plumbing: { badge: "Ev onarımı", detail: "Hızlı inceleme" },
  locksmith: { badge: "Acil destek", detail: "Hızlı iletişim" },
  electrical: { badge: "Ev onarımı", detail: "Ustaları karşılaştır" },
  cleaning: { badge: "En çok talep edilen", detail: "Dakikalar içinde talep" },
  "carpet-cleaning": { badge: "Ev bakımı", detail: "Servisleri karşılaştır" },
  "climate-appliance-service": { badge: "Sezonluk ihtiyaç", detail: "Ziyaret planla" },
};

const popularServices = serviceCategories.slice(0, 6).map((service) => ({
  ...service,
  ...(popularServiceMeta[service.id] ?? {
    badge: "Onaylı kategori",
    detail: "Ustaları karşılaştır",
  }),
}));

export function PopularServicesSection() {
  return (
    <section className="border-y border-[var(--border)] bg-white" id="popular-services">
      <Container className="py-14 sm:py-16 lg:py-20">
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionIntro
            eyebrow="İhtiyacını belirle"
            title="Temizlik, tamir ve teknik destek tek ekranda."
            description="Evde sık ihtiyaç duyulan işleri hızlıca başlat: net kapsam, net zamanlama, güvenli ilk adım."
          />
          <Button className="w-full sm:w-fit" href={appRoutes.services} variant="secondary">
            Hizmetleri İncele
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
          {popularServices.map((service) => (
            <Link
              aria-label={`${service.title} için talep oluştur`}
              className="group block h-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-orange)] focus-visible:ring-offset-2"
              href={`${appRoutes.request}?service=${encodeURIComponent(service.title)}`}
              key={service.id}
            >
              <Card className="flex h-full min-w-0 flex-col overflow-hidden !p-0 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-[rgba(255,138,0,0.42)] group-hover:shadow-[0_26px_80px_rgba(13,20,36,0.13)]">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--background)] p-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.24)] transition-colors duration-300 group-hover:bg-[var(--brand-orange)] group-hover:text-[var(--brand-navy)]">
                    <ServiceIcon name={service.iconName} />
                  </span>
                  <span className="rounded-md bg-[var(--brand-orange-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-orange-dark)]">
                    {service.badge}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <p className="text-sm font-semibold text-[var(--muted)]">{service.category}</p>
                  <h3 className="mt-2 text-xl font-semibold leading-tight text-[var(--brand-navy)]">
                    {service.title}
                  </h3>
                  <p className="mt-3 flex-1 leading-7 text-[var(--muted)]">
                    {service.description}
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-4 border-t border-[var(--border)] pt-4">
                    <span className="text-sm font-semibold text-[var(--brand-navy)]">
                      {service.detail}
                    </span>
                    <span className="shrink-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--brand-orange-dark)] transition-colors duration-300 group-hover:border-[var(--brand-orange)] group-hover:bg-[var(--brand-orange)] group-hover:text-[var(--brand-navy)]">
                      Talep Oluştur
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-3 rounded-lg border border-[rgba(255,138,0,0.26)] bg-[var(--brand-orange-soft)] p-4 text-[var(--brand-navy)] sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
          <p className="font-semibold leading-6">
            Daha özel bir ihtiyacın mı var? Bir kez anlat, Fuwu ihtiyacını netleştirsin.
          </p>
          <Button className="w-full sm:w-fit" href={appRoutes.request}>
            {ctaLabels.request}
          </Button>
        </div>
      </Container>
    </section>
  );
}
