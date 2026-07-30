"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CategoryCard } from "@/components/home/CategoryCard";
import { Container } from "@/components/ui/Container";
import { homeServiceVisuals } from "@/lib/constants/home";
import type { Service } from "@/lib/constants/services";

type PopularServicesProps = {
  serviceCounts: Record<string, number>;
  services: readonly Service[];
};

export function PopularServices({ serviceCounts, services }: PopularServicesProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: "left" | "right") {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    scroller.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -280 : 280,
    });
  }

  return (
    <section className="bg-white py-8 sm:py-10" id="services">
      <Container className="max-w-[1390px]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-extrabold leading-6 text-[var(--brand-navy)]">
            Popüler Hizmet Kategorileri
          </h2>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <button
              aria-label="Kategori kartlarını sola kaydır"
              className="inline-flex size-10 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              onClick={() => scrollByCard("left")}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              aria-label="Kategori kartlarını sağa kaydır"
              className="inline-flex size-10 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              onClick={() => scrollByCard("right")}
              type="button"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>

        <div
          className="mt-4 flex snap-x gap-3 overflow-x-auto pb-3 [scrollbar-width:thin] sm:gap-4"
          ref={scrollerRef}
        >
          {services.map((service) => {
            const visual = homeServiceVisuals[service.id] ?? {
              accent: "#FF6500",
              iconName: service.iconName,
            };

            return (
              <div className="snap-start" key={service.id}>
                <CategoryCard
                  providerCount={serviceCounts[service.id]}
                  service={service}
                  visual={visual}
                />
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
