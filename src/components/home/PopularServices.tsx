"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [scrollState, setScrollState] = useState({
    canScrollNext: false,
    canScrollPrevious: false,
  });

  const updateScrollState = useCallback(() => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      setScrollState({ canScrollNext: false, canScrollPrevious: false });
      return;
    }

    const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const nextState = {
      canScrollNext: scroller.scrollLeft < maxScrollLeft - 2,
      canScrollPrevious: scroller.scrollLeft > 2,
    };

    setScrollState((currentState) =>
      currentState.canScrollNext === nextState.canScrollNext &&
      currentState.canScrollPrevious === nextState.canScrollPrevious
        ? currentState
        : nextState,
    );
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    let frameId: number | null = null;
    const scheduleUpdate = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(updateScrollState);
    };
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleUpdate);

    updateScrollState();
    scroller.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    resizeObserver?.observe(scroller);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      scroller.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      resizeObserver?.disconnect();
    };
  }, [services.length, updateScrollState]);

  function scrollByCard(direction: "left" | "right") {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const firstCard = scroller.querySelector<HTMLElement>("[data-category-card]");
    const computedStyle = window.getComputedStyle(scroller);
    const gap = Number.parseFloat(computedStyle.columnGap || computedStyle.gap || "0") || 0;
    const cardWidth = firstCard ? firstCard.offsetWidth + gap : 156;
    const cardsPerStep = window.matchMedia("(max-width: 640px)").matches ? 1.6 : 3.6;

    scroller.scrollBy({
      behavior: reduceMotion ? "auto" : "smooth",
      left: cardWidth * cardsPerStep * (direction === "left" ? -1 : 1),
    });
  }

  return (
    <section className="bg-[#FFFDF9] pb-12 pt-8 sm:pb-14 sm:pt-9" id="services">
      <Container className="max-w-[1440px]">
        <div className="flex items-center">
          <h2 className="text-base font-extrabold leading-6 text-[var(--brand-navy)]">
            Popüler Hizmet Kategorileri
          </h2>
        </div>

        <div className="relative mt-4 md:px-14">
          <div className="pointer-events-none absolute inset-x-0 top-[calc(50%-0.5rem)] z-10 hidden -translate-y-1/2 items-center justify-between md:flex">
            <button
              aria-label="Önceki kategoriler"
              className="pointer-events-auto inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-[9999px] border border-[rgba(10,37,64,0.10)] bg-white text-[var(--brand-navy)] shadow-[0_16px_42px_rgba(10,37,64,0.14)] transition-all hover:-translate-y-0.5 hover:border-[var(--brand-orange)] hover:bg-[var(--brand-orange)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-[rgba(10,37,64,0.10)] disabled:hover:bg-white disabled:hover:text-[var(--brand-navy)]"
              disabled={!scrollState.canScrollPrevious}
              onClick={() => scrollByCard("left")}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              aria-label="Sonraki kategoriler"
              className="pointer-events-auto inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-[9999px] border border-[rgba(10,37,64,0.10)] bg-white text-[var(--brand-navy)] shadow-[0_16px_42px_rgba(10,37,64,0.14)] transition-all hover:-translate-y-0.5 hover:border-[var(--brand-orange)] hover:bg-[var(--brand-orange)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-[rgba(10,37,64,0.10)] disabled:hover:bg-white disabled:hover:text-[var(--brand-navy)]"
              disabled={!scrollState.canScrollNext}
              onClick={() => scrollByCard("right")}
              type="button"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>

          <div
            className="no-scrollbar flex w-full snap-x snap-mandatory flex-nowrap gap-3 overflow-x-auto overscroll-x-contain pb-4 scroll-smooth sm:gap-4"
            ref={scrollerRef}
          >
            {services.map((service, index) => {
              return (
                <motion.div
                  className="w-[9.25rem] flex-[0_0_auto] snap-start min-[390px]:w-[9.75rem] lg:w-[9.625rem]"
                  data-category-card
                  initial={false}
                  key={service.id}
                  transition={{ delay: reduceMotion ? 0 : index * 0.035, duration: reduceMotion ? 0 : 0.34, ease: "easeOut" }}
                  viewport={{ amount: 0.35, once: true }}
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
        </div>
      </Container>
    </section>
  );
}
