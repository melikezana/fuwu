"use client";

import { useState } from "react";
import { MobileCollapsibleSection } from "@/components/home/MobileCollapsibleSection";
import { Container } from "@/components/ui/Container";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type FAQItem = {
  answerKey: TranslationKey;
  id: string;
  questionKey: TranslationKey;
};

const faqItems: FAQItem[] = [
  {
    answerKey: "home.faq.canRequest.answer",
    id: "can-request-now",
    questionKey: "home.faq.canRequest.question",
  },
  {
    answerKey: "home.faq.providerChecks.answer",
    id: "provider-checks",
    questionKey: "home.faq.providerChecks.question",
  },
  {
    answerKey: "home.faq.payNow.answer",
    id: "pay-now",
    questionKey: "home.faq.payNow.question",
  },
];

function PlusIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center text-xl font-bold leading-none transition-colors duration-200",
        isOpen && "text-[var(--brand-navy)]",
      )}
    >
      {isOpen ? "-" : "+"}
    </span>
  );
}

export function FAQSection() {
  const { t } = useI18n();
  const [openItemId, setOpenItemId] = useState(faqItems[0].id);

  return (
    <section className="border-y border-[var(--border)] bg-[var(--background)]" id="faq">
      <Container className="py-8 sm:py-10 lg:py-12">
        <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr] lg:items-start lg:gap-8">
          <div className="min-w-0">
            <SectionIntro
              eyebrow={t("home.faq.eyebrow")}
              title={t("home.faq.title")}
              description={t("home.faq.description")}
            />
            <div className="mt-5 hidden max-w-sm cursor-default select-none rounded-lg border border-[rgba(255,138,0,0.22)] bg-[var(--brand-orange-soft)] p-4 text-sm font-semibold leading-6 text-[var(--brand-navy)] lg:block">
              {t("home.faq.note")}
            </div>
          </div>

          <MobileCollapsibleSection contentClassName="mt-5 md:mt-0">
            <div className="min-w-0 overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-[var(--shadow-elevated)]">
              {faqItems.map((item, index) => {
                const isOpen = openItemId === item.id;
                const contentId = `${item.id}-answer`;

                return (
                  <div
                    className={cn(index > 0 && "border-t border-[var(--border)]")}
                    key={item.id}
                  >
                    <button
                      aria-controls={contentId}
                      aria-expanded={isOpen}
                      className="group flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors duration-200 hover:bg-[var(--brand-orange-soft)] focus:outline-none focus-visible:bg-[var(--brand-orange-soft)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-orange)] sm:px-5"
                      onClick={() => setOpenItemId(isOpen ? "" : item.id)}
                      type="button"
                    >
                      <span className="min-w-0 text-base font-semibold leading-6 text-[var(--brand-navy)]">
                        {t(item.questionKey)}
                      </span>
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200",
                          isOpen
                            ? "border-[var(--brand-orange)] bg-[var(--brand-orange)] text-[var(--brand-navy)]"
                            : "border-[var(--border)] bg-white text-[var(--brand-navy)] group-hover:border-[var(--brand-orange)]",
                        )}
                      >
                        <PlusIcon isOpen={isOpen} />
                      </span>
                    </button>

                    <div
                      className={cn(
                        "grid transition-[grid-template-rows] duration-300 ease-out",
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                      id={contentId}
                    >
                      <div className="overflow-hidden">
                        <p className="cursor-default select-none px-4 pb-4 text-sm font-medium leading-6 text-[var(--muted)] sm:px-5">
                          {t(item.answerKey)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </MobileCollapsibleSection>
        </div>
      </Container>
    </section>
  );
}
