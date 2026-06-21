import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { appRoutes, ctaLabels } from "@/lib/constants/navigation";

export function ComingSoonCTA() {
  return (
    <section className="bg-[var(--background)]" id="start">
      <Container className="py-14 sm:py-16">
        <div className="rounded-lg border border-[rgba(255,138,0,0.28)] bg-white px-6 py-8 shadow-[var(--shadow-elevated)] sm:px-8 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
              Hazır olduğunuzda
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight tracking-normal text-[var(--brand-navy)] sm:text-4xl">
              Hizmet talep edin veya doğrudan usta bulun.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">
              Tek net taleple başlayın ya da dizindeki profilleri filtreleyip telefon ve WhatsApp
              ile hızlıca iletişime geçin.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-3 lg:mt-0 lg:items-end">
            <Button href={appRoutes.request} className="w-full sm:w-fit">
              {ctaLabels.request}
            </Button>
            <Button
              className="w-full sm:w-fit"
              href={appRoutes.providerApplication}
              variant="secondary"
            >
              {ctaLabels.provider}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
