import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { CategoryCard } from "@/components/home/CategoryCard";
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

        <form
          action={appRoutes.providers}
          className="premium-card mt-8 grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-4"
        >
          <label className="premium-control grid min-h-12 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2 px-3">
            <Search className="size-5 text-[var(--brand-orange-dark)]" aria-hidden="true" />
            <span className="sr-only">Hizmet ara</span>
            <input
              className="min-w-0 bg-transparent text-sm font-semibold text-[var(--brand-navy)] outline-none placeholder:text-[var(--muted)]"
              name="q"
              placeholder="Hizmet, usta veya kategori ara"
              type="search"
            />
          </label>
          <button
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] bg-[var(--brand-navy)] px-5 text-sm font-bold text-white shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-navy-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            type="submit"
          >
            Ustaları Gör
          </button>
        </form>

        <div className="mt-8 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => {
            const visual = homeServiceVisuals[service.id] ?? {
              accent: "#F97316",
              iconName: service.iconName,
            };

            return (
              <CategoryCard key={service.id} service={service} visual={visual} />
            );
          })}
        </div>
      </Container>
    </section>
  );
}
