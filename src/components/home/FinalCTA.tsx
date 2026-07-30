import { ArrowRight, Search, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { homeCopy } from "@/lib/constants/home";
import { appRoutes } from "@/lib/constants/navigation";

type FinalCTAProps = {
  categoryCount: string;
  districtCount: string;
};

export function FinalCTA({ categoryCount, districtCount }: FinalCTAProps) {
  return (
    <section className="bg-white py-14 sm:py-16 lg:py-20">
      <Container className="max-w-[1180px]">
        <div className="relative overflow-hidden rounded-lg border border-[rgba(249,115,22,0.2)] bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_52%,#eaf0f7_100%)] px-5 py-9 shadow-[var(--shadow-card)] sm:px-8 lg:px-10 lg:py-11">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--brand-orange),#fbbf24,var(--brand-navy))]"
          />
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase text-[var(--brand-orange-dark)]">
                {homeCopy.finalCta.eyebrow}
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight text-[var(--brand-navy)] sm:text-4xl">
                {homeCopy.finalCta.title}
              </h2>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-[var(--muted)]">
                {homeCopy.finalCta.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-[var(--brand-navy)]">
                <span className="rounded-md bg-white px-3 py-2 shadow-[var(--shadow-subtle)] ring-1 ring-[var(--border)]">
                  {categoryCount} kategori
                </span>
                <span className="rounded-md bg-white px-3 py-2 shadow-[var(--shadow-subtle)] ring-1 ring-[var(--border)]">
                  {districtCount} ilçe
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button className="h-12 min-h-12 gap-2 rounded-full px-6" href={appRoutes.providers}>
                <Search aria-hidden="true" className="size-4" />
                {homeCopy.finalCta.primaryCta}
              </Button>
              <Button
                className="h-12 min-h-12 gap-2 rounded-full border border-[rgba(20,33,61,0.12)] bg-white px-6 shadow-[var(--shadow-subtle)] ring-0 hover:bg-[var(--brand-orange-soft)]"
                href={appRoutes.providerApplication}
                variant="secondary"
              >
                <UserRoundPlus aria-hidden="true" className="size-4" />
                {homeCopy.finalCta.secondaryCta}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
