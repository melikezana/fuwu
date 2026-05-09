import Link from "next/link";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Container } from "@/components/common/Container";
import { SectionIntro } from "@/components/common/SectionIntro";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { appRoutes, ctaLabels } from "@/constants/navigation";
import { services } from "@/constants/services";

const nearbyAreas = ["Kadıköy", "Ataşehir", "Beşiktaş", "Şişli", "Üsküdar"];

export function ServiceGrid() {
  return (
    <section className="bg-[var(--background)]" id="services">
      <Container className="py-12 sm:py-16 lg:py-20">
        <div className="flex min-w-0 flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionIntro
            eyebrow="İhtiyacını belirle"
            title="Bulunduğun bölge için doğru hizmeti seç."
            description="Temizlikten teknik servise kadar ihtiyacını belirle, ilçeni seç ve uygun ustaları listele."
          />
          <Button className="w-full sm:w-fit" href={appRoutes.request}>
            {ctaLabels.request}
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-white p-3 shadow-[0_16px_46px_rgba(13,20,36,0.05)]">
          <span className="px-2 text-sm font-bold text-[var(--muted)]">İlçeni belirle:</span>
          {nearbyAreas.map((area) => (
            <Link
              className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-bold text-[var(--brand-navy)] transition-colors hover:border-[var(--brand-orange)] hover:bg-[var(--brand-orange-soft)]"
              href={`${appRoutes.request}?location=${encodeURIComponent(area)}`}
              key={area}
            >
              {area}
            </Link>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
          {services.map((service) => (
            <Link
              aria-label={`${service.title} için usta bul`}
              className="group block h-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-orange)] focus-visible:ring-offset-2"
              href={service.href}
              key={service.id}
            >
              <Card className="flex h-full min-w-0 flex-col overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:border-[rgba(255,138,0,0.42)] group-hover:shadow-[0_26px_80px_rgba(13,20,36,0.13)]">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.24)] transition-all duration-300 group-hover:bg-[var(--brand-orange)] group-hover:text-[var(--brand-navy)] group-hover:ring-[rgba(255,138,0,0.38)]">
                    <ServiceIcon name={service.iconName} />
                  </span>
                  <span className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs font-bold text-[var(--muted)] transition-colors duration-300 group-hover:border-[rgba(255,138,0,0.32)] group-hover:bg-white group-hover:text-[var(--brand-navy)]">
                    {service.category}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-bold leading-tight text-[var(--brand-navy)]">
                  {service.title}
                </h3>
                <p className="mt-3 flex-1 leading-7 text-[var(--muted)]">
                  {service.description}
                </p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                  <span className="rounded-md bg-[var(--background)] px-3 py-2 text-sm font-bold leading-5 text-[var(--brand-navy)] transition-colors duration-300 group-hover:bg-[var(--brand-orange-soft)]">
                    {service.startingHint}
                  </span>
                  <span className="shrink-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs font-bold text-[var(--brand-orange-dark)] transition-all duration-300 group-hover:translate-x-0.5 group-hover:border-[var(--brand-orange)] group-hover:bg-[var(--brand-orange)] group-hover:text-[var(--brand-navy)]">
                    Usta Bul
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
