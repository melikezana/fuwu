import Link from "next/link";
import { ArrowRight, MapPinned } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { homeCopy } from "@/lib/constants/home";
import { appRoutes } from "@/lib/constants/navigation";

type RegionalCoverageProps = {
  districts: string[];
};

export function RegionalCoverage({ districts }: RegionalCoverageProps) {
  const visibleDistricts = districts.slice(0, 14);

  return (
    <section
      className="border-b border-[var(--border)] bg-[var(--background)] py-14 sm:py-16 lg:py-20"
      id="coverage"
    >
      <Container className="max-w-[1180px]">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <SectionIntro
              description={homeCopy.coverage.description}
              eyebrow={homeCopy.coverage.eyebrow}
              title={homeCopy.coverage.title}
            />
            <Link
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 text-sm font-bold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={appRoutes.providers}
            >
              Tüm bölgeleri listele
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-subtle)] sm:p-5">
            <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
              <span className="inline-flex size-11 items-center justify-center rounded-lg bg-[var(--brand-navy-soft)] text-[var(--brand-navy)]">
                <MapPinned aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-[var(--brand-navy)]">İlçeye göre keşfet</h3>
                <p className="mt-1 text-sm font-medium text-[var(--muted)]">
                  Sonuçları bulunduğun bölgeye yaklaştır.
                </p>
              </div>
            </div>

            {visibleDistricts.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {visibleDistricts.map((district) => (
                  <Link
                    className="inline-flex min-h-10 items-center rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-bold text-[var(--brand-navy)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(249,115,22,0.36)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                    href={`${appRoutes.providers}?district=${encodeURIComponent(district)}`}
                    key={district}
                  >
                    {district}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-md bg-[var(--background)] px-4 py-5 text-sm font-semibold text-[var(--muted)]">
                Bölge seçenekleri yüklenemedi. Usta listesinde arama yaparak devam edebilirsin.
              </p>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
