import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Container } from "@/components/common/Container";
import { SectionIntro } from "@/components/common/SectionIntro";
import { appRoutes, ctaLabels } from "@/constants/navigation";

type WorkStep = {
  id: string;
  title: string;
  description: string;
  stage: string;
};

const workSteps: WorkStep[] = [
  {
    id: "choose-service",
    title: "İhtiyacını belirle",
    description: "Hizmeti seç, ilçeni gir, aramanı netleştir.",
    stage: "Belirle",
  },
  {
    id: "submit-request",
    title: "Ustaları karşılaştır",
    description: "Puanı, fiyatı ve deneyimi aynı ekranda gör.",
    stage: "Karşılaştır",
  },
  {
    id: "get-matched",
    title: "Direkt iletişime geç",
    description: "Telefon ya da WhatsApp ile hemen konuş.",
    stage: "İletişim",
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-[var(--background)]" id="how-it-works">
      <Container className="py-14 sm:py-16 lg:py-20">
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionIntro
            eyebrow="Nasıl işler?"
            title="Fuwu ile süreç"
            description="İhtiyacını belirle, ustaları karşılaştır, doğrudan iletişime geç."
          />
          <Button className="w-full sm:w-fit" href={appRoutes.request}>
            {ctaLabels.request}
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3 lg:gap-5">
          {workSteps.map((step, index) => (
            <Card
              className="relative h-full overflow-hidden"
              key={step.id}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="rounded-md bg-[var(--brand-orange)] px-3 py-2 text-xs font-black uppercase text-[var(--brand-navy)] shadow-[0_14px_32px_rgba(255,138,0,0.2)]">
                  {step.stage}
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-sm font-bold text-[var(--muted)]">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-6 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
                {step.title}
              </h3>
              <p className="mt-3 leading-7 text-[var(--muted)]">{step.description}</p>
            </Card>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-[var(--border)] bg-white p-5 shadow-[0_18px_60px_rgba(13,20,36,0.07)] sm:p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            {workSteps.map((step, index) => (
              <div className="contents" key={step.id}>
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-sm font-bold text-[var(--brand-orange-dark)]">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--brand-navy)]">{step.title}</p>
                    <p className="mt-1 text-sm font-bold text-[var(--muted)]">
                      {index === 0
                        ? "İlçeni ve hizmeti seç"
                        : index === 1
                          ? "Puan ve fiyatı gör"
                          : "Beklemeden konuş"}
                    </p>
                  </div>
                </div>
                {index < workSteps.length - 1 ? (
                  <div className="hidden h-px w-10 bg-[var(--border)] md:block" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
