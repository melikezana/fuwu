import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { appRoutes, ctaLabels } from "@/lib/constants/navigation";

type LaunchSignal = {
  id: string;
  label: string;
  title: string;
  description: string;
};

const launchSignals: LaunchSignal[] = [
  {
    id: "clear-scope",
    label: "Talep öncesi",
    title: "Net kapsam",
    description:
      "Hizmet, adres, zamanlama ve usta dönüşünü kolaylaştıran notlar tek yerde toplanır.",
  },
  {
    id: "provider-fit",
    label: "Eşleşme öncesi",
    title: "Usta uyumu",
    description:
      "Usta profilleri bölge, deneyim, ekipman ve çalışma standardı bilgileriyle değerlendirilir.",
  },
  {
    id: "safe-next-step",
    label: "Randevu öncesi",
    title: "Güvenli sonraki adım",
    description:
      "Müşteriler hesap, ödeme veya otomatik randevu olmadan talep oluşturabilir.",
  },
  {
    id: "launch-priority",
    label: "Talep özeti",
    title: "Net ihtiyaç sinyali",
    description:
      "Hizmet talebi, özel kapsam veya bölge ihtiyacını Fuwu’nun daha net anlamasına yardım eder.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="border-y border-[var(--border)] bg-white" id="launch-checks">
      <Container className="py-14 sm:py-16 lg:py-20">
        <div className="flex min-w-0 flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionIntro
            eyebrow="Pazaryeri kontrolleri"
            title="Güven veren karar anları."
            description="Fuwu; net talep, değerlendirilen usta ve açık iletişim bilgisiyle karar sürecini güçlendirir."
          />
          <Button className="w-full sm:w-fit" href={appRoutes.request} variant="secondary">
            {ctaLabels.request}
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-5">
          {launchSignals.map((signal, index) => (
            <Card
              className="relative flex h-full min-w-0 flex-col overflow-hidden !p-0"
              key={signal.id}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--brand-orange),rgba(255,138,0,0.14))]" />
              <div className="flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-md bg-[var(--brand-orange-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-orange-dark)]">
                    {signal.label}
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-sm font-bold text-[var(--muted)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-bold leading-tight text-[var(--brand-navy)]">
                  {signal.title}
                </h3>
                <p className="mt-3 flex-1 leading-7 text-[var(--muted)]">
                  {signal.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
