"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CategoryCard } from "@/components/home/CategoryCard";
import { Container } from "@/components/ui/Container";
import type { Service } from "@/lib/constants/services";

type PopularServicesProps = {
  serviceCounts: Record<string, number>;
  services: readonly Service[];
};

export function PopularServices({ serviceCounts, services }: PopularServicesProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = Boolean(useReducedMotion());

  function scrollByCard(direction: "left" | "right") {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    scroller.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -220 : 220,
    });
  }

  return (
    <section className="bg-[#FFFDF9] pb-12 pt-8 sm:pb-14 sm:pt-9" id="services">
      <Container className="max-w-[1440px]">
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
          className="mt-4 grid snap-x snap-mandatory grid-flow-col auto-cols-[9.75rem] gap-3 overflow-x-auto overscroll-x-contain pb-4 [scrollbar-width:thin] min-[390px]:auto-cols-[10.25rem] sm:auto-cols-[11rem] xl:grid-flow-row xl:grid-cols-9 xl:overflow-visible xl:pb-1"
          ref={scrollerRef}
        >
          {services.map((service, index) => {
            return (
              <motion.div
                className="min-w-0 snap-start"
                initial={false}
                key={service.id}
                transition={{ delay: reduceMotion ? 0 : index * 0.035, duration: reduceMotion ? 0 : 0.34, ease: "easeOut" }}
                viewport={{ amount: 0.35, once: true }}
                whileHover={reduceMotion ? undefined : { scale: 1.018, y: -4 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
              >
                <CategoryCard
                  providerCount={serviceCounts[service.id]}
                  service={service}
                />
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
