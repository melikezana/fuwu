import { ArrowRight, ClipboardCheck, SearchCheck, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { homeCopy } from "@/lib/constants/home";
import { appRoutes } from "@/lib/constants/navigation";

const icons = [SearchCheck, UserRoundCheck] as const;

export function ExperienceSection() {
  return (
    <section className="border-b border-[var(--border)] bg-white py-14 sm:py-16 lg:py-20" id="experience">
      <Container className="max-w-[1180px]">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <SectionIntro
            description={homeCopy.experience.description}
            eyebrow={homeCopy.experience.eyebrow}
            title={homeCopy.experience.title}
          />

          <div className="grid gap-4 md:grid-cols-2">
            {homeCopy.experience.cards.map((card, index) => {
              const Icon = icons[index] ?? ClipboardCheck;
              const href = index === 0 ? appRoutes.providers : appRoutes.providerApplication;

              return (
                <article
                  className="flex min-h-[21rem] flex-col rounded-lg border border-[var(--border)] bg-[var(--background)] p-5 shadow-[var(--shadow-subtle)]"
                  key={card.title}
                >
                  <span className="inline-flex size-12 items-center justify-center rounded-lg bg-white text-[var(--brand-orange-dark)] shadow-[var(--shadow-subtle)] ring-1 ring-[rgba(249,115,22,0.18)]">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-5 text-2xl font-extrabold leading-tight text-[var(--brand-navy)]">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted)]">
                    {card.description}
                  </p>
                  <div className="mt-5 grid gap-2">
                    {card.actions.map((action) => (
                      <span
                        className="inline-flex min-h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-bold text-[var(--brand-navy)] ring-1 ring-[var(--border)]"
                        key={action}
                      >
                        <ClipboardCheck
                          aria-hidden="true"
                          className="size-4 shrink-0 text-[var(--trust-green)]"
                        />
                        {action}
                      </span>
                    ))}
                  </div>
                  <Button className="mt-auto gap-2" href={href} variant={index === 0 ? "primary" : "secondary"}>
                    {index === 0 ? "Usta Bul" : "Hizmet Ver"}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Button>
                </article>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
