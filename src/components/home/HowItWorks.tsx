import { CheckCircle2, ListChecks, SearchCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { homeCopy } from "@/lib/constants/home";

const icons = [ListChecks, SearchCheck, CheckCircle2] as const;

export function HowItWorks() {
  return (
    <section
      className="border-b border-[var(--border)] bg-[var(--background)] py-14 sm:py-16 lg:py-20"
      id="how-it-works"
    >
      <Container className="max-w-[1180px]">
        <SectionIntro
          align="center"
          description={homeCopy.howItWorks.description}
          eyebrow={homeCopy.howItWorks.eyebrow}
          title={homeCopy.howItWorks.title}
        />

        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {homeCopy.howItWorks.steps.map((step, index) => {
            const Icon = icons[index] ?? ListChecks;

            return (
              <article
                className="relative min-h-[14rem] rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-subtle)]"
                key={step.title}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-sm font-extrabold text-[var(--brand-orange-dark)]">
                    0{index + 1}
                  </span>
                  <span className="inline-flex size-11 items-center justify-center rounded-lg bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] ring-1 ring-[rgba(249,115,22,0.18)]">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                </div>
                <h3 className="mt-7 text-2xl font-extrabold leading-tight text-[var(--brand-navy)]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted)]">
                  {step.description}
                </p>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
