import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { Container } from "@/components/ui/Container";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { homeServiceVisuals } from "@/lib/constants/home";
import { appRoutes } from "@/lib/constants/navigation";
import type { Service } from "@/lib/constants/services";

type PopularServicesProps = {
  services: readonly Service[];
};

export function PopularServices({ services }: PopularServicesProps) {
  return (
    <section className="border-b border-[var(--border)] bg-white py-14 sm:py-16 lg:py-20" id="services">
      <Container className="max-w-[1240px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionIntro
            description="En çok aranan kategorilerden başla; sonuçları hizmete göre daraltıp profilleri karşılaştır."
            eyebrow="Popüler hizmetler"
            title="İhtiyacın olan hizmeti seç."
          />
          <Link
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-4 text-sm font-bold text-[var(--brand-navy)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(249,115,22,0.4)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.providers}
          >
            Tüm ustaları gör
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <div className="mt-8 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => {
            const visual = homeServiceVisuals[service.id] ?? {
              accent: "#F97316",
              iconName: service.iconName,
            };

            return (
              <Link
                className="group flex min-h-[13rem] cursor-pointer flex-col rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 shadow-[var(--shadow-subtle)] transition-all duration-200 hover:-translate-y-1 hover:border-[rgba(249,115,22,0.38)] hover:bg-white hover:shadow-[var(--shadow-card)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                href={service.href}
                key={service.id}
              >
                <span
                  className="relative flex size-14 shrink-0 items-center justify-center rounded-lg bg-white shadow-[var(--shadow-subtle)] ring-1 ring-[rgba(20,33,61,0.08)] transition-transform duration-200 group-hover:[transform:perspective(480px)_rotateX(8deg)_rotateY(-10deg)_translateY(-2px)]"
                  style={{ color: visual.accent }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-2 rounded-md opacity-[0.12]"
                    style={{ backgroundColor: visual.accent }}
                  />
                  <ServiceIcon className="relative z-10 size-7" name={visual.iconName} />
                </span>
                <span className="mt-5 text-xs font-bold uppercase leading-4 text-[var(--brand-orange-dark)]">
                  {service.category}
                </span>
                <h3 className="mt-2 text-xl font-extrabold leading-tight text-[var(--brand-navy)]">
                  {service.title}
                </h3>
                <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-[var(--muted)]">
                  {service.description}
                </p>
                <span className="mt-auto flex items-center gap-2 pt-5 text-sm font-bold text-[var(--brand-navy)]">
                  Usta Bul
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 text-[var(--brand-orange)] transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
