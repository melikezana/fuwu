import { Button } from "@/components/common/Button";
import { Container } from "@/components/common/Container";
import { appRoutes, ctaLabels } from "@/constants/navigation";

export default function NotFound() {
  return (
    <section className="border-b border-[var(--border)] bg-[linear-gradient(180deg,#fff8ef_0%,var(--background)_52%,#ffffff_100%)]">
      <Container className="py-16 sm:py-20">
        <div className="mx-auto max-w-2xl rounded-lg border border-[var(--border)] bg-white p-6 text-center shadow-[0_24px_70px_rgba(13,20,36,0.08)] sm:p-8">
          <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
            Sayfa bulunamadı
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-[var(--brand-navy)]">
            Aradığınız sayfa Fuwu’da yok.
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--muted)]">
            Sana uygun ustaları listeleyebilir, ihtiyacını belirleyebilir veya usta ağına
            başvurabilirsin.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button className="w-full sm:w-fit" href={appRoutes.providers}>
              {ctaLabels.findProvider}
            </Button>
            <Button className="w-full sm:w-fit" href={appRoutes.home} variant="secondary">
              Ana Sayfaya Dön
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
